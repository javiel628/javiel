'use strict';

const { downloadMediaMessage } = require('./baileys');
const log = require('./logger');
const { numOf, pnOf } = require('./access');

const caches = new Map();

const MAX_ENTRIES = 1500;
const MAX_MEDIA_BYTES = 60 * 1024 * 1024;
const MAX_ONE_MEDIA = 15 * 1024 * 1024;
const TTL = 3 * 60 * 60 * 1000;

const MEDIA_KINDS = {
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio',
    stickerMessage: 'sticker',
    documentMessage: 'document'
};

const SKIP_KINDS = new Set([
    'protocolMessage',
    'reactionMessage',
    'senderKeyDistributionMessage',
    'messageContextInfo',
    'pollUpdateMessage'
]);

function unwrapContent(message) {
    let content = message;
    let depth = 0;

    while (content && depth++ < 6) {
        if (content.ephemeralMessage?.message) { content = content.ephemeralMessage.message; continue; }
        if (content.viewOnceMessage?.message) { content = content.viewOnceMessage.message; continue; }
        if (content.viewOnceMessageV2?.message) { content = content.viewOnceMessageV2.message; continue; }
        if (content.viewOnceMessageV2Extension?.message) { content = content.viewOnceMessageV2Extension.message; continue; }
        if (content.documentWithCaptionMessage?.message) { content = content.documentWithCaptionMessage.message; continue; }
        break;
    }

    return content || {};
}

function cacheOf(id) {
    if (!caches.has(id)) {
        caches.set(id, { map: new Map(), bytes: 0 });
    }
    return caches.get(id);
}

function drop(cache, key) {
    const entry = cache.map.get(key);
    if (entry?.media?.buffer) {
        cache.bytes -= entry.media.buffer.length;
    }
    cache.map.delete(key);
}

function evict(cache) {
    const now = Date.now();
    for (const [key, entry] of cache.map) {
        const expired = now - entry.at >= TTL;
        if (cache.map.size <= MAX_ENTRIES && cache.bytes <= MAX_MEDIA_BYTES && !expired) break;
        drop(cache, key);
    }
}

function kindOf(message) {
    const content = unwrapContent(message);
    return Object.keys(content).find(key => !SKIP_KINDS.has(key));
}

function textOf(message) {
    const content = unwrapContent(message);
    return (
        content.conversation ||
        content.extendedTextMessage?.text ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        content.documentMessage?.caption ||
        content.documentWithCaptionMessage?.message?.documentMessage?.caption ||
        ''
    );
}

function normalizeJid(jid) {
    if (!jid) return jid;
    return String(jid)
        .replace(/@c\.us$/i, '@s.whatsapp.net')
        .replace(/@s\.whatsapp\.net@s\.whatsapp\.net$/i, '@s.whatsapp.net');
}

async function rememberMessage(sock, sessionId, raw, settings) {
    try {
        const config = settings.get('antidelete', {});
        if (!config.enabled) return;

        const jid = raw.key?.remoteJid;
        const id = raw.key?.id;

        if (!jid || !id || !raw.message) return;
        if (jid === 'status@broadcast' || jid.endsWith('@newsletter')) return;

        const content = unwrapContent(raw.message);
        const kind = kindOf(raw.message);
        if (!kind) return;

        const cache = cacheOf(sessionId);
        const key = `${normalizeJid(jid)}:${id}`;
        if (cache.map.has(key)) return;

        const entry = { raw, content, kind, at: Date.now() };
        const node = content[kind];

        if (MEDIA_KINDS[kind] && Number(node?.fileLength || 0) <= MAX_ONE_MEDIA) {
            try {
                const buffer = await downloadMediaMessage(raw, 'buffer', {});
                if (Buffer.isBuffer(buffer) && buffer.length <= MAX_ONE_MEDIA) {
                    entry.media = {
                        type: MEDIA_KINDS[kind],
                        buffer,
                        mimetype: node?.mimetype,
                        fileName: node?.fileName,
                        caption: node?.caption || '',
                        ptt: !!node?.ptt,
                        gif: !!node?.gifPlayback
                    };
                    cache.bytes += buffer.length;
                }
            } catch (err) {
                log.warn('antidelete', `Media backup failed: ${err.message}`);
            }
        }

        cache.map.set(key, entry);
        log.info('antidelete', `cached ${kind} · ${key}`);
        evict(cache);
    } catch (err) {
        log.warn('antidelete', `Remember error: ${err.message}`);
    }
}

function ownerJid(sock, settings) {
    const owners = settings.get('owners', []) || [];

    const owner = owners
        .map(String)
        .map(j => (j.includes('@') ? j : `${j}@s.whatsapp.net`))
        .find(Boolean);

    if (owner) return owner;

    const ownNumber = numOf(sock.user?.id);
    return ownNumber ? `${ownNumber}@s.whatsapp.net` : null;
}

