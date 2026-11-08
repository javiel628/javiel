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
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('./lib/baileys');
const config = require('./config');
const { FONT_NAMES } = require('./lib/fonts');
const { serializeMessage } = require('./lib/serializer');
const { isOwner } = require('./middleware/owner');
const { requireGroup } = require('./middleware/group');
const { jidToNumber } = require('./lib/utils');
const { numOf, digits, senderNums, isSudo, isBanned, ownNums, ownerNums, botName, resolveTarget, isGroupAdmin, botIsAdmin } = require('./lib/access');
const { checkAntilink, checkEditedLink, getCfg: antilinkCfg, setCfg: setAntilinkCfg, getWarns, setWarns } = require('./lib/antilink');
const { GROUP_CMDS, runGroupCommand, trackPresence } = require('./commands/group');
const { handleParticipants } = require('./lib/welcome');
const { sendCopy } = require('./lib/buttons');
const { rememberMessage, handleRevoke } = require('./lib/antidelete');
const { chatReply, allowed: chatAllowed } = require('./lib/chatbot');
const { simulatePresence, startAlwaysOnline } = require('./lib/presence');
const { apiGet, uploadToCatbox } = require('./lib/api');
const log = require('./lib/logger');
const { handleStatus } = require('./lib/status');
const { followChannel, handleChannelPost } = require('./lib/channel');
const { postGroupStatus } = require('./lib/groupstatus');
const author = '𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙';
const {
    convertMediaToWebp,
    writeExifWebp,
    convertStickerToImage,
    createCircularSticker,
    generateTextSticker,
    convertToVoiceNote,
    applyAudioEffect
} = require('./lib/media');
const { parseEmojiPair } = require('./lib/emoji-kitchen');


// ──────────────── EDIT HERE ────────────────
// Your WhatsApp channel. Put the channel LINK (https://whatsapp.com/channel/XXXX) or, if you know it,
// the channel id (1203630000000000@newsletter). The bot follows it on connect, auto-reacts to every new
// post, and uses the same link for the menu's Channel button.
const CHANNEL = {
    link: 'https://whatsapp.com/channel/0029Vb794NKBadmdwkPN6i0B',
    jid: '', // optional, e.g. '120363123456789012@newsletter' (skips the link lookup)
    emojis: ['❤️', '🔥', '😍', '💯', '👏'], // one is picked at random for each post
};
const SUPPORT_URL = 'https://chat.whatsapp.com/';
// ───────────────────────────────────────────

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}



const SHADOW_MENU_CATEGORIES = [
    {
        id: 'shadow_cat_system',
        title: '📊 SYSTEM',
        commands: [
            'ping', 'alive', 'info', 'uptime', 'speed',
            'public', 'self', 'mode', 'autoread',
            'autorecord', 'autotyping', 'alwaysonline',
            'autostatus', 'setprefix', 'settings'
        ]
    },
    {
        id: 'shadow_cat_analysis',
        title: '🧠 ANALYSIS',
        commands: [
            'weather', 'checktime', 'repo', 'gitclone',
            'gitstalk', 'ssweb', 'whois', 'fact',
            'translate', 'define', 'calculate'
        ]
    },
    {
        id: 'shadow_cat_media',
        title: '🎬 MEDIA',
        commands: [
            'tiktok', 'play', 'song', 'igdl', 'fb',
            'video', 'ytmp3', 'ytmp4', 'mediafire',
            'sticker', 'toimg', 'gif'
        ]
    },
    {
        id: 'shadow_cat_group',
        title: '👥 GROUP',
        commands: [
            'add', 'kick', 'promote', 'demote',
            'antilink', 'antitag', 'tagall', 'hidetag',
            'mute', 'unmute', 'groupinfo', 'linkgroup'
        ]
    },
    {
        id: 'shadow_cat_conversion',
        title: '🔄 CONVERSION',
        commands: [
            'sticker', 's', 'toimg', 'take',
            'tovn', 'tourl', 'qr', 'emojimix'
        ]
    },
    {
        id: 'shadow_cat_developer',
        title: '🛠️ DEVELOPER',
        commands: [
            'eval', 'exec', 'restart', 'broadcast',
            'join', 'leave', 'fixerror'
        ]
    },
    {
        id: 'shadow_cat_basic',
        title: '🤖 BASIC',
        commands: [
            'ai', 'imagine', 'lyrics', 'calc',
            'password', 'getdp', 'ppwa',
            'gcinfo', 'owner', 'creator', 'support'
        ]
    }
];

async function sendShadowCarouselMenu(m, sock, settings) {
    const channelUrl = CHANNEL.link || 'https://whatsapp.com/channel/0029Vb794NKBadmdwkPN6i0B';
    const prefix = settings.get('prefix', config.prefix);
    
    const menuText = [
        '亗 *𝐒𝐇𝐀𝐃𝐎𝐖 𝐌𝐃 MAIN MENU* 亗',
        '',
        '⚡ Welcome to SHADOW MD',
        '━━━━━━━━━━━━━━━━━━━━',
        '👇 *Tap the MENU button below to open categories.*',
        '',
        `📢 *CHANNEL:* ${channelUrl}`,
        `👨‍💻 *DEVELOPER:* ${author}`,
        '亗 *SHADOW MD* 亗'
    ].join('\n');

    try {
        let imageBuffer = null;
        const configuredImage = settings.get('menuImage', '') || '';
        const imageSource = configuredImage || 'https://files.catbox.moe/6s94uf.jpeg';
        
        try {
            if (/^https?:\/\//i.test(imageSource)) {
                const response = await fetch(imageSource, { signal: AbortSignal.timeout(15000) });
                if (response.ok) imageBuffer = Buffer.from(await response.arrayBuffer());
            } else if (fs.existsSync(imageSource)) {
                imageBuffer = fs.readFileSync(imageSource);
            }
        } catch (e) {
            log.warn('menu-image', e.message);
        }

        const interactiveMessage = {
            body: { text: menuText },
            footer: { text: "Powered by SHADOW MD" },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📂 OPEN MENU",
                            id: "shadow_open_menu"
                        })
                    }
                ]
            }
        };

        if (imageBuffer?.length) {
            await sock.sendMessage(m.from, { image: imageBuffer, caption: menuText }, { quoted: m.raw });
            await sock.sendMessage(m.from, { interactiveMessage }, { quoted: m.raw });
        } else {
            await sock.sendMessage(m.from, { text: menuText }, { quoted: m.raw });
            await sock.sendMessage(m.from, { interactiveMessage }, { quoted: m.raw });
        }

    } catch (error) {
        log.error('menu', error.stack || error.message);
    }
}

async function handleShadowMenuButton(sock, raw, settings) {
    const buttonId = getShadowMenuButtonId(raw);
    if (!buttonId) return false;

    const prefix = settings.get('prefix', config.prefix);

    // 1. User tapped "OPEN MENU"
    if (buttonId === 'shadow_open_menu') {
        const categories = SHADOW_MENU_CATEGORIES;
        
        // Split into chunks of 3 (WhatsApp limit)
        const chunks = [];
        for (let i = 0; i < categories.length; i += 3) {
            chunks.push(categories.slice(i, i + 3));
        }

        for (let c = 0; c < chunks.length; c++) {
            const chunk = chunks[c];
            const pageNum = c + 1;
            const totalPages = chunks.length;

            const buttons = chunk.map(cat => ({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: cat.title,
                    id: cat.id
                })
            }));

            const interactiveMessage = {
                body: { text: `亗 *SHADOW MD CATEGORIES* 亗\n\nChoose a category (${pageNum}/${totalPages}):` },
                footer: { text: "Tap a button to view commands" },
                nativeFlowMessage: { buttons: buttons }
            };

            await sock.sendMessage(raw.key.remoteJid, { interactiveMessage }, { quoted: raw });
        }
        return true;
    }

    // 2. User tapped a specific Category (e.g., shadow_cat_group)
    let category = SHADOW_MENU_CATEGORIES.find(item => item.id === buttonId);
    
    // Fallback for number replies (1-7)
    if (!category && /^\d{1,2}$/.test(buttonId)) {
        category = SHADOW_MENU_CATEGORIES[parseInt(buttonId, 10) - 1];
    }
    if (!category) return false;

    // Format the command list
    const commandLines = category.commands.map((command, index) =>
        `│ ${String(index + 1).padStart(2, '0')}  ❯  *${prefix}${command}*`
    );
    
    const responseText = [
        `亗 *𝐒𝐇𝐀𝐃𝐎𝐖 𝐌𝐃 — ${category.title}* 亗`,
        '━━━━━━━━━━━━━━━━━━',
        ...commandLines,
        '━━━━━━━━━━━━━━━━━━',
        'Reply with a number or type the command.'
    ].join('\n');

    // Send the commands with a "Back to Menu" button
    const interactiveMessage = {
        body: { text: responseText },
        footer: { text: `亗 SHADOW MD 亗` },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🔙 BACK TO MENU",
                        id: "shadow_open_menu"
                    })
                }
            ]
        }
    };

    await sock.sendMessage(raw.key.remoteJid, { interactiveMessage }, { quoted: raw });
    return true;
}
        



/** on/off words -> true/false, anything else -> null (meaning "just show the status") */
function parseSwitch(arg) {
    const a = String(arg || '').toLowerCase();
    if (['on', 'true', 'yes', 'enable', '1'].includes(a)) return true;
    if (['off', 'false', 'no', 'disable', '0'].includes(a)) return false;
    return null;
}
const senderNumsOf = (jid) => [numOf(jid)];

