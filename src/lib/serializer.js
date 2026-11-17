/*
╔══════════════════════════╗
║             𓆩 BASE TELE X WA 𓆪   
║                                      
║             ⚡ DEVELOPER CREDITS ⚡      
║                                   
║          ᴅᴇᴠᴇʟᴏᴘᴇʀ : ᴊᴀᴍᴇsᴍᴏᴅᴢ  
║          ᴛᴇᴀᴍ      : james Inc 

║  ⚠️  C R E D I T   N O T I C E  ⚠️ 

║  Do NOT remove or modify these credits
║  without permission from the original dev
║  Respect the work. Give credit where it's
║  due. Don't steal another developer's work.
║  TELEGRAM : t.me/shenxidev 
║  © 2026 JAMESMODZ — ALL RIGHTS RESERVED 
╚════════════════════════╝
*/
const { getContentType } = require('./baileys');
const { applyFont } = require('./fonts');

function paymentContext(jid) {
    return {
        contextInfo: {
            quotedMessage: {
                paymentInviteMessage: {
                    serviceType: 1,
                    expiryTimestamp: Date.now() + 1000 * 60 * 60 * 24,
                },
            },
            participant: jid,
            stanzaId: 'FAKE-' + Date.now(),
            remoteJid: jid,
        },
    };
}

/**
 * sessionSettings: this session's own settings store (see lib/settings.js).
 * Passed in explicitly rather than imported as a singleton, since every
 * session now has its own isolated settings.
 */
function unwrapMessage(message) {
    let current = message;
    const wrappers = new Set([
        'ephemeralMessage',
        'viewOnceMessage',
        'viewOnceMessageV2',
        'viewOnceMessageV2Extension',
        'documentWithCaptionMessage',
    ]);
    for (let i = 0; i < 8 && current; i++) {
        const key = Object.keys(current).find((name) => wrappers.has(name) && current[name]?.message);
        if (!key) break;
        current = current[key].message;
    }
    return current || message;
}

function serializeMessage(sock, msg, sessionSettings) {
    if (!msg.message) return null;

    const content = unwrapMessage(msg.message);
    const type = getContentType(content);
    const from = msg.key.remoteJid;
    const isGroup = from?.endsWith('@g.us');
    const sender = isGroup ? msg.key.participant : from;
    const fromMe = msg.key.fromMe;
    const senderAlt = isGroup ? msg.key.participantAlt || msg.key.participantPn : msg.key.remoteJidAlt || msg.key.senderPn;

    let body = '';
    if (type === 'conversation') body = content.conversation;
    else if (type === 'extendedTextMessage') body = content.extendedTextMessage.text;
    else if (type === 'imageMessage') body = content.imageMessage.caption || '';
    else if (type === 'videoMessage') body = content.videoMessage.caption || '';
    else if (type === 'documentMessage') body = content.documentMessage.caption || '';
    else if (type === 'interactiveResponseMessage') {
        const resp = content.interactiveResponseMessage;
        try {
            body = JSON.parse(resp.nativeFlowResponseMessage?.paramsJson || '{}').id || '';
        } catch {
            body = '';
        }
    } else if (type === 'listResponseMessage') {
        body = content.listResponseMessage.singleSelectReply?.selectedRowId || '';
    } else if (type === 'buttonsResponseMessage') {
        body = content.buttonsResponseMessage.selectedButtonId || '';
    }

    // Extract quoted context metadata
    const contextInfo =
        content?.extendedTextMessage?.contextInfo ||
        content?.[type]?.contextInfo;
    const quotedMsg = contextInfo?.quotedMessage || null;
    const quotedType = quotedMsg ? getContentType(quotedMsg) : null;
    const quotedDoc = quotedMsg?.documentMessage || quotedMsg?.documentWithCaptionMessage?.message?.documentMessage;
    const fileName = quotedDoc?.fileName || '';

    const quoted = quotedMsg
        ? {
            key: {
                remoteJid: contextInfo.remoteJid || from,
                id: contextInfo.stanzaId,
                participant: contextInfo.participant,
            },
            message: quotedMsg,
            type: quotedType,
            fileName,
            msg: quotedMsg[quotedType] || {},
        }
        : null;

    return {
        raw: msg,
        sock,
        key: msg.key,
        id: msg.key.id,
        from,
        isGroup,
        sender,
        senderAlt,
        fromMe,
        type,
        body: (body || '').trim(),
        text: (body || '').trim(),
        pushName: msg.pushName || 'Unknown',
        quoted,

        react: (emoji) => {
            return sock.sendMessage(from, {
                react: { text: emoji, key: msg.key }
            });
        },

        reply: (text, opts = {}) => {
            const styled = applyFont(text, sessionSettings?.get ? sessionSettings.get('fontStyle') : 0);
            const ctx = paymentContext(from);
            return sock.sendMessage(
                from,
                { text: styled, ...opts, contextInfo: { ...ctx.contextInfo, ...(opts.contextInfo || {}) } },
                { quoted: msg }
            );
        },

        send: (content, opts = {}) => {
            const ctx = paymentContext(from);
            const merged = { ...content };
            merged.contextInfo = { ...ctx.contextInfo, ...(content.contextInfo || {}) };
            return sock.sendMessage(from, merged, { quoted: msg, ...opts });
        },
    };
}

module.exports = { serializeMessage, unwrapMessage };
