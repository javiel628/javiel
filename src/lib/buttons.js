'use strict';

/**
 * SHADOW MD copyable text helper.
 * No external interactive-button dependency required.
 */

async function sendCopy(m, options = {}) {
    const {
        title = 'Copy',
        text = '',
        value = '',
        label = 'Value'
    } = options;

    const message = [
        `*${title}*`,
        text,
        value ? `\n📋 *${label}:* ${value}` : ''
    ].filter(Boolean).join('\n');

    return m.reply(message);
}

module.exports = { sendCopy };
