
'use strict';

/**
 * SHADOW MD button helpers.
 * Sends a copy-friendly text message.
 */

async function sendCopy(sock, jid, text, quoted) {
    return sock.sendMessage(
        jid,
        { text: String(text) },
        quoted ? { quoted } : {}
    );
}

module.exports = { sendCopy };