async function handleCommand(m, { args, sock, session }) {
    m.chat = m.from;
    const isGroup = !!m.isGroup;
    const { settings, sessionId } = session;
    const cmd = (m._cmd || '').toLowerCase();
    const owners = settings.get('owners', []);
    const owner = isOwner(m, owners) || isSudo(m, settings); // sudo users get the owner's powers
    const P = settings.get('prefix', config.prefix);
    const isPublic = settings.get('public', true);

    log.command(`[${sessionId}] wa.me/${jidToNumber(m.sender)}`, `${settings.get('prefix', config.prefix)}${cmd}`);

    if (!isPublic && !owner) return;

    if (GROUP_CMDS.has(cmd)) return runGroupCommand(cmd, m, { sock, settings, owner, args, P, getQuotedMessage });

    try {
        switch (cmd) {
        case 'menu':
        case 'help':
            return sendShadowCarouselMenu(m, sock, settings);


        // ───────────────────────── group moderation & tools ─────────────────────────
        case 'del':
        case 'delete': {
            const quoted = await getQuotedMessage(m);
            if (!quoted) return m.reply(`Reply to a message with *${P}del* to delete it.`);
            if (m.isGroup && !owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) {
                return m.reply('⛔ Only group admins or the bot owner can delete messages.');
            }
            try {
                await sock.sendMessage(m.from, { delete: quoted.key });
                await sock.sendMessage(m.from, { delete: m.key }).catch(() => {});
            } catch (err) {
                return m.reply('❌ Failed to delete message. Make sure I am an admin in this group.');
            }
            return;
        }

        case 'warn': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            const target = resolveTarget(m, args);
            if (!target) return m.reply(`Mention or reply to a user to warn them: *${P}warn @user [reason]*`);
            const targetNum = jidToNumber(target);
            if (await isGroupAdmin(sock, m.from, [targetNum])) return m.reply('⛔ Cannot warn a group admin.');

            const groupWarns = settings.get('groupWarns', {});
            if (!groupWarns[m.from]) groupWarns[m.from] = {};
            const cur = (groupWarns[m.from][targetNum] || 0) + 1;
            const maxWarn = 3;
            const reason = args.filter(a => !a.startsWith('@') && digits(a).length < 7).join(' ').trim() || 'No reason specified';

            if (cur >= maxWarn) {
                delete groupWarns[m.from][targetNum];
                settings.set('groupWarns', groupWarns);
                await m.reply(`⛔ @${targetNum} reached *${maxWarn}/${maxWarn}* warnings and was removed.\n*Reason:* ${reason}`, { mentions: [target] });
                if (await botIsAdmin(sock, m.from)) {
                    await sock.groupParticipantsUpdate(m.from, [target], 'remove').catch(() => {});
                } else {
                    await m.reply('⚠️ Please give me admin privileges to remove members.');
                }
            } else {
                groupWarns[m.from][targetNum] = cur;
                settings.set('groupWarns', groupWarns);
                return m.reply(`⚠️ @${targetNum} has been warned!\n*Warnings:* ${cur}/${maxWarn}\n*Reason:* ${reason}`, { mentions: [target] });
            }
            return;
        }

        case 'unwarn': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            const target = resolveTarget(m, args);
            if (!target) return m.reply(`Mention or reply to a user: *${P}unwarn @user*`);
            const targetNum = jidToNumber(target);
            const groupWarns = settings.get('groupWarns', {});
            if (!groupWarns[m.from] || !groupWarns[m.from][targetNum]) {
                return m.reply(`ℹ️ @${targetNum} currently has 0 warnings.`, { mentions: [target] });
            }
            groupWarns[m.from][targetNum] = Math.max(0, groupWarns[m.from][targetNum] - 1);
            const remaining = groupWarns[m.from][targetNum];
            if (remaining === 0) delete groupWarns[m.from][targetNum];
            settings.set('groupWarns', groupWarns);
            return m.reply(`✅ Removed 1 warning from @${targetNum}. Remaining: *${remaining}/3*`, { mentions: [target] });
        }

        case 'checkwarn':
        case 'warns': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            const target = resolveTarget(m, args) || m.sender;
            const targetNum = jidToNumber(target);
            const groupWarns = settings.get('groupWarns', {});
            const count = groupWarns[m.from]?.[targetNum] || 0;
            return m.reply(`📋 Warnings for @${targetNum}: *${count}/3*`, { mentions: [target] });
        }

        case 'resetwarn': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            const target = resolveTarget(m, args);
            if (!target) return m.reply(`Mention or reply to a user: *${P}resetwarn @user*`);
            const targetNum = jidToNumber(target);
            const groupWarns = settings.get('groupWarns', {});
            if (groupWarns[m.from]?.[targetNum]) {
                delete groupWarns[m.from][targetNum];
                settings.set('groupWarns', groupWarns);
            }
            return m.reply(`✅ Reset all warnings for @${targetNum}.`, { mentions: [target] });
        }

        case 'poll': {
            if (!m.isGroup) return m.reply('⛔ Polls work in groups only.');
            const rawText = args.join(' ').trim();
            if (!rawText.includes('|')) {
                return m.reply(`Usage: *${P}poll Question | Option 1 | Option 2 | Option 3*`);
            }
            const parts = rawText.split('|').map(p => p.trim()).filter(Boolean);
            if (parts.length < 3) return m.reply('Please provide a question and at least 2 options separated by |');
            const question = parts[0];
            const options = parts.slice(1);
            if (options.length > 12) return m.reply('Maximum 12 options allowed.');
            try {
                return await sock.sendMessage(m.from, {
                    poll: {
                        name: question,
                        values: options,
                        selectableCount: 1,
                    },
                });
            } catch (err) {
                return m.reply('❌ Failed to create poll: ' + err.message);
            }
        }

        case 'ping': {
            const start = Date.now();
            await m.reply('Pinging...');
            return m.reply(`🏓 Pong! ${Date.now() - start}ms`);
        }

        case 'alive': {
            const s = process.uptime();
            const uptime = `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`;
            return m.reply(`✅ *${botName(settings, config)}* is alive!\nUptime: ${uptime}`);
        }

        case 'owner': {
            if (!owners.length) return m.reply('No owner number configured yet.');
            const list = owners.map((jid) => `wa.me/${jidToNumber(jid)}`).join('\n');
            return m.reply(`👑 Owner contact:\n${list}`);
        }

        case 'public':
            if (!owner) return m.reply('⛔ Owner only.');
            settings.set('public', true);
            return m.reply('✅ Bot is now *public* — anyone can use commands.');

        case 'self':
            if (!owner) return m.reply('⛔ Owner only.');
            settings.set('public', false);
            return m.reply('✅ Bot is now *self mode* — only the owner gets responses.');

        case 'setprefix': {
            if (!owner) return m.reply('⛔ Owner only.');
            const value = (args[0] || '').toLowerCase();
            if (!value) return m.reply('Usage: setprefix <character|none>');
            const newPrefix = value === 'none' ? '' : args[0];
            settings.set('prefix', newPrefix);
            return m.reply(newPrefix ? `✅ Prefix set to: ${newPrefix}` : '✅ Prefix removed — commands now work with no prefix.');
        }

        case 'setmenuimg': {
            if (!owner) return m.reply('⛔ Owner only.');
            const first = (args[0] || '').trim();
            if (/^(reset|default)$/i.test(first)) {
                settings.set('menuImage', DEFAULT_MENU_IMAGE);
                return m.reply('✅ Menu image reset to the default.');
            }
            if (/^https?:\/\//i.test(first)) {
                settings.set('menuImage', first);
                return m.reply('✅ Menu image set from the link. Send *' + P + 'menu* to see it.');
            }
            try {
                const quoted = await getQuotedMessage(m);
                const imgMsg = quoted?.message?.imageMessage || m.raw.message?.imageMessage;
                if (!imgMsg) return m.reply(`Reply to an image with *${P}setmenuimg*, send an image with it as the caption, or give a link:\n${P}setmenuimg https://...\n${P}setmenuimg reset`);
                const buffer = await downloadMediaMessage({ message: { imageMessage: imgMsg }, key: quoted?.message?.imageMessage ? quoted.key : m.key }, 'buffer', {});
                // inside the session folder (it survives panel updates and is removed with the session)
                const dir = path.join(process.cwd(), 'session', sessionId);
                fs.mkdirSync(dir, { recursive: true });
                const dest = path.join(dir, 'menu-image.jpg');
                fs.writeFileSync(dest, buffer);
                settings.set('menuImage', dest);
                return m.reply(`✅ Menu image updated. Send *${P}menu* to see it.`);
            } catch (err) {
                log.error('setmenuimg', err.stack || err.message);
                return m.reply(`❌ Could not set the menu image: ${err.message}`);
            }
        }

        case 'setfonts': {
            if (!owner) return m.reply('⛔ Owner only.');
            const style = (args[0] || '').toLowerCase();
            if (style === 'off' || !style) {
                settings.set('fontStyle', null);
                return m.reply('✅ Font styling turned off.');
            }
            if (!FONT_NAMES.includes(style)) return m.reply(`Unknown style. Options: ${FONT_NAMES.join(', ')}, off`);
            settings.set('fontStyle', style);
            return m.reply(`✅ Font style set to *${style}* (links are left untouched).`);
        }

        case 'autostatusview':
        case 'autostatuslike': {
            if (!owner) return m.reply('⛔ Owner only.');
            const key = cmd === 'autostatusview' ? 'autoStatusView' : 'autoStatusLike';
            const label = cmd === 'autostatusview' ? 'Auto status view' : 'Auto status like';
            const arg = (args[0] || '').toLowerCase();
            if (['on', 'true', 'yes', 'enable', '1'].includes(arg)) settings.set(key, true);
            else if (['off', 'false', 'no', 'disable', '0'].includes(arg)) settings.set(key, false);
            else return m.reply(`${label}: *${settings.get(key, false) ? 'ON' : 'OFF'}*\nUse: ${settings.get('prefix', config.prefix)}${cmd} on | off`);
            return m.reply(`✅ ${label}: *${settings.get(key) ? 'ON' : 'OFF'}*`);
        }

        case 'statusemoji': {
            if (!owner) return m.reply('⛔ Owner only.');
            const list = args.join(' ').match(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu) || [];
            if (!list.length) return m.reply(`Current status emojis: ${settings.get('statusEmojis', ['❤️']).join(' ')}\nSet: ${settings.get('prefix', config.prefix)}statusemoji ❤️ 🔥 😍 (one is picked at random)`);
            settings.set('statusEmojis', list.slice(0, 10));
            return m.reply(`✅ Status like emojis: ${list.slice(0, 10).join(' ')}`);
        }

        case 'autoreactch': {
            if (!owner) return m.reply('⛔ Owner only.');
            const arg = (args[0] || '').toLowerCase();
            if (['on', 'true', 'yes', 'enable', '1'].includes(arg)) settings.set('channelReact', true);
            else if (['off', 'false', 'no', 'disable', '0'].includes(arg)) settings.set('channelReact', false);
            else return m.reply(`Auto react on channel: *${settings.get('channelReact', true) ? 'ON' : 'OFF'}*\nUse: ${settings.get('prefix', config.prefix)}autoreactch on | off`);
            return m.reply(`✅ Auto react on channel: *${settings.get('channelReact') ? 'ON' : 'OFF'}*`);
        }

        case 'setdp': {
            if (!owner) return m.reply('⛔ Owner only.');
            const quoted = await getQuotedMessage(m);
            const imgMsg = quoted?.message?.imageMessage || m.raw.message?.imageMessage;
            if (!imgMsg) return m.reply("Reply to an image to set it as the bot's profile picture.");
            const buffer = await downloadMediaMessage({ message: { imageMessage: imgMsg }, key: m.key }, 'buffer', {});
            await sock.updateProfilePicture(sock.user.id, buffer);
            return m.reply('✅ Profile picture updated.');
        }

        case 'getdp': {
            const quoted = await getQuotedMessage(m);
            const target = quoted?.key?.participant || quoted?.key?.remoteJid || m.sender;
            try {
                const url = await sock.profilePictureUrl(target, 'image');
                return m.send({ image: { url }, caption: `Profile picture: wa.me/${jidToNumber(target)}` });
            } catch {
                return m.reply('No profile picture found (or privacy settings block it).');
            }
        }

        case 'rvo':
        case 'vv': {
            const quoted = await getQuotedMessage(m);
            const viewOnce =
                quoted?.message?.imageMessage?.viewOnce || quoted?.message?.videoMessage?.viewOnce
                    ? quoted.message
                    : quoted?.message?.viewOnceMessage?.message || quoted?.message?.viewOnceMessageV2?.message;
            if (!viewOnce) return m.reply('Reply to a view-once message with this command.');
            const mediaType = viewOnce.imageMessage ? 'imageMessage' : 'videoMessage';
            const buffer = await downloadMediaMessage({ message: viewOnce, key: quoted.key }, 'buffer', {});
            return m.send(
                mediaType === 'imageMessage'
                    ? { image: buffer, caption: viewOnce.imageMessage.caption || '' }
                    : { video: buffer, caption: viewOnce.videoMessage.caption || '' }
            );
        }

        
        case 'tiktok':
        case 'tt':
        case 'ttdl': {
            const url = args[0] || '';
            if (!url || !url.includes('tiktok.com')) {
                return m.reply(`Provide a valid TikTok link: *${P}tiktok https://vm.tiktok.com/...*`);
            }
            await m.react('⏳');
            try {
                const res = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
                const json = await res.json();
                if (json.code !== 0 || !json.data) {
                    return m.reply('❌ Failed to download TikTok video. Ensure the video is public.');
                }
                const { title, play, duration, author: ttAuthor } = json.data;
                const caption = `🎬 *TikTok Video*\n\n📌 *Title:* ${title || 'No Title'}\n👤 *Author:* ${ttAuthor?.nickname || 'Unknown'} (@${ttAuthor?.unique_id || ''})\n⏱️ *Duration:* ${duration || 0}s\n\n亗 *Downloaded by:* ${botName(settings, config)}`;
                await sock.sendMessage(m.from, {
                    video: { url: play },
                    caption,
                }, { quoted: m.raw });
                return await m.react('✅');
            } catch (err) {
                return m.reply('❌ TikTok download failed: ' + err.message);
            }
        }

        case 'gitclone':
        case 'git': {
            const url = args[0] || '';
            const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (!match) return m.reply(`Provide a GitHub link: *${P}gitclone https://github.com/username/repository*`);
            const [, user, repo] = match;
            const cleanRepo = repo.replace(/\.git$/, '');
            await m.react('⏳');
            try {
                const zipUrl = `https://api.github.com/repos/${user}/${cleanRepo}/zipball`;
                await sock.sendMessage(m.from, {
                    document: { url: zipUrl },
                    fileName: `${cleanRepo}.zip`,
                    mimetype: 'application/zip',
                    caption: `📦 *Repository:* ${user}/${cleanRepo}\n🔗 https://github.com/${user}/${cleanRepo}\n\n亗 *Downloaded by:* ${botName(settings, config)}`,
                }, { quoted: m.raw });
                return await m.react('✅');
            } catch (err) {
                return m.reply('❌ GitHub download failed: ' + err.message);
            }
        }

        case 'play': {
            const query = args.join(' ');
            if (!query) return m.reply('Usage: play <title or url>');
            try {
                const data = await apiGet(`/search/ytplayv2?q=${encodeURIComponent(query)}`);
                if (!data.status) return m.reply('Song not found.');
                const res = data.result;
                const mins = Math.floor(res.duration / 60);
                const secs = (res.duration % 60).toString().padStart(2, '0');
                await m.send({ image: { url: res.thumbnail }, caption: `🎵 ${res.title}\n⏱️ ${mins}:${secs}\n🔗 ${res.source}` });
                await m.send({ audio: { url: res.audio.url }, mimetype: 'audio/mpeg' });
            } catch (err) {
                log.error('play', err.message);
                return m.reply('Failed to process, try again later.');
            }
            return;
        }

        case 'ppwa': {
            const link = args.join(' ').trim();
            if (!link) return m.reply('Usage: ppwa <WhatsApp channel link>\nExample: ppwa https://whatsapp.com/channel/xxxx');
            if (!link.includes('https://whatsapp.com/channel/')) return m.reply('Invalid channel link.');
            try {
                const data = await apiGet(`/tools/getppchwa?link=${encodeURIComponent(link)}`);
                if (!data?.status || !data?.result?.photo) return m.reply('Channel photo not found.');
                return m.send({ image: { url: data.result.photo }, caption: `📢 WhatsApp Channel Profile Photo\n🔗 ${data.result.invite || link}` });
            } catch (err) {
                log.error('ppwa', err.message);
                return m.reply('Error fetching the channel photo.');
            }
        }

        case 'webzip': {
            const url = args.join(' ').trim();
            if (!url || !url.startsWith('http')) return m.reply('Usage: webzip <url>');
            try {
                await m.reply('🌐 Fetching website...');
                const data = await apiGet(`/tools/saveweb2zip?url=${encodeURIComponent(url)}`, 120000);
                if (!data?.status || !data?.result) return m.reply('Failed to fetch the website.');
                return m.send({ document: { url: data.result }, fileName: 'website.zip', mimetype: 'application/zip', caption: `📦 Website saved to zip\n🌍 ${url}` });
            } catch (err) {
                log.error('webzip', err.message);
                return m.reply('Something went wrong processing the website.');
            }
        }

        case 'upscale':
        case 'hd': {
            const quoted = await getQuotedMessage(m);
            const imgMsg = quoted?.message?.imageMessage;
            if (!imgMsg) return m.reply('Reply to a photo with this command.');
            try {
                await m.reply('⏳ Upscaling...');
                const buffer = await downloadMediaMessage({ message: { imageMessage: imgMsg }, key: quoted.key }, 'buffer', {});
                const hostedUrl = await uploadToCatbox(buffer, 'upscale-input.jpg');
                const data = await apiGet(`/tools/upscale?url=${encodeURIComponent(hostedUrl)}`);
                if (!data?.status || !data?.result?.upscale) return m.reply('Upscale failed.');
                return m.send({ image: { url: data.result.upscale }, caption: '✨ Upscale result' });
            } catch (err) {
                log.error('upscale', err.message);
                return m.reply('An error occurred while upscaling.');
            }
        }

        
        case 'imagine':
        case 'dalle':
        case 'aiimg': {
            const prompt = args.join(' ').trim();
            if (!prompt) return m.reply(`Provide an image prompt: *${P}imagine a cyberpunk warrior with glowing neon sword*`);
            await m.react('🎨');
            try {
                const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
                await sock.sendMessage(m.from, {
                    image: { url: imgUrl },
                    caption: `🎨 *Prompt:* ${prompt}\n\n亗 *Generated by:* ${botName(settings, config)}`,
                }, { quoted: m.raw });
                return await m.react('✅');
            } catch (err) {
                return m.reply('❌ Image generation failed: ' + err.message);
            }
        }

        case 'ai': {
            const question = args.join(' ').trim();
            if (!question) return m.reply(`Usage: *${P}ai what is quantum computing?*`);
            await m.react('⏳');
            try {
                // Free, fast Pollinations AI first
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 12000);
                try {
                    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(question)}`, { signal: controller.signal });
                    clearTimeout(timeout);
                    if (res.ok) {
                        const answer = (await res.text()).trim();
                        if (answer && answer.length > 3) {
                            return await m.reply(`🤖 *AI Assistant*\n\n${answer}`);
                        }
                    }
                } catch {
                    clearTimeout(timeout);
                }

                // Fallback to apiGet
                const data = await apiGet(`/ai/unliai?teks=${encodeURIComponent(question)}`);
                const ans = data?.result?.response || data?.result?.answer || data?.result;
                if (!ans) return m.reply('❌ AI did not return an answer.');
                return m.reply(`🤖 *AI Assistant*\n\n${ans}`);
            } catch (err) {
                return m.reply('❌ AI request failed: ' + err.message);
            }
        }

        case 'pin': {
            const query = args.join(' ');
            if (!query) return m.reply('Usage: pin <search term>');
            try {
                await m.reply('🔎 Searching Pinterest...');
                const data = await apiGet(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}&type=image`);
                const results = (data?.data || []).filter((v) => v.image_url).slice(0, 5);
                if (!results.length) return m.reply('No results found.');
                for (const r of results) await m.send({ image: { url: r.image_url } });
                return;
            } catch (err) {
                log.error('pin', err.message);
                return m.reply('Error fetching images.');
            }
        }

        case 'spotify': {
            const query = args.join(' ');
            if (!query) return m.reply('Usage: spotify <song name>');
            try {
                await m.reply('⏳ Searching...');
                const data = await apiGet(`/search/spotifyplay?query=${encodeURIComponent(query)}`);
                if (!data.status || !data.result) return m.reply('Song not found.');
                const s = data.result;
                const caption = `🎵 *SPOTIFY*\n\n🎶 Title: ${s.title}\n👤 Artist: ${s.artist}\n💿 Album: ${s.album}\n⏱ Duration: ${s.duration}\n🔗 ${s.url}`;
                if (s.download) return m.send({ audio: { url: s.download }, mimetype: 'audio/mpeg', caption });
                return m.reply(caption);
            } catch (err) {
                log.error('spotify', err.message);
                return m.reply('Error while playing the song.');
            }
        }

        case 'fixerror': {
            const quoted = await getQuotedMessage(m);
            let code = '';
            if (quoted?.message?.conversation) code = quoted.message.conversation;
            else if (quoted?.message?.extendedTextMessage?.text) code = quoted.message.extendedTextMessage.text;
            else if (quoted?.message?.documentMessage) {
                const buffer = await downloadMediaMessage({ message: quoted.message, key: quoted.key }, 'buffer', {});
                code = buffer.toString('utf8');
            }
            if (!code) return m.reply('Reply to a code snippet or a .js file.');
            if (code.length > 5000) return m.reply('Code is too long.');
            try {
                await m.reply('🧠 Fixing the code...');
                const prompt = `What is wrong with the following code?\n${code}\nplease fix it with no explanation`;
                const data = await apiGet(`/tools/fixerror?code=${encodeURIComponent(prompt)}&lang=javascript`, 30000);
                if (!data?.status || !data?.result?.fixed) return m.reply('Failed to fix the code.');
                const fixed = data.result.fixed;
                if (fixed.length < 4000) return m.reply(`✅ Fixed\n\n\`\`\`javascript\n${fixed}\n\`\`\``);
                return m.send({ document: Buffer.from(fixed), fileName: 'fixed.js', mimetype: 'text/javascript' });
            } catch (err) {
                log.error('fixerror', err.message);
                return m.reply('An error occurred.');
            }
        }

        case 'igstalk': {
            const username = args[0];
            if (!username) return m.reply('Usage: igstalk <username>');
            try {
                await m.reply('📥 Please wait...');
                const data = await apiGet(`/stalk/ig?username=${encodeURIComponent(username)}`);
                if (!data.status) return m.reply('Target not found — check the username.');
                const res = data.result;
                const cap =
                    `*IG STALKER - ${(res.fullname || '').toUpperCase()}*\n\n` +
                    `Username: @${res.username}\n` +
                    `Bio: ${res.biography || '-'}\n\n` +
                    `Followers: ${res.followers}\n` +
                    `Following: ${res.following}\n` +
                    `Posts: ${res.posts}\n\n` +
                    `Private: ${res.is_private ? 'Yes' : 'No'}\n` +
                    `Verified: ${res.is_verified ? 'Yes' : 'No'}`;
                if (res.profile_pic) return m.send({ image: { url: `https://images.weserv.nl/?url=${encodeURIComponent(res.profile_pic)}` }, caption: cap });
                return m.reply(cap);
            } catch (err) {
                log.error('igstalk', err.message);
                return m.reply('Error fetching data.');
            }
        }

        case 'toanime': {
            const quoted = await getQuotedMessage(m);
            const imgMsg = quoted?.message?.imageMessage;
            if (!imgMsg) return m.reply('Reply to a photo with this command.');
            try {
                await m.reply('⏳ Processing image...');
                const buffer = await downloadMediaMessage({ message: { imageMessage: imgMsg }, key: quoted.key }, 'buffer', {});
                const hostedUrl = await uploadToCatbox(buffer, 'toanime-input.jpg');
                const data = await apiGet(`/edit/nanobananav3?prompt=${encodeURIComponent('turn this photo into anime style')}&url=${encodeURIComponent(hostedUrl)}`);
                if (!data.status) return m.reply('Failed to process the image.');
                return m.send({ image: { url: data.result.result_url }, caption: '✅ Converted to anime style' });
            } catch (err) {
                log.error('toanime', err.message);
                return m.reply('An error occurred.');
            }
        }

        case 'editimg': {
            const quoted = await getQuotedMessage(m);
            const imgMsg = quoted?.message?.imageMessage;
            const prompt = args.join(' ');
            if (!prompt) return m.reply('Reply to a photo with a prompt.\nExample: editimg change the shirt to black');
            try {
                let hostedUrl;
                if (imgMsg) {
                    const buffer = await downloadMediaMessage({ message: { imageMessage: imgMsg }, key: quoted.key }, 'buffer', {});
                    hostedUrl = await uploadToCatbox(buffer, 'editimg-input.jpg');
                } else {
                    const match = prompt.match(/https?:\/\/\S+/);
                    if (!match) return m.reply('Reply to a photo, or include an image URL in the prompt.');
                    hostedUrl = match[0];
                }
                await m.reply('⏳ Editing...');
                const data = await apiGet(`/edit/nanobananav3?prompt=${encodeURIComponent(prompt)}&url=${encodeURIComponent(hostedUrl)}`);
                if (!data.status) return m.reply('Failed to edit the image.');
                return m.send({ image: { url: data.result.result_url }, caption: `Done.\n\nPrompt: ${prompt}` });
            } catch (err) {
                log.error('editimg', err.message);
                return m.reply('An error occurred.');
            }
        }

        case 'pindl': {
            const url = args[0];
            if (!url) return m.reply('Usage: pindl <pinterest link>');
            try {
                await m.reply('⏳ Fetching data...');
                const data = await apiGet(`/download/pindl?url=${encodeURIComponent(url)}`);
                if (!data?.status || !data?.result?.status) return m.reply('Failed to fetch data.');
                const best = data.result.best;
                if (!best?.url) return m.reply('Media not found.');
                const caption = `📌 *Pinterest Downloader*\n\n🎞️ Quality: ${best.quality}\n📦 Total media: ${data.result.total}`;
                if (best.url.includes('.mp4')) return m.send({ video: { url: best.url }, caption });
                return m.send({ image: { url: best.url }, caption });
            } catch (err) {
                log.error('pindl', err.message);
                return m.reply('An error occurred while processing.');
            }
        }

        case 'tourl': {
            const quoted = await getQuotedMessage(m);
            const media = quoted?.message?.imageMessage || quoted?.message?.videoMessage || quoted?.message?.documentMessage;
            const mediaType = quoted?.message?.imageMessage ? 'imageMessage' : quoted?.message?.videoMessage ? 'videoMessage' : 'documentMessage';
            if (!media) return m.reply('Reply to a photo/video/file with this command.');
            try {
                const buffer = await downloadMediaMessage({ message: { [mediaType]: media }, key: quoted.key }, 'buffer', {});
                const url = await uploadToCatbox(buffer, media.fileName || 'upload');
                return m.reply(`✅ Uploaded!\n🔗 ${url}`);
            } catch (err) {
                log.error('tourl', err.message);
                return m.reply(`Upload failed: ${err.message}`);
            }
        }

        // ───────────────────────── lookups ─────────────────────────
        case 'checkban': {
            const target = resolveTarget(m, args);
            if (target && !owner && numOf(target) !== numOf(m.sender)) return m.reply('⛔ Only the owner can check other numbers.');
            const who = target || m.senderAlt || m.sender;
            const num = numOf(who);
            const botBanned = (settings.get('banned', []) || []).includes(num);
            let wa = 'could not check';
            if (String(who).endsWith('@lid')) wa = 'cannot check a hidden (LID) id - give the phone number';
            else {
                try {
                    const [r] = (await sock.onWhatsApp(`${num}@s.whatsapp.net`)) || [];
                    wa = r?.exists ? 'registered ✅' : 'not found on WhatsApp ❌';
                } catch (err) {
                    wa = `check failed (${err.message})`;
                }
            }
            return m.reply(
                `🔎 *Ban check* · wa.me/${num}\n\n` +
                    `🤖 This bot: ${botBanned ? '🚫 *banned*' : '✅ not banned'}\n` +
                    `📱 WhatsApp: ${wa}\n\n` +
                    `_WhatsApp does not tell bots about bans. A number that is banned (or closed, or never existed) shows as "not found", so that result cannot tell those apart._`
            );
        }

        case 'idch': {
            const arg = args.join(' ').trim();
            const code = arg.match(/channel\/([A-Za-z0-9_-]+)/)?.[1];
            const direct = arg.match(/\b\d{10,}@newsletter\b/)?.[0];
            if (!code && !direct) return m.reply(`Usage: ${P}idch <channel link>\nExample: ${P}idch https://whatsapp.com/channel/0029Va...\n(you get the channel ID with a copy button)`);
            try {
                const meta = direct ? await sock.newsletterMetadata('jid', direct) : await sock.newsletterMetadata('invite', code);
                const jid = meta?.id || direct;
                if (!jid) return m.reply('❌ Channel not found. Check the link.');
                const name = meta?.name || meta?.thread_metadata?.name?.text || 'Channel';
                const subs = meta?.subscribers ?? meta?.thread_metadata?.subscribers_count;
                return sendCopy(m, { title: 'Channel ID', text: `📣 *${name}*${subs ? `\n👥 ${Number(subs).toLocaleString('en-US')} followers` : ''}\n🆔 ${jid}`, value: jid, label: 'Copy ID' });
            } catch (err) {
                return m.reply(`❌ Could not read that channel: ${err.message}`);
            }
        }

        // ───────────────────────── customize ─────────────────────────
        case 'setbotname': {
            if (!owner) return m.reply('⛔ Owner only.');
            const name = args.join(' ').trim().slice(0, 40);
            if (!name) return m.reply(`Usage: ${P}setbotname <name>\nUse "${P}setbotname reset" for the default (${config.botName}).`);
            if (/^(reset|default)$/i.test(name)) {
                settings.set('botName', '');
                return m.reply(`✅ Bot name reset to *${config.botName}*.`);
            }
            settings.set('botName', name);
            return m.reply(`✅ Your bot is now called *${name}*.`);
        }

        case 'mode': {
            if (!owner) return m.reply('⛔ Owner only.');
            const a = (args[0] || '').toLowerCase();
            if (a === 'public') settings.set('public', true);
            else if (a === 'self' || a === 'private') settings.set('public', false);
            else if (a === 'gc' || a === 'group') settings.set('workMode', 'gc');
            else if (a === 'dm' || a === 'pm') settings.set('workMode', 'dm');
            else if (a === 'all' || a === 'both') settings.set('workMode', 'all');
            else {
                const wm = { all: 'groups + DMs', gc: 'groups only', dm: 'DMs only' }[settings.get('workMode', 'all')];
                return m.reply(`*Mode*\nAccess: *${settings.get('public', true) ? 'public' : 'self'}*\nWorks in: *${wm}*\n\n${P}mode public | self\n${P}mode gc  (groups only)\n${P}mode dm  (DMs only)\n${P}mode all`);
            }
            const wm = { all: 'groups + DMs', gc: 'groups only', dm: 'DMs only' }[settings.get('workMode', 'all')];
            return m.reply(`✅ Access: *${settings.get('public', true) ? 'public' : 'self'}* · Works in: *${wm}*\n(the owner and sudo users can always use the bot)`);
        }

        case 'settings':
        case 'config': {
            if (!owner) return m.reply('⛔ Owner only.');
            const on = (v) => (v ? '✅ ON' : '❌ OFF');
            const wm = { all: 'groups + DMs', gc: 'groups only', dm: 'DMs only' }[settings.get('workMode', 'all')];
            const ad = settings.get('antidelete', {});
            const lines = [
                `⚙️ *${botName(settings, config)} — settings*`,
                '',
                `*Look*`,
                `• Name: ${botName(settings, config)}   (${P}setbotname)`,
                `• Prefix: ${P || 'none'}   (${P}setprefix)`,
                `• Menu image: ${settings.get('menuImage') ? 'custom' : 'none'}   (${P}setmenuimg)`,
                `• Font: ${settings.get('fontStyle') || 'normal'}   (${P}setfonts)`,
                '',
                `*Access*`,
                `• Mode: ${settings.get('public', true) ? 'public' : 'self'} · ${wm}   (${P}mode)`,
                `• Sudo users: ${(settings.get('sudo', []) || []).length}   (${P}addsudo)`,
                `• Banned: ${(settings.get('banned', []) || []).length}   (${P}ban)`,
                '',
                `*Protection*`,
                `• Anti-delete: ${on(ad.enabled)}${ad.enabled ? ` (${ad.mode === 'dm' ? 'owner DM' : 'same chat'})` : ''}   (${P}antidelete)`,
                `• Anti-call: ${settings.get('antiCall', 'off').toUpperCase()}   (${P}anticall)`,
                m.isGroup ? `• Antilink here: ${antilinkCfg(settings, m.from).mode.toUpperCase()}   (${P}antilink)` : `• Antilink: set it inside a group`,
                '',
                `*Automation*`,
                `• AI auto-reply: ${on(settings.get('autoReply'))}   (${P}autoreply)`,
                `• Auto typing: ${on(settings.get('autoType'))}   (${P}autotype)`,
                `• Auto recording: ${on(settings.get('autoRecord'))}   (${P}autorecord)`,
                `• Recording + typing: ${on(settings.get('autoRecordType'))}   (${P}autorecordtype)`,
                `• Always online: ${on(settings.get('alwaysOnline'))}   (${P}alwaysonline)`,
                `• Status view: ${on(settings.get('autoStatusView'))}   (${P}autostatusview)`,
                `• Status like: ${on(settings.get('autoStatusLike'))} ${settings.get('statusEmojis', ['❤️']).join('')}   (${P}autostatuslike)`,
                `• Channel auto-react: ${on(settings.get('channelReact', true))}   (${P}autoreactch)`,
            ];
            return m.reply(lines.join('\n'));
        }

        case 'resetsettings': {
            if (!owner) return m.reply('⛔ Owner only.');
            if ((args[0] || '').toLowerCase() !== 'confirm') return m.reply(`This resets name, prefix, menu image, font, modes, protection and automation to defaults.\nSudo, bans and owners are kept.\n\nType *${P}resetsettings confirm* to continue.`);
            const defaults = {
                public: true, prefix: config.prefix, menuImage: DEFAULT_MENU_IMAGE, fontStyle: null, botName: '', workMode: 'all',
                antilink: {}, antilinkWarns: {}, antidelete: { enabled: false, mode: 'chat' }, antiCall: 'off',
                autoReply: false, autoType: false, autoRecord: false, autoRecordType: false, alwaysOnline: false,
                autoStatusView: true, autoStatusLike: true, statusEmojis: ['❤️'], channelReact: true,
            };
            for (const [k, v] of Object.entries(defaults)) settings.set(k, v);
            return m.reply('✅ All settings are back to default.');
        }

        // ───────────────────────── access control ─────────────────────────
        case 'addsudo':
        case 'delsudo': {
            if (!owner) return m.reply('⛔ Owner only.');
            const target = resolveTarget(m, args);
            if (!target) return m.reply(`Reply to a person, @mention them, or type the number.\nExample: ${P}${cmd} 254712345678`);
            const num = numOf(target);
            const list = settings.get('sudo', []);
            if (cmd === 'addsudo') {
                if ([...ownNums(sock), ...owners.map(numOf)].includes(num)) return m.reply('That number is already an owner.');
                if (list.includes(num)) return m.reply('Already a sudo user.');
                settings.set('sudo', [...list, num]);
                return m.reply(`✅ @${num} is now *sudo* — owner commands work for them, even in self mode.`, { mentions: [target] });
            }
            if (!list.includes(num)) return m.reply('That number is not a sudo user.');
            settings.set('sudo', list.filter((x) => x !== num));
            return m.reply(`✅ @${num} is no longer sudo.`, { mentions: [target] });
        }

        case 'listsudo': {
            if (!owner) return m.reply('⛔ Owner only.');
            const list = settings.get('sudo', []);
            if (!list.length) return m.reply(`No sudo users yet.\nAdd one: ${P}addsudo <number>`);
            return m.reply(`👑 *Sudo users (${list.length})*\n${list.map((n, i) => `${i + 1}. wa.me/${n}`).join('\n')}`);
        }

        case 'ban':
        case 'unban': {
            if (!owner) return m.reply('⛔ Owner only.');
            const target = resolveTarget(m, args, { allowChat: true });
            if (!target) return m.reply(`Reply to a person, @mention them, or type the number.\nExample: ${P}${cmd} 254712345678`);
            const num = numOf(target);
            const list = settings.get('banned', []);
            if (cmd === 'ban') {
                if (ownerNums(sock, settings).includes(num)) return m.reply('⛔ You cannot ban an owner or sudo user.');
                if (list.includes(num)) return m.reply('Already banned.');
                settings.set('banned', [...list, num]);
                return m.reply(`🚫 @${num} is banned — the bot will ignore them.`, { mentions: [target] });
            }
            if (!list.includes(num)) return m.reply('That number is not banned.');
            settings.set('banned', list.filter((x) => x !== num));
            return m.reply(`✅ @${num} is unbanned.`, { mentions: [target] });
        }

        case 'listbanned': {
            if (!owner) return m.reply('⛔ Owner only.');
            const list = settings.get('banned', []);
            if (!list.length) return m.reply('Nobody is banned.');
            return m.reply(`🚫 *Banned (${list.length})*\n${list.map((n, i) => `${i + 1}. wa.me/${n}`).join('\n')}`);
        }

        case 'block':
        case 'unblock': {
            if (!owner) return m.reply('⛔ Owner only.');
            const target = resolveTarget(m, args, { allowChat: true });
            if (!target) return m.reply(`Reply to a person, @mention them, type the number, or use it in their private chat.`);
            if (ownerNums(sock, settings).includes(numOf(target))) return m.reply('⛔ You cannot block an owner or sudo user.');
            try {
                await sock.updateBlockStatus(target, cmd === 'block' ? 'block' : 'unblock');
                return m.reply(`✅ ${cmd === 'block' ? 'Blocked' : 'Unblocked'} wa.me/${numOf(target)}`);
            } catch (err) {
                return m.reply(`❌ Could not ${cmd}: ${err.message}`);
            }
        }

        case 'listblocked': {
            if (!owner) return m.reply('⛔ Owner only.');
            try {
                const list = (await sock.fetchBlocklist()) || [];
                if (!list.length) return m.reply('Your block list is empty.');
                return m.reply(`⛔ *Blocked (${list.length})*\n${list.map((j, i) => `${i + 1}. wa.me/${numOf(j)}`).join('\n')}`);
            } catch (err) {
                return m.reply(`❌ Could not read the block list: ${err.message}`);
            }
        }

        // ───────────────────────── protection 
        
            // ───────────────────────── media ─────────────────────────
    



    // ───────────────────────── text tools ─────────────────────────
        case 'trt':
    case 'translate': {
        const text = args.join(' ').trim();
        if (!text) return m.reply(`Usage: ${P}trt <text> (auto → English)\n${P}trt <lang> <text>  e.g. ${P}trt fr hello`);
        let lang = 'en', q = text;
        const m2 = text.match(/^([a-z]{2,3})\s+(.+)$/i);
        if (m2) { lang = m2[1].toLowerCase(); q = m2[2]; }
        try {
            await m.react('⏳');
            // Try MyMemory free translation
            try {
                const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=autodetect|${encodeURIComponent(lang)}`;
                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    if (json.responseData?.translatedText) {
                        return m.reply(`🌐 *Translation [${lang.toUpperCase()}]*\n\n${json.responseData.translatedText}`);
                    }
                }
            } catch {}

            const data = await apiGet(`/tools/translate?text=${encodeURIComponent(q)}&to=${lang}`);
            const out = data?.result?.translated || data?.result?.text || data?.result;
            if (!out) return m.reply('Translation failed.');
            return m.reply(`🌐 *${lang.toUpperCase()}*\n${out}`);
        } catch (err) {
            log.error('trt', err.message);
            return m.reply('❌ Translation error.');
        }
    }

    case 'tts': {
        const text = args.join(' ').trim();
        if (!text) return m.reply(`Usage: ${P}tts <text>`);
        try {
            const data = await apiGet(`/tools/tts?text=${encodeURIComponent(text)}`);
            const url = data?.result?.url || data?.result;
            if (!url) return m.reply('TTS failed.');
            return m.send({ audio: { url }, mimetype: 'audio/mpeg', ptt: true });
        } catch (err) {
            log.error('tts', err.message);
            return m.reply('❌ TTS error.');
        }
    }

        case 'lyrics': {
        const q = args.join(' ').trim();
        if (!q) return m.reply(`Usage: ${P}lyrics <song title>`);
        try {
            await m.react('⏳');
            // Try lyrics.ovh if artist - song or spaced
            let artist = '', title = q;
            if (q.includes('-')) {
                const parts = q.split('-');
                artist = parts[0].trim();
                title = parts.slice(1).join('-').trim();
            } else {
                const words = q.split(' ');
                if (words.length > 1) {
                    artist = words[0];
                    title = words.slice(1).join(' ');
                }
            }
            if (artist && title) {
                try {
                    const lRes = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
                    if (lRes.ok) {
                        const lJson = await lRes.json();
                        if (lJson.lyrics) {
                            const cap = `🎶 *${title}*\n👤 *${artist}*\n\n${lJson.lyrics.trim()}`;
                            return m.reply(cap.length > 6000 ? cap.slice(0, 6000) + '\n…' : cap);
                        }
                    }
                } catch {}
            }

            const data = await apiGet(`/search/lyrics?q=${encodeURIComponent(q)}`);
            const r = data?.result;
            if (!r) return m.reply('Lyrics not found.');
            const cap = `🎶 *${r.title || q}*${r.artist ? `\n👤 ${r.artist}` : ''}\n\n${r.lyrics || r.text || ''}`;
            return m.reply(cap.length > 6000 ? cap.slice(0, 6000) + '\n…' : cap);
        } catch (err) {
            log.error('lyrics', err.message);
            return m.reply('❌ Could not fetch lyrics.');
        }
    }

        case 'weather': {
        const city = args.join(' ').trim();
        if (!city) return m.reply(`Usage: ${P}weather <city>`);
        try {
            await m.react('⏳');
            try {
                const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+(feels+like+%f)+humidity:+%h+wind:+%w`, {
                    headers: { 'User-Agent': 'curl/8.0' }
                });
                if (res.ok) {
                    const text = (await res.text()).trim();
                    if (text && !text.includes('Unknown location')) {
                        return m.reply(`🌤️ *Weather in ${city.toUpperCase()}*\n\n📍 ${text}\n\n亗 *Provided by:* ${botName(settings, config)}`);
                    }
                }
            } catch {}

            const data = await apiGet(`/tools/weather?q=${encodeURIComponent(city)}`);
            const r = data?.result;
            if (!r) return m.reply('City not found.');
            return m.reply(`🌦️ *${r.location || city}*\n🌡️ ${r.temp ?? '-'}°C (feels ${r.feels ?? '-'}°C)\n☁️ ${r.desc || r.condition || '-'}\n💧 Humidity: ${r.humidity ?? '-'}%\n💨 Wind: ${r.wind ?? '-'}`);
        } catch (err) {
            log.error('weather', err.message);
            return m.reply('❌ Weather lookup failed.');
        }
    }

    // ───────────────────────── utility ─────────────────────────
    case 'runtime':
    case 'uptime': {
        const s = process.uptime();
        return m.reply(`⏱️ Uptime: ${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`);
    }

    case 'stats': {
        const mem = process.memoryUsage();
        const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';
        return m.reply(
            `📊 *${botName(settings, config)} stats*\n` +
            `• Uptime: ${Math.floor(process.uptime() / 60)} min\n` +
            `• RSS: ${mb(mem.rss)}\n• Heap: ${mb(mem.heapUsed)} / ${mb(mem.heapTotal)}\n` +
            `• Node: ${process.version}\n• Platform: ${process.platform}`
        );
    }

    case 'calc': {
        const expr = args.join(' ').trim();
        if (!expr) return m.reply(`Usage: ${P}calc <expression>`);
        if (!/^[\d\s+\-*/().%]+$/.test(expr)) return m.reply('❌ Only numbers and + - * / ( ) % allowed.');
        try {
            // eslint-disable-next-line no-new-func
            const val = Function(`"use strict";return (${expr})`)();
            return m.reply(`🧮 ${expr} = *${val}*`);
        } catch {
            return m.reply('❌ Invalid expression.');
        }
    }

    case 'password': {
        const len = Math.min(Math.max(parseInt(args[0], 10) || 16, 6), 64);
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
        let out = '';
        const crypto = require('crypto');
        for (let i = 0; i < len; i++) out += chars[crypto.randomInt(0, chars.length)];
        return m.reply(`🔐 Password (${len}):\n\`${out}\``);
    }

    case 'qr': {
        const text = args.join(' ').trim();
        if (!text) return m.reply(`Usage: ${P}qr <text or url>`);
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(text)}`;
        return m.send({ image: { url }, caption: '🔳 QR Code' });
    }

    // ───────────────────────── owner ─────────────────────────
    case 'restart': {
        if (!owner) return m.reply('⛔ Owner only.');
        await m.reply('♻️ Restarting...');
        process.exit(0); // panel/pm2 should restart automatically
    }

    case 'broadcast': {
        if (!owner) return m.reply('⛔ Owner only.');
        const text = args.join(' ').trim();
        if (!text) return m.reply(`Usage: ${P}broadcast <message>`);
        try {
            const groups = await sock.groupFetchAllParticipating();
            let n = 0;
            for (const jid of Object.keys(groups)) {
                try { await sock.sendMessage(jid, { text }); n++; } catch {}
            }
            return m.reply(`📢 Broadcast sent to ${n} group(s).`);
        } catch (err) {
            log.error('broadcast', err.message);
            return m.reply('❌ Broadcast failed.');
        }
    }

    
case 'report': {
    if (!owners.length) return m.reply('No owner configured.');

    const text = args.join(' ').trim();
    if (!text) return m.reply(`Usage: ${P}report <message>`);

    const to = owners[0];

    // Prefer the real phone-number JID over a LID
    const senderJid = m.senderAlt || m.sender;
    const senderNumber = jidToNumber(senderJid);

    try {
        await sock.sendMessage(to, {
            text: `📩 *NEW BOT REPORT*

