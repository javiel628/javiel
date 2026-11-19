// lib/antidelete.js
const store = new Map(); // key: `${chat}:${id}` → raw message

function rememberMessage(m) {
    if (!m?.key?.id) return;
    const key = `${m.from}:${m.key.id}`;
    store.set(key, {
        message: m.raw.message,
        sender: m.sender,
        from: m.from,
        isGroup: m.isGroup,
        pushName: m.pushName || 'User',
        at: Date.now()
    });

    // prune old entries (> 1 hour)
    const cutoff = Date.now() - 3600_000;
    for (const [k, v] of store) if (v.at < cutoff) store.delete(k);
}

function getRemembered(chat, id) {
    return store.get(`${chat}:${id}`) || null;
}

async function handleRevoke(m, sock, settings) {
    const cfg = settings.get('antidelete', { enabled: false, mode: 'chat' });
    if (!cfg.enabled) return;

    const protocol = m.raw?.message?.protocolMessage;
    if (!protocol || protocol.type !== 0) return; // 0 = REVOKE

    const originalId = protocol.key?.id;
    if (!originalId) return;

    const original = getRemembered(m.from, originalId);
    if (!original) return;

    const ownerJid = settings.get('owners', [])[0];
    const targetJid = cfg.mode === 'dm' && ownerJid ? ownerJid : m.from;

    const header =
        `🛡️ *ANTI-DELETE*\n\n` +
        `👤 Sender: @${m.sender.split('@')[0]}\n` +
        `📱 Chat: ${original.isGroup ? 'Group' : 'DM'}\n` +
        `⏱ Deleted at: ${new Date().toLocaleString()}\n\n`;

    try {
        const inner = original.message;
        const type = Object.keys(inner || {})[0];
        if (!type) return;

        const payload = { ...inner };
        // re-send the original message with a header caption
        if (payload.conversation) {
            payload.conversation = header + `💬 ${payload.conversation}`;
        } else if (payload.extendedTextMessage) {
            payload.extendedTextMessage.text = header + `💬 ${payload.extendedTextMessage.text}`;
        } else if (payload.imageMessage) {
            payload.imageMessage.caption = header + (payload.imageMessage.caption || '');
        } else if (payload.videoMessage) {
            payload.videoMessage.caption = header + (payload.videoMessage.caption || '');
        }

        await sock.sendMessage(targetJid, payload, { quoted: m.raw });
    } catch (err) {
        // silently fail — don't spam on every revoke
    }
}

module.exports = { rememberMessage, handleRevoke, getRemembered };
