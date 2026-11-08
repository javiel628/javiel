'use strict';

const { sendButtons } = require('zqbaileys_helper');

/**
 * Send native-flow quick reply buttons using the Baileys 7 helper.
 * Each button is { id, text }.
 */
async function sendMenuButtons(sock, jid, text, buttons, options = {}) {
    if (!sock || !jid) throw new Error('A WhatsApp socket and destination JID are required.');
    if (!Array.isArray(buttons) || buttons.length < 1 || buttons.length > 3) {
        throw new Error('Each interactive button message must contain between 1 and 3 buttons.');
    }

    return sendButtons(sock, jid, {
        text,
        footer: '亗 SHADOW MD • Select a category 亗',
        buttons: buttons.map(button => ({
            id: String(button.id),
            text: String(button.text).slice(0, 20)
        }))
    }, options);
}

/**
 * Existing channel-ID helper. Kept compatible with Anix.js.
 * This sends a clear copyable text value; it does not claim to be a native copy CTA.
 */
async function sendCopy(m, options = {}) {
    const { title = 'Copy', text = '', value = '', label = 'Value' } = options;
    const message = [
        `*${title}*`,
        text,
        value ? `\\n📋 *${label}:* ${value}` : ''
    ].filter(Boolean).join('\\n');

    return m.reply(message);
}

module.exports = { sendCopy, sendMenuButtons };