function resolveSenderJid(sock, rawKey, inGroup) {
    const botId = sock.user?.id || '';

    if (rawKey?.fromMe) {
        return {
            author: botId,
            authorPn: rawKey.participantAlt || botId
        };
    }

    if (inGroup) {
        const author = rawKey?.participant || '';
        const authorPn = rawKey?.participantAlt || author;
        return { author, authorPn };
    }

    const author = rawKey?.remoteJid || '';
    const authorPn = rawKey?.remoteJidAlt || author;
    return { author, authorPn };
}

async function handleRevoke(sock, sessionId, raw, settings) {
    try {
        const pm = raw.message?.protocolMessage;
        if (!pm) return false;
        if (!(pm.type === 0 || pm.type === 'REVOKE')) return false;

        const config = settings.get('antidelete', {});
        if (!config.enabled) return true;
        if (!pm.key?.id) return true;

        const chat = pm.key.remoteJid || raw.key.remoteJid;
        if (!chat) return true;
        if (chat === 'status@broadcast' || chat.endsWith('@newsletter')) return true;

        const inGroup = chat.endsWith('@g.us');

        const originalFromMe = pm.key?.fromMe === true;
        if (originalFromMe && config.mode === 'chat' && inGroup) return true;

        const cache = cacheOf(sessionId);
        const key = `${normalizeJid(chat)}:${pm.key.id}`;
        const entry = cache.map.get(key);

        if (!entry) {
            log.warn('antidelete', `revoke: not in cache (${pm.key.id})`);
            return true;
        }

        drop(cache, key);

        const target = config.mode === 'dm' ? ownerJid(sock, settings) : chat;
        if (!target) {
            log.warn('antidelete', 'revoke: no target');
            return true;
        }

        const { author, authorPn: rawPn } = resolveSenderJid(sock, entry.raw.key, inGroup);
        let authorPn = rawPn;

        try {
            if (authorPn && authorPn.endsWith('@lid')) {
                const resolved = await pnOf(sock, authorPn);
                if (resolved) authorPn = resolved;
            }
        } catch {}

        let where;
        if (inGroup) {
            where = 'Group';
            try {
                const metadata = await sock.groupMetadata(chat);
                where = metadata.subject || 'Group';
            } catch {}
        } else {
            where = `Private chat · ${numOf(chat)}`;
        }

        const validMention = typeof authorPn === 'string' && authorPn.endsWith('@s.whatsapp.net');
        const mentions = validMention ? [authorPn] : [];
        const senderLabel = validMention ? '@' + numOf(authorPn) : (numOf(author) || 'Unknown');

        const header =
            `╭━━━〔 🗑️ *ANTI-DELETE* 〕━━━╮\n` +
            `┃\n` +
            `┃  👤 Sender : ${senderLabel}\n` +
            `┃  💬 Chat   : ${where}\n` +
            `┃  🕒 Time   : ${new Date(entry.at).toLocaleTimeString()}\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
            `么 *SMILE PRIME MD* 么`;

        const text = textOf(entry.content);
        const media = entry.media;

        if (!media) {
            try {
                const sent = await sock.sendMessage(target, {
                    text: `${header}\n\n💬 *Message:*\n${text || `[${entry.kind.replace('Message', '')}]`}`,
                    mentions
                });
                log.info('antidelete', `text restored → ${target} (${sent?.key?.id})`);
            } catch (err) {
                log.error('antidelete', `text send failed: ${err.message}`);
            }
            return true;
        }

        const captionWithHeader = `${header}${text ? '\n\n💬 *Caption:*\n' + text : ''}`;

        try {
            if (media.type === 'image') {
                await sock.sendMessage(target, { image: media.buffer, caption: captionWithHeader, mentions });
            } else if (media.type === 'video') {
                await sock.sendMessage(target, { video: media.buffer, caption: captionWithHeader, gifPlayback: media.gif, mentions });
            } else if (media.type === 'document') {
                await sock.sendMessage(target, {
                    document: media.buffer,
                    mimetype: media.mimetype || 'application/octet-stream',
                    fileName: media.fileName || 'deleted-file',
                    caption: captionWithHeader,
                    mentions
                });
            } else if (media.type === 'audio') {
                await sock.sendMessage(target, { audio: media.buffer, mimetype: media.mimetype || 'audio/mp4', ptt: media.ptt });
                await sock.sendMessage(target, { text: header, mentions });
            } else if (media.type === 'sticker') {
                await sock.sendMessage(target, { sticker: media.buffer });
                await sock.sendMessage(target, { text: header, mentions });
            }
            log.info('antidelete', `media (${media.type}) restored → ${target}`);
        } catch (err) {
            log.error('antidelete', `media send failed: ${err.message}`);
        }

        return true;
    } catch (err) {
        log.warn('antidelete', `Revoke handler error: ${err.message}`);
        return true;
    }
}

module.exports = { rememberMessage, handleRevoke };