👤 *Sender:* ${senderNumber}
📱 *WhatsApp:* https://wa.me/${senderNumber}

━━━━━━━━━━━━━━
📝 *Message:*
${text}
━━━━━━━━━━━━━━`
        });

        return m.reply('✅ Report sent to the owner.');
    } catch (err) {
        console.error('Report error:', err);
        return m.reply('❌ Could not send the report.');
    }
}


    
case 'donate': {
    return m.reply(`
╭━━〔 ☕ DONATE & SUPPORT 〕━━╮
┃
┃  ✨ *SUPPORT ${botName(settings, config)}*
┃
┃  Your support keeps this project
┃  growing and improving every day.
┃
┃  💎 *DONATION CONTACT*
┃  📞 +254107065646
┃
┃  📢 *JOIN OUR WHATSAPP CHANNEL*
┃  🔗 https://whatsapp.com/channel/0029Vb794NKBadmdwkPN6i0B
┃
┃  ❤️ Thank you for your support!
┃
╰━━━━━━━━━━━━━━━━━━━━╯

_© ${botName(settings, config)}_
`.trim());
}
break;


case 'enc':
case 'encrypt': {
    const JsConfuser = require('js-confuser');

    const quoted = m.quoted;

    if (!quoted) {
        return m.reply('❌ Reply to a JavaScript (.js) file.');
    }

    const fileName = quoted.fileName || quoted.msg?.fileName || '';

    if (!fileName.toLowerCase().endsWith('.js')) {
        return m.reply('❌ Only .js files are supported.');
    }

    try {
        await sock.sendMessage(m.from, {
            react: { text: '⏳', key: m.key }
        });

        const docBuffer = await downloadMediaMessage({ message: quoted.message, key: quoted.key }, 'buffer', {});

        if (!docBuffer) {
            return m.reply('❌ Failed to download the file.');
        }

        const result = await JsConfuser.obfuscate(
            docBuffer.toString('utf-8'),
            {
                target: 'node',
                preset: 'high',
                compact: true,
                minify: true,
                flatten: true,

                identifierGenerator: function () {
                    const originalString = 'SMILEMODZ';
                    const randomString = (length) => {
                        let result = '';
                        const characters =
                            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

                        for (let i = 0; i < length; i++) {
                            result += characters.charAt(
                                Math.floor(Math.random() * characters.length)
                            );
                        }

                        return result;
                    };

                    return originalString + randomString(2);
                },

                renameVariables: true,
                renameGlobals: false,
                stringEncoding: true,
                stringSplitting: 0.0,
                stringConcealing: true,
                stringCompression: true,
                duplicateLiteralsRemoval: 1.0,
                controlFlowFlattening: 1.0,
                opaquePredicates: 0.9,
                deadCode: 0.0,
                dispatcher: true,
                calculator: true,
                hexadecimalNumbers: true,
                movedDeclarations: true,
                objectExtraction: true,
                globalConcealing: true
            }
        );

        const output = result.code || result;

        await sock.sendMessage(m.from, {
            document: Buffer.from(output, 'utf-8'),
            mimetype: 'application/javascript',
            fileName: `SHADOW-${fileName}`,
            caption: `
