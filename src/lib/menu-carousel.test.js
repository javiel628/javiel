'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sendMenuCarousel } = require('./menu-carousel');
const { proto } = require('./baileys');

const rawMessage = { key: { id: 'incoming-1' }, message: { conversation: '.menu2' } };

function options(overrides = {}) {
    const calls = { generated: null, relayed: null, image: null, upload: null };
    const sock = {
        user: { id: 'bot@s.whatsapp.net' },
        waUploadToServer() { return 'uploaded'; },
        relayMessage: async (...args) => { calls.relayed = args; },
    };
    const base = {
        m: { raw: rawMessage },
        sock,
        from: 'chat@s.whatsapp.net',
        rawMessage,
        categories: [
            { title: 'SYSTEM', desc: 'System controls', items: ['ping', 'setprefix'] },
            { title: 'GROUP', desc: 'Group tools', items: ['kick'] },
        ],
        image: { url: 'https://example.com/menu.jpg' },
        prefix: '.',
        channelUrl: 'https://whatsapp.com/channel/example',
        menuTitle: 'SHADOW COMMAND MENU',
        generateWAMessageContent: async (content, helperOptions) => {
            calls.image = content.image;
            calls.upload = helperOptions.upload;
            return { imageMessage: { mediaKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' } };
        },
        generateWAMessageFromContent: (jid, message, generationOptions) => {
            calls.generated = { jid, message, generationOptions };
            return { key: { id: 'outgoing-1' }, message };
        },
        onFallback: (error) => ({ fallback: error.message }),
        calls,
    };
    return { ...base, ...overrides };
}

test('builds and relays a carousel from the provided categories and current session', async () => {
    const input = options();
    const result = await sendMenuCarousel(input);
    const interactive = input.calls.generated.message.viewOnceMessage.message.interactiveMessage;
    const [systemCard, groupCard] = interactive.carouselMessage.cards;
    const button = JSON.parse(systemCard.nativeFlowMessage.buttons[0].buttonParamsJson);

    assert.deepEqual(result, { id: 'outgoing-1' });
    assert.doesNotThrow(() => proto.Message.fromObject(input.calls.generated.message));
    assert.equal(input.calls.generated.jid, 'chat@s.whatsapp.net');
    assert.equal(input.calls.generated.generationOptions.quoted, rawMessage);
    assert.equal(input.calls.generated.generationOptions.userJid, 'bot@s.whatsapp.net');
    assert.equal(input.calls.image, input.image);
    assert.equal(typeof input.calls.upload, 'function');
    assert.equal(interactive.body.text, 'SHADOW COMMAND MENU');
    assert.equal(systemCard.header.title, 'SYSTEM');
    assert.match(systemCard.body.text, /❐\.ping/);
    assert.match(systemCard.body.text, /❐\.setprefix/);
    assert.equal(groupCard.footer.text, 'Page 2 of 2');
    assert.equal(button.url, input.channelUrl);
    assert.deepEqual(input.calls.relayed, [
        'chat@s.whatsapp.net',
        input.calls.generated.message,
        { messageId: 'outgoing-1' },
    ]);
});

test('falls back to the existing menu when carousel delivery fails', async () => {
    const input = options({
        sock: {
            ...options().sock,
            user: { id: 'bot@s.whatsapp.net' },
            relayMessage: async () => { throw new Error('relay unavailable'); },
        },
    });
    const result = await sendMenuCarousel(input);

    assert.deepEqual(result, { fallback: 'relay unavailable' });
});
