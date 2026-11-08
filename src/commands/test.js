const { test } = require('node:test');
const assert = require('node:assert/strict');
const { serializeMessage } = require('../lib/serializer');
const { parseEmojiPair } = require('../lib/emoji-kitchen');

test('serializer should support m.react and m.quoted', () => {
    let sentReact = null;
    const mockSock = {
        sendMessage: async (jid, payload) => {
            if (payload.react) sentReact = payload.react;
            return { key: { id: 'test' } };
        }
    };
    const mockMsg = {
        key: { remoteJid: '12345@s.whatsapp.net', id: 'MSG1', fromMe: false },
        message: {
            extendedTextMessage: {
                text: '.enc',
                contextInfo: {
                    stanzaId: 'QUOTED1',
                    participant: '99999@s.whatsapp.net',
                    quotedMessage: {
                        documentMessage: { fileName: 'payload.js' }
                    }
                }
            }
        }
    };

    const serialized = serializeMessage(mockSock, mockMsg, null);
    assert.equal(typeof serialized.react, 'function');
    assert.ok(serialized.quoted);
    assert.equal(serialized.quoted.fileName, 'payload.js');

    serialized.react('⏳');
    assert.deepEqual(sentReact, { text: '⏳', key: mockMsg.key });
});

test('emoji-kitchen should correctly parse composite emojis', () => {
    const pair = parseEmojiPair('😀❤️');
    assert.ok(pair);
    assert.equal(pair.e1, '1f600');
    assert.equal(pair.e2, '2764');
});