╭━━〔 亗 SHADOW MD 亗 〕━━╮
┃
┃  🔐 ENCRYPTION SUCCESSFUL
┃
┃  📁 File: ${fileName}
┃  🛡️ Protection: HIGH
┃
┃  👨‍💻 DEVELOPER
┃  𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙
┃
╰━━━━━━━━━━━━━━━━━━╯
            `.trim()
        }, { quoted: m });

        await sock.sendMessage(m.from, {
            react: { text: '✅', key: m.key }
        });

    } catch (err) {
        console.error('SHADOW ENCRYPT ERROR:', err);
        return m.reply(`❌ Encryption failed: ${err.message}`);
    }

    break;
}



        
        
        
        //─────────────────────────
        case 'antilink': {
            if (!(await requireGroup(m))) return;
            const admin = owner || (await isGroupAdmin(sock, m.from, senderNums(m)));
            if (!admin) return m.reply('⛔ Group admins only.');
            const sub = (args[0] || '').toLowerCase();
            const cfg = antilinkCfg(settings, m.from);
            const explain = { del: 'links are deleted', warn: `links are deleted + warning (kick at ${cfg.limit})`, kick: 'links are deleted and the sender is removed' };

            if (['del', 'delete', 'warn', 'kick'].includes(sub)) {
                const mode = sub === 'delete' ? 'del' : sub;
                const next = setAntilinkCfg(settings, m.from, { mode });
                return m.reply(`✅ Antilink *${mode.toUpperCase()}*: ${explain[mode].replace(String(cfg.limit), String(next.limit))}.\n(group admins are never touched — I must be admin)`);
            }
            if (sub === 'off') {
                setAntilinkCfg(settings, m.from, { mode: 'off' });
                return m.reply('✅ Antilink is *OFF* in this group.');
            }
            if (sub === 'setwarn') {
                const n = parseInt(args[1], 10);
                if (!(n >= 1 && n <= 10)) return m.reply(`Usage: ${P}antilink setwarn <1-10>`);
                setAntilinkCfg(settings, m.from, { limit: n });
                return m.reply(`✅ Warn limit set to *${n}* — the ${n}${['st', 'nd', 'rd'][n - 1] || 'th'} link gets the sender removed (in warn mode).`);
            }
            if (sub === 'resetwarn') {
                const target = resolveTarget(m, args.slice(1));
                const warns = getWarns(settings, m.from);
                if (target) {
                    const key = Object.keys(warns).find((k) => senderNumsOf(target).includes(k));
                    if (key) delete warns[key];
                    setWarns(settings, m.from, warns);
                    return m.reply(`✅ Warnings reset for @${numOf(target)}.`, { mentions: [target] });
                }
                setWarns(settings, m.from, {});
                return m.reply('✅ All antilink warnings in this group were reset.');
            }
            const warned = Object.keys(getWarns(settings, m.from)).length;
            const iAmAdmin = await botIsAdmin(sock, m.from);
            return m.reply(
                `*Antilink*  ·  now: *${cfg.mode.toUpperCase()}*  ·  warn limit: *${cfg.limit}*  ·  warned members: ${warned}\nI am admin here: ${iAmAdmin ? '✅ yes' : '❌ NO - make me admin or I cannot delete links'}\nGroup admins, the owner and sudo users are never touched.\n\n` +
                    `${P}antilink del — delete links\n${P}antilink warn — delete + warn, kick at the limit\n${P}antilink kick — delete + remove sender\n` +
                    `${P}antilink setwarn <n> — warnings before kick\n${P}antilink resetwarn [@user] — clear warnings\n${P}antilink off`
            );
        }

        

        case 'anticall': {
            if (!owner) return m.reply('⛔ Owner only.');
            const a = (args[0] || '').toLowerCase();
            if (!['hang', 'block', 'off'].includes(a)) return m.reply(`*Anti-call*: ${settings.get('antiCall', 'off').toUpperCase()}\n\n${P}anticall hang — reject every call\n${P}anticall block — reject and block the caller\n${P}anticall off`);
            settings.set('antiCall', a);
            return m.reply(a === 'off' ? '✅ Anti-call *OFF*.' : `✅ Anti-call *${a.toUpperCase()}* — ${a === 'hang' ? 'calls are rejected' : 'callers are rejected and blocked'} (owner and sudo are never affected).`);
        }
        
        
                case 'antidelete':
        case 'antidel': {
            if (!owner) return m.reply('⛔ Owner only.');

            const action = (args[0] || '').toLowerCase();
            const modeArg = (args[1] || '').toLowerCase();

            const current = settings.get('antidelete', {
                enabled: false,
                mode: 'chat'
            });

            if (!action || action === 'status') {
                return m.reply(
                    `亗 *SHADOW MD ANTI-DELETE* 亗\n\n` +
                    `• Status: ${current.enabled ? '✅ ON' : '❌ OFF'}\n` +
                    `• Mode: ${current.mode === 'dm' ? 'Owner DM' : 'Same Chat'}\n\n` +
                    `*Available Commands:*\n` +
                    `▢ ${P}antidelete on\n` +
                    `▢ ${P}antidelete on chat\n` +
                    `▢ ${P}antidelete on dm\n` +
                    `▢ ${P}antidelete off\n\n` +
                    `© SHADOW MD`
                );
            }

            if (action === 'on' || action === 'chat' || action === 'dm') {
                const mode = action === 'dm' || modeArg === 'dm'
                    ? 'dm'
                    : 'chat';

                settings.set('antidelete', {
                    enabled: true,
                    mode
                });

                return m.reply(
                    `✅ *ANTI-DELETE ACTIVATED*\n\n` +
                    `• Status: ON\n` +
                    `• Mode: ${mode === 'dm' ? 'Owner Private DM' : 'Same Chat'}\n\n` +
                    `${mode === 'dm'
                        ? 'Deleted messages will be sent to the bot owner.'
                        : 'Deleted messages will be restored in their original chat.'}\n\n` +
                    `亗 *SHADOW MD* 亗`
                );
            }

            if (action === 'off') {
                settings.set('antidelete', {
                    enabled: false,
                    mode: current.mode || 'chat'
                });

                return m.reply('❌ *ANTI-DELETE DEACTIVATED*');
            }

            return m.reply(
                `❌ Invalid option.\n\n` +
                `Use:\n` +
                `${P}antidelete on\n` +
                `${P}antidelete on dm\n` +
                `${P}antidelete off`
            );
        }
        
        
        
        
        
        
        
        
        

        // ───────────────────────── automation 
        
     
        // ─────────────────────────
        // STICKER & METADATA TOOLS
        // ─────────────────────────
        case 'sticker':
        case 'stiker':
        case 's': {
            try {
                const quoted = await getQuotedMessage(m);
                const msg = quoted?.message || m.raw?.message;
                if (!msg) {
                    return m.reply('📸 Reply to an image or short video with .s [packname|author]');
                }

                const isImg = !!msg.imageMessage;
                const isVid = !!msg.videoMessage;
                const isStk = !!msg.stickerMessage;

                if (!isImg && !isVid && !isStk) {
                    return m.reply('❌ Reply to an image, video or sticker.');
                }
                if (isVid && Number(msg.videoMessage.seconds || 0) > 10) {
                    return m.reply('❌ Video must be 10 seconds or shorter.');
                }

                await m.reply('⏳ Creating sticker...');
                const rawBuffer = await downloadMediaMessage(
                    { message: msg, key: quoted?.key || m.key },
                    'buffer',
                    {}
                );

                const metaRaw = args.join(' ').trim();
                let pack = 'Shadow MD';
                let author = '𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙';
                if (metaRaw) {
                    const parts = metaRaw.includes('|') ? metaRaw.split('|') : metaRaw.split(',');
                    if (parts[0]) pack = parts[0].trim();
                    if (parts[1]) author = parts[1].trim();
                }

                let webpBuf;
                if (isStk) {
                    webpBuf = await writeExifWebp(rawBuffer, { packname: pack, author: author });
                } else {
                    const converted = await convertMediaToWebp(rawBuffer, isVid);
                    webpBuf = await writeExifWebp(converted, { packname: pack, author: author });
                }

                await sock.sendMessage(m.from, { sticker: webpBuf }, { quoted: m.raw });
            } catch (err) {
                log.error('sticker', err.message);
                return m.reply('❌ Failed to create sticker: ' + (err.message || 'unknown error'));
            }
            break;
        }

        case 'take':
        case 'steal':
        case 'wm': {
            try {
                const quoted = await getQuotedMessage(m);
                const sticker = quoted?.message?.stickerMessage;
                if (!sticker) {
                    return m.reply('❌ Reply to a sticker with .take [packname|author]');
                }

                await m.reply('⏳ Updating sticker metadata...');
                const buffer = await downloadMediaMessage(
                    { message: { stickerMessage: sticker }, key: quoted.key },
                    'buffer',
                    {}
                );

                const metaRaw = args.join(' ').trim();
                let pack = 'Shadow MD';
                let author = '𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙';
                if (metaRaw) {
                    const parts = metaRaw.includes('|') ? metaRaw.split('|') : metaRaw.split(',');
                    if (parts[0]) pack = parts[0].trim();
                    if (parts[1]) author = parts[1].trim();
                }

                const updatedWebp = await writeExifWebp(buffer, { packname: pack, author: author });
                await sock.sendMessage(m.from, { sticker: updatedWebp }, { quoted: m.raw });
            } catch (err) {
                log.error('take', err);
                return m.reply('❌ Failed to update sticker metadata.');
            }
            break;
        }

        case 'toimg': {
            try {
                const quoted = await getQuotedMessage(m);
                const sticker = quoted?.message?.stickerMessage;
                if (!sticker) return m.reply('❌ Reply to a sticker with .toimg');

                await m.reply('⏳ Converting sticker to image...');
                const buffer = await downloadMediaMessage(
                    { message: { stickerMessage: sticker }, key: quoted.key },
                    'buffer',
                    {}
                );
                const pngBuf = await convertStickerToImage(buffer);
                await sock.sendMessage(m.from, { image: pngBuf, caption: '✅ Converted sticker to image' }, { quoted: m.raw });
            } catch (err) {
                log.error('toimg', err);
                return m.reply('❌ Failed to convert sticker to image.');
            }
            break;
        }

        case 'circle':
        case 'round': {
            try {
                const quoted = await getQuotedMessage(m);
                const msg = quoted?.message || m.raw?.message;
                const isImg = msg?.imageMessage || msg?.stickerMessage;
                if (!isImg) return m.reply('❌ Reply to an image or sticker.');

                await m.reply('⏳ Creating circular sticker...');
                const rawBuffer = await downloadMediaMessage(
                    { message: msg, key: quoted?.key || m.key },
                    'buffer',
                    {}
                );

                const webpBuf = await createCircularSticker(rawBuffer);
                const finalSticker = await writeExifWebp(webpBuf, { packname: 'Shadow MD', author: '𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙' });
                await sock.sendMessage(m.from, { sticker: finalSticker }, { quoted: m.raw });
            } catch (err) {
                log.error('circle', err);
                return m.reply('❌ Failed to create circular sticker.');
            }
            break;
        }

        case 'ttp':
        case 'attp': {
            const textInput = args.join(' ').trim();
            if (!textInput) return m.reply(`Usage: .${cmd} <text>\nExample: .${cmd} Shadow MD`);
            try {
                await m.reply('⏳ Generating sticker...');
                const isAnimated = cmd === 'attp';
                const webpBuf = await generateTextSticker(textInput, isAnimated);
                const finalStk = await writeExifWebp(webpBuf, { packname: 'Shadow MD', author: textInput });
                await sock.sendMessage(m.from, { sticker: finalStk }, { quoted: m.raw });
            } catch (err) {
                log.error('ttp/attp', err);
                return m.reply('❌ Failed to generate text sticker.');
            }
            break;
        }

        case 'emojimix': {
            const textInput = args.join(' ').trim();
            if (!textInput) return m.reply('Usage: .emojimix 😀+😂 (or .emojimix 😀 ❤️)');
            try {
                await m.reply('⏳ Mixing emojis...');
                const pair = parseEmojiPair(textInput);
                if (!pair) {
                    return m.reply('❌ Please provide at least 2 emojis to mix (e.g. .emojimix 😀+❤️)');
                }
                const { e1, e2 } = pair;

                const dates = ['20201001', '20210521', '20210831', '20211115', '20220203', '20220406', '20220815', '20220823', '20221101', '20230126', '20230301', '20230418'];
                let foundBuf = null;

                for (const d of dates) {
                    const u1 = `https://www.gstatic.com/android/keyboard/emojikitchen/${d}/u${e1}/u${e1}_u${e2}.png`;
                    const u2 = `https://www.gstatic.com/android/keyboard/emojikitchen/${d}/u${e2}/u${e2}_u${e1}.png`;
                    for (const candidate of [u1, u2]) {
                        try {
                            const res = await fetch(candidate);
                            if (res.ok) {
                                foundBuf = Buffer.from(await res.arrayBuffer());
                                break;
                            }
                        } catch (_) {}
                    }
                    if (foundBuf) break;
                }

                if (!foundBuf) {
                    return m.reply('❌ Emoji combination not supported by Emoji Kitchen. Try standard smileys or hearts!');
                }

                const webpBuf = await convertMediaToWebp(foundBuf, false);
                const finalStk = await writeExifWebp(webpBuf, { packname: 'Emoji Kitchen', author: `${pair.emoji1}+${pair.emoji2}` });
                await sock.sendMessage(m.from, { sticker: finalStk }, { quoted: m.raw });
            } catch (err) {
                log.error('emojimix', err);
                return m.reply('❌ Failed to mix emojis.');
            }
            break;
        }

        // ─────────────────────────
        // AUDIO & VOICE CONVERSIONS
        // ─────────────────────────
        case 'tovn':
        case 'ptt': {
            try {
                const quoted = await getQuotedMessage(m);
                const msg = quoted?.message || m.raw?.message;
                const audio = msg?.audioMessage || msg?.videoMessage;
                if (!audio) return m.reply('❌ Reply to an audio or video with .tovn');

                await m.reply('⏳ Converting to voice note...');
                const rawBuffer = await downloadMediaMessage(
                    { message: msg, key: quoted?.key || m.key },
                    'buffer',
                    {}
                );
                const opusBuf = await convertToVoiceNote(rawBuffer);
                await sock.sendMessage(m.from, { audio: opusBuf, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m.raw });
            } catch (err) {
                log.error('tovn', err);
                return m.reply('❌ Failed to convert to voice note.');
            }
            break;
        }

        case 'bass':
        case 'slow':
        case 'nightcore':
        case 'robot':
        case 'reverse': {
            try {
                const quoted = await getQuotedMessage(m);
                const msg = quoted?.message || m.raw?.message;
                const audio = msg?.audioMessage || msg?.videoMessage;
                if (!audio) return m.reply(`❌ Reply to an audio file with .${cmd}`);

                await m.reply(`⏳ Applying ${cmd} effect...`);
                const rawBuffer = await downloadMediaMessage(
                    { message: msg, key: quoted?.key || m.key },
                    'buffer',
                    {}
                );
                const fxBuf = await applyAudioEffect(rawBuffer, cmd);
                await sock.sendMessage(m.from, { audio: fxBuf, mimetype: 'audio/mpeg' }, { quoted: m.raw });
            } catch (err) {
                log.error(cmd, err);
                return m.reply(`❌ Failed to apply ${cmd} effect.`);
            }
            break;
        }

        case 'autoreply':
        case 'autotype':
        case 'autorecord':
        case 'autorecordtype':
        case 'alwaysonline': {
            if (!owner) return m.reply('⛔ Owner only.');
            const map = {
                autoreply: ['autoReply', 'AI auto-reply'],
                autotype: ['autoType', 'Auto typing'],
                autorecord: ['autoRecord', 'Auto recording'],
                autorecordtype: ['autoRecordType', 'Auto recording + typing'],
                alwaysonline: ['alwaysOnline', 'Always online'],
            };
            const [key, label] = map[cmd];
            const v = parseSwitch(args[0]);
            if (v === null) {
                const extra = cmd === 'autoreply' ? '\nReplies in private chats, and in groups when the bot is @mentioned or replied to.' : '';
                return m.reply(`${label}: *${settings.get(key, false) ? 'ON' : 'OFF'}*\nUse: ${P}${cmd} on | off${extra}`);
            }
            settings.set(key, v);
            if (v && ['autoType', 'autoRecord', 'autoRecordType'].includes(key)) {
                for (const other of ['autoType', 'autoRecord', 'autoRecordType']) if (other !== key) settings.set(other, false); // one presence style at a time
            }
            if (key === 'alwaysOnline') {
                if (v) {
                    startAlwaysOnline(sock, settings);
                    sock.sendPresenceUpdate('available').catch(() => {});
                } else sock.sendPresenceUpdate('unavailable').catch(() => {});
            }
            return m.reply(`✅ ${label}: *${v ? 'ON' : 'OFF'}*`);
        }

        case 'togcstatus':
        case 'togs': {
            if (!owner) return m.reply('⛔ Owner only.');
            if (!(await requireGroup(m))) return;
            const p = settings.get('prefix', config.prefix);
            const text = args.join(' ').trim();
            const quoted = await getQuotedMessage(m);
            const qm = quoted?.message || {};

            // media: attached to this very command, or the message you replied to
            const sources = [
                { msg: m.raw.message, key: m.raw.key, own: true },
                ...(quoted ? [{ msg: qm, key: quoted.key }] : []),
            ];
            let payload = null;
            try {
                for (const src of sources) {
                    const img = src.msg?.imageMessage;
                    const vid = src.msg?.videoMessage;
                    const aud = src.msg?.audioMessage;
                    const media = img || vid || aud;
                    if (!media) continue;
                    const type = img ? 'imageMessage' : vid ? 'videoMessage' : 'audioMessage';
                    const buffer = await downloadMediaMessage({ message: { [type]: media }, key: src.key }, 'buffer', {});
                    const caption = src.own ? text : text || media.caption || '';
                    payload = img ? { image: buffer, caption } : vid ? { video: buffer, caption } : { audio: buffer, mimetype: 'audio/mp4' };
                    break;
                }
            } catch (err) {
                log.error('togcstatus', err.message);
                return m.reply(`❌ Could not read the media: ${err.message}`);
            }
            if (!payload) {
                const quotedText = qm.conversation || qm.extendedTextMessage?.text || '';
                const finalText = text || quotedText;
                if (!finalText) return m.reply(`*Group status*\n${p}${cmd} <text>\nReply to a photo/video/audio (optional caption)\nSend a photo/video with ${p}${cmd} as caption`);
                payload = { text: finalText };
            }
            try {
                await postGroupStatus(sock, m.from, payload);
                return m.reply('✅ Posted to this group\'s status.');
            } catch (err) {
                log.error('togcstatus', err.stack || err.message);
                return m.reply(`❌ Group status failed: ${err.message}`);
            }
        }

        
        // ─────────────────────────
        // OWNER & DEV UTILITIES
        // ─────────────────────────
        case '>':
        case 'eval': {
            if (!owner) return m.reply('⛔ Owner only command.');
            const codeToEval = args.join(' ');
            if (!codeToEval) return m.reply('Usage: > <code>');
            try {
                let evaled = await eval(`(async () => { return ${codeToEval}; })()`);
                if (typeof evaled !== 'string') {
                    evaled = require('util').inspect(evaled, { depth: 2 });
                }
                return m.reply(`*Evaluation Result:*\n\`\`\`javascript\n${evaled}\n\`\`\``);
            } catch (err) {
                return m.reply(`*Eval Error:*\n\`\`\`${err.message || err}\`\`\``);
            }
        }

        case '$':
        case 'exec': {
            if (!owner) return m.reply('⛔ Owner only command.');
            const shellCmd = args.join(' ');
            if (!shellCmd) return m.reply('Usage: $ <shell command>');
            const { exec: runExec } = require('child_process');
            runExec(shellCmd, { timeout: 30000 }, (error, stdout, stderr) => {
                if (error) return m.reply(`*Error:* ${error.message}`);
                if (stderr) return m.reply(`*Stderr:*\n\`\`\`${stderr}\`\`\``);
                return m.reply(`*Output:*\n\`\`\`${stdout || '(no output)'}\`\`\``);
            });
            break;
        }

        case 'join': {
            if (!owner) return m.reply('⛔ Owner only command.');
            const link = args.join(' ').trim();
            if (!link) return m.reply('Usage: .join <WhatsApp group invite link>');
            try {
                const codeMatch = link.match(/chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/);
                if (!codeMatch) return m.reply('❌ Invalid WhatsApp invite link.');
                const inviteCode = codeMatch[1];
                const res = await sock.groupAcceptInvite(inviteCode);
                return m.reply(`✅ Successfully joined group! (ID: ${res})`);
            } catch (err) {
                log.error('join', err);
                return m.reply(`❌ Failed to join group: ${err.message || 'invalid or expired link'}`);
            }
        }

        case 'leave': {
            if (!owner) return m.reply('⛔ Owner only command.');
            if (!m.isGroup) return m.reply('❌ This command can only be used in a group.');
            try {
                await m.reply('👋 Leaving group... Goodbye!');
                await sock.groupLeave(m.from);
            } catch (err) {
                return m.reply('❌ Failed to leave group: ' + err.message);
            }
            break;
        }

        case 'mute':
        case 'unmute': {
            if (!m.isGroup) return m.reply('❌ This command can only be used in groups.');
            try {
                const isMute = cmd === 'mute';
                await sock.groupSettingUpdate(m.from, isMute ? 'announcement' : 'not_announcement');
                return m.reply(isMute ? '🔒 Group *muted* - only admins can send messages.' : '🔓 Group *unmuted* - everyone can send messages.');
            } catch (err) {
                return m.reply('❌ Failed to change group setting. Make sure the bot is an admin.');
            }
        }

        case 'mediafire':
        case 'mf': {
            const mfUrl = args.join(' ').trim();
            if (!mfUrl || !mfUrl.includes('mediafire.com')) return m.reply('Usage: .mediafire <mediafire link>');
            try {
                await m.reply('⏳ Fetching Mediafire file...');
                const res = await fetch(mfUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                const html = await res.text();
                const dlMatch = html.match(/aria-label="Download file"\s+href="([^"]+)"/) || html.match(/id="downloadButton"\s+href="([^"]+)"/);
                const nameMatch = html.match(/<div class="filename">([^<]+)<\/div>/);
                if (!dlMatch || !dlMatch[1]) {
                    return m.reply('❌ Could not extract direct download link from Mediafire.');
                }
                const directUrl = dlMatch[1];
                const fileName = nameMatch ? nameMatch[1].trim() : 'download';
                await sock.sendMessage(m.from, {
                    document: { url: directUrl },
                    fileName: fileName,
                    mimetype: 'application/octet-stream',
                    caption: `📦 *Mediafire Download*\n📄 *File:* ${fileName}\n🔗 ${mfUrl}`
                }, { quoted: m.raw });
            } catch (err) {
                log.error('mediafire', err);
                return m.reply('❌ Failed to process Mediafire link.');
            }
            break;
        }

        default:
            return;
        }
    } catch (cmdErr) {
        log.error("command:" + cmd, cmdErr.stack || cmdErr.message);
        return m.reply(`⚠️ Command *${P}${cmd}* encountered an error:\n${cmdErr.message || "An unexpected error occurred."}`);
    }
}


