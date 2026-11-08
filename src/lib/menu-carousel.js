'use strict';

/**
 * Send the category carousel through the active WhatsApp session.
 * If carousel construction or delivery fails, use the caller-provided standard-menu fallback.
 */
async function sendMenuCarousel({
    m,
    sock,
    from,
    rawMessage,
    categories,
    image,
    prefix,
    channelUrl,
    menuTitle,
    generateWAMessageContent,
    generateWAMessageFromContent,
    onFallback,
}) {
    try {
        if (!from || !rawMessage || !sock?.user?.id) throw new Error('WhatsApp session is not ready.');
        if (!Array.isArray(categories) || categories.length === 0) throw new Error('No menu categories are available.');
        if (typeof generateWAMessageContent !== 'function' || typeof generateWAMessageFromContent !== 'function') {
            throw new Error('Carousel helpers are unavailable in the installed WhatsApp library.');
        }
        if (!/^https:\/\//i.test(channelUrl || '')) throw new Error('The menu channel link is not configured.');

        const imageContent = await generateWAMessageContent(
            { image },
            { upload: sock.waUploadToServer?.bind(sock) },
        );
        if (!imageContent?.imageMessage) throw new Error('The menu image could not be prepared.');

        const cards = categories.map((category, index) => ({
            header: {
                title: category.title,
                hasMediaAttachment: true,
                imageMessage: imageContent.imageMessage,
            },
            body: {
                text: [
                    category.desc,
                    ...category.items.map((item) => `❐${prefix}${item}`),
                ].filter(Boolean).join('\n'),
            },
            footer: { text: `Page ${index + 1} of ${categories.length}` },
            nativeFlowMessage: {
                buttons: [{
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'WhatsApp Channel',
                        url: channelUrl,
                        merchant_url: channelUrl,
                    }),
                }],
            },
        }));

        const carouselMessage = generateWAMessageFromContent(
            from,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: menuTitle },
                            footer: { text: 'Swipe left or right to browse command categories.' },
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            { quoted: rawMessage, userJid: sock.user.id },
        );

        await sock.relayMessage(from, carouselMessage.message, { messageId: carouselMessage.key.id });
        return carouselMessage.key;
    } catch (error) {
        if (typeof onFallback === 'function') return onFallback(error);
        throw error;
    }
}

module.exports = { sendMenuCarousel };
