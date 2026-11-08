/**
 * Accurately extracts two emoji graphemes and cleans variation selectors
 */
function parseEmojiPair(input) {
    if (!input || typeof input !== 'string') return null;
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    const segments = [...segmenter.segment(input.trim())];
    
    const emojiRegex = /\p{Extended_Pictographic}/u;
    const emojis = segments
        .map(s => s.segment)
        .filter(s => emojiRegex.test(s));

    if (emojis.length < 2) return null;

    const toHex = (str) => {
        return [...str]
            .map(c => c.codePointAt(0).toString(16))
            .filter(hex => hex !== 'fe0f' && hex !== 'fe0e') // remove variation selectors
            .join('-');
    };

    return {
        emoji1: emojis[0],
        emoji2: emojis[1],
        e1: toHex(emojis[0]),
        e2: toHex(emojis[1])
    };
}

module.exports = { parseEmojiPair };