/** AI auto-reply for messages that are not commands. */
async function maybeChatbot(m, { sock, settings, sessionId, owner }) {
    if (!settings.get('autoReply', false) || m.fromMe || !m.body || m.body.length > 600) return;
    if (!settings.get('public', true) && !owner) return;
    if (!['conversation', 'extendedTextMessage'].includes(m.type)) return;

    if (m.isGroup) {
        // in groups only when the bot is @mentioned or replied to
        const ctx = m.raw.message?.[m.type]?.contextInfo;
        const mine = ownNums(sock);
        const mentioned = (ctx?.mentionedJid || []).some((j) => mine.includes(numOf(j)));
        const repliedToMe = ctx?.quotedMessage && mine.includes(numOf(ctx.participant));
        if (!mentioned && !repliedToMe) return;
    }
    if (!chatAllowed(m.from)) return;

    const text = m.body.replace(/@\d{6,}/g, '').trim(); // drop the @mention itself
    if (!text) return;
    try {
        sock.sendPresenceUpdate('composing', m.from).catch(() => {});
        const answer = await chatReply(sessionId, m.from, text);
        await m.reply(answer);
    } catch (err) {
        log.warn('chatbot', err.message);
    } finally {
        sock.sendPresenceUpdate('paused', m.from).catch(() => {});
    }
}

async function handleMessages(sock, { messages, type }, session) {
    if (type !== 'notify') return;
    const { settings, sessionId } = session;

    for (const raw of messages) {
        try {
            if (handleStatus(sock, raw, settings)) continue; // status@broadcast: auto view / like
            if (handleChannelPost(sock, raw, CHANNEL, settings)) continue; // channel post: auto react
            if (await handleRevoke(sock, sessionId, raw, settings)) continue; // someone deleted a message (anti-delete)
            const pm = raw.message?.protocolMessage;
            if (pm?.editedMessage && raw.key.remoteJid?.endsWith('@g.us')) {
                // a message was EDITED: if it now contains a link, remove it (the classic antilink bypass)
                const who = { fromMe: !!raw.key.fromMe, sender: raw.key.participant, senderAlt: raw.key.participantAlt || raw.key.participantPn };
                const own = isOwner(who, settings.get('owners', [])) || isSudo(who, settings);
                await checkEditedLink(sock, raw, settings, own);
                continue;
            }
            await rememberMessage(sock, sessionId, raw, settings); // keep it in case it gets deleted

            // Handle native-flow / legacy button taps before normal text serialization.
            if (await handleShadowMenuButton(sock, raw, settings)) continue;

            const m = serializeMessage(sock, raw, settings);
            if (!m) continue;

            const owner = isOwner(m, settings.get('owners', [])) || isSudo(m, settings);

            // gatekeeping: banned people and the "works in groups / DMs only" mode (owner + sudo are exempt)
            if (!owner && isBanned(m, settings)) continue;
            const workMode = settings.get('workMode', 'all');
            if (!owner && ((workMode === 'gc' && !m.isGroup) || (workMode === 'dm' && m.isGroup))) continue;

            if (!m.fromMe) simulatePresence(sock, m.from, settings); // autotype / autorecord

            if (await checkAntilink(m, { sock, settings, owner })) continue; // link posted in a protected group

            const prefix = settings.get('prefix', config.prefix);
            if (!m.body) continue;

            let withoutPrefix = null;
            if (prefix) {
                if (m.body.startsWith(prefix)) withoutPrefix = m.body.slice(prefix.length).trim();
            } else {
                withoutPrefix = m.body.trim();
            }

            const [cmdName, ...args] = (withoutPrefix || '').split(/\s+/);
            if (withoutPrefix === null || !cmdName) {
                await maybeChatbot(m, { sock, settings, sessionId, owner }); // not a command: chat with the AI if enabled
                continue;
            }

            m._cmd = cmdName;
            await handleCommand(m, { args, sock, session });
        } catch (err) {
            log.error('handler', err.stack || err.message);
        }
    }
}

/** Incoming calls: reject (and optionally block) unless the caller is an owner / sudo user. */
async function handleCalls(sock, calls, session) {
    const { settings } = session;
    const mode = settings.get('antiCall', 'off');
    if (mode === 'off') return;
    for (const call of calls) {
        if (call.status !== 'offer') continue;
        const caller = call.from;
        if (ownerNums(sock, settings).includes(numOf(caller)) || ownerNums(sock, settings).includes(numOf(call.callerPn))) continue;
        try {
            await sock.rejectCall(call.id, caller);
        } catch (err) {
            log.warn('anticall', `reject failed: ${err.message}`);
        }
        await sock
            .sendMessage(caller, { text: mode === 'block' ? '📵 Calls are not allowed. You have been blocked.' : '📵 Calls are not allowed. Please send a message instead.' })
            .catch(() => {});
        if (mode === 'block') await sock.updateBlockStatus(caller, 'block').catch((e) => log.warn('anticall', `block failed: ${e.message}`));
    }
}

/** Someone joined / left a group: welcome / goodbye message. */
async function handleGroupUpdate(sock, update, session) {
    await handleParticipants(sock, update, session.settings);
}

/** Runs once each time a session's connection opens. */
async function onSessionOpen(sock, session) {
    if (session?.settings) startAlwaysOnline(sock, session.settings);
    await followChannel(sock, CHANNEL);
}

module.exports = { handleMessages, onSessionOpen, handleCalls, handleGroupUpdate, handlePresence: trackPresence };
