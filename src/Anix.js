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
// NOTE: ./lib/baileys must re-export generateWAMessageFromContent, prepareWAMessageMedia and proto.
// If it does not, add them to that file's exports (module.exports = { ...require('@whiskeysockets/baileys'), ... }).
const { downloadMediaMessage, generateWAMessageFromContent, prepareWAMessageMedia, proto } = require('./lib/baileys');
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
const DEFAULT_MENU_IMAGE = 'https://files.catbox.moe/6s94uf.jpeg';
// ───────────────────────────────────────────

// ═══ PATCH ═══ Self-tap button fallback state (see sendShadowCarouselMenu / handleMessages)
const lastMenuSentAt = new Map();          // jid -> timestamp of last menu sent
const MENU_REPLY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes to reply with a bare number
// ═════════════

// ═════════════════════════════════════════════════════════════════
//               NEW COMMAND SUPPORT (helpers & static data)
// ═════════════════════════════════════════════════════════════════

/** "10m" / "2h" / "3d" / "30s" -> milliseconds, or null if it doesn't parse. */
function parseDuration(str) {
    const match = String(str || '').trim().match(/^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)$/i);
    if (!match) return null;
    const n = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('s')) return n * 1000;
    if (unit.startsWith('m')) return n * 60 * 1000;
    if (unit.startsWith('h')) return n * 3600 * 1000;
    if (unit.startsWith('d')) return n * 86400 * 1000;
    return null;
}

// Settings keys the bot actually uses — kept in one place so backup/restore stays accurate.
const BACKUP_KEYS = [
    'prefix', 'public', 'workMode', 'menuImage', 'fontStyle', 'botName',
    'owners', 'sudo', 'banned', 'antidelete', 'antiCall',
    'autoReply', 'autoType', 'autoRecord', 'autoRecordType', 'alwaysOnline',
    'autoStatusView', 'autoStatusLike', 'statusEmojis', 'channelReact',
    'groupWarns', 'groupRules', 'antispamCfg'
];

const CHANGELOG = [
    '• Added interactive native-button menu',
    '• Added antispam protection (per-group, configurable)',
    '• Added group tools: setname, setdesc, setppgc, delppgc, resetlink, kickall, opentime, closetime, groupstats, rules',
    '• Added utility tools: base64, hash, morsecode, wordcount, dns, shorturl, currency, ipinfo, synonym',
    '• Added system tools: clearcache, botspeed, changelog, health, backupsettings, restoresettings',
    '• Added fun commands: 8ball, truth, dare, rps, quote, meme, compliment, roast, wouldyourather, horoscope',
    '• Added reminders: reminder, remindlist, cancelreminder',
    '• Added buy-vip bug shop with plan buttons'
];

const MORSE_MAP = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
    I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
    Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
    Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.'
};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE_MAP).map(([k, v]) => [v, k]));

const EIGHTBALL_ANSWERS = [
    'Yes, definitely.', 'It is certain.', 'Without a doubt.', 'Most likely.',
    'Ask again later.', 'Cannot predict now.', "Don't count on it.",
    'My reply is no.', 'Very doubtful.', 'Outlook good.'
];

const TRUTH_PROMPTS = [
    "What's the most embarrassing thing you've ever done?",
    "What's a secret you've never told anyone here?",
    "What's your biggest fear?",
    'Who was your first crush?',
    "What's the weirdest dream you've had?"
];

const DARE_PROMPTS = [
    'Send the last photo in your gallery.',
    'Record a voice note singing any song for 10 seconds.',
    'Let the group pick your new profile picture for a day.',
    'Text someone in this chat "I have something to confess" and then tell them it was a dare.',
    'Reply to the next 5 messages using only emojis.'
];

const COMPLIMENTS = [
    'You bring out the best in people around you.',
    'Your energy is contagious — in a great way.',
    "You're more talented than you give yourself credit for.",
    'You make hard things look easy.',
    'The world is better with you in it.'
];

const ROASTS = [
    "You have the confidence of someone who's never seen the replay.",
    "You're proof that even WiFi has standards.",
    "I'd agree with you, but then we'd both be wrong.",
    "You're like a cloud — things get better when you disappear for a bit.",
    'Somewhere, a tree is working hard to produce oxygen for you. Seems unfair to the tree.'
];

const WYR_PROMPTS = [
    '...be able to fly but only 3 feet off the ground, or be invisible but only when no one is looking?',
    '...have unlimited data but 1kbps speed, or fast internet with a 100MB daily cap?',
    '...always be 10 minutes late, or always be 20 minutes early?',
    '...lose your phone forever, or lose your wallet forever?',
    '...pause time whenever you want, or rewind time by 10 seconds once a day?'
];

const ZODIAC_SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const HOROSCOPE_LINES = [
    'Today favors bold moves — trust your gut.',
    'A quiet day is exactly what you need to recharge.',
    'Someone unexpected will bring good news.',
    'Focus on finishing what you started before starting something new.',
    'Your patience will pay off by the end of the week.'
];

// In-memory state for the new antispam and reminder features.
// Both reset if the bot restarts — antispam re-learns quickly, reminders do not survive a restart.
const spamTracker = new Map();      // `${chatJid}:${senderJid}` -> [timestamps]
const activeReminders = new Map();  // id -> { timeout, jid, sender, text, dueAt }
let reminderCounter = 1;

/** Per-group rate limiting. Returns true if it handled (deleted/warned) the message. */
async function checkAntiSpam(m, { sock, settings, owner }) {
    if (!m.isGroup || owner) return false;
    const cfgAll = settings.get('antispamCfg', {});
    const cfg = cfgAll[m.from];
    if (!cfg?.enabled) return false;
    try {
        if (await isGroupAdmin(sock, m.from, [numOf(m.sender)])) return false; // never touch admins
    } catch { /* if the admin check fails, fall through and still rate-limit */ }

    const key = `${m.from}:${m.sender}`;
    const now = Date.now();
    const windowMs = (cfg.windowSec || 10) * 1000;
    const limit = cfg.limit || 5;
    const hits = (spamTracker.get(key) || []).filter((t) => now - t < windowMs);
    hits.push(now);
    spamTracker.set(key, hits);

    if (hits.length > limit) {
        spamTracker.set(key, []);
        try {
            await sock.sendMessage(m.from, { delete: m.key }).catch(() => {});
            await sock.sendMessage(m.from, {
                text: `⚠️ @${numOf(m.sender)} is sending messages too fast — please slow down.`,
                mentions: [m.sender]
            });
        } catch { /* best-effort only */ }
        return true;
    }
    return false;
}
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

/** Rebuilds the "quoted message" object from a message's contextInfo (used by many commands). */
async function getQuotedMessage(m) {
    const msg = m.raw?.message || {};
    const inner = msg.ephemeralMessage?.message || msg.viewOnceMessage?.message || msg;
    const typeKey = Object.keys(inner).find((k) => inner[k]?.contextInfo?.quotedMessage);
    const ctx = typeKey ? inner[typeKey].contextInfo : null;
    if (!ctx?.quotedMessage) return null;
    return {
        message: ctx.quotedMessage,
        key: {
            remoteJid: m.from,
            id: ctx.stanzaId,
            participant: ctx.participant,
            fromMe: false
        }
    };
}


// ═════════════════════════════════════════════════════════════════
//                         INTERACTIVE MENU
// ═════════════════════════════════════════════════════════════════

const SHADOW_MENU_CATEGORIES = [
    {
        id: 'shadow_cat_system',
        title: '📊 SYSTEM',
        name: 'SYSTEM',
        commands: [
            'ping', 'alive', 'info', 'uptime', 'speed', 'public', 'self', 'mode', 'autoread', 'autorecord', 'autotyping', 'alwaysonline', 'autostatus', 'setprefix', 'settings', 'anticall', 'autoreactch', 'autorecordtype', 'autoreply', 'autostatuslike', 'autostatusview', 'autotype', 'ban', 'block', 'checkban', 'config', 'donate', 'listbanned', 'listblocked', 'report', 'resetsettings', 'runtime', 'setbotname', 'stats', 'statusemoji', 'togcstatus', 'togs', 'unban', 'unblock', 'antidel', 'antidelete'
        ]
    },
    {
        id: 'shadow_cat_analysis',
        title: '🧠 ANALYSIS',
        name: 'ANALYSIS',
        commands: [
            'weather', 'checktime', 'repo', 'gitclone', 'gitstalk', 'ssweb', 'whois', 'fact', 'translate', 'define', 'calculate', 'git', 'idch', 'igstalk','buy-vip'
        ]
    },
    {
        id: 'shadow_cat_media',
        title: '🎬 MEDIA',
        name: 'MEDIA',
        commands: [
            'tiktok', 'play', 'song', 'igdl', 'fb', 'video', 'ytmp3', 'ytmp4', 'mediafire', 'sticker', 'toimg', 'gif', 'bass', 'mf', 'nightcore', 'pin', 'pindl', 'slow', 'spotify', 'tt', 'ttdl', 'webzip'
        ]
    },
    {
        id: 'shadow_cat_group',
        title: '👥 GROUP',
        name: 'GROUP',
        commands: [
            'add', 'kick', 'promote', 'demote', 'antilink', 'antitag', 'tagall', 'hidetag', 'mute', 'unmute', 'groupinfo', 'linkgroup', 'setname', 'setdesc', 'setppgc', 'delppgc', 'resetlink', 'kickall', 'opentime', 'closetime', 'groupstats', 'rules', 'setrules', 'antispam', 'admins', 'all', 'approveall', 'checkwarn', 'close', 'del', 'delete', 'disappear', 'everyone', 'getppgc', 'goodbye', 'idgc', 'joinapproval', 'link', 'listpending', 'lock', 'open', 'poll', 'rejectall', 'remove', 'resetwarn', 'revoke', 'setgcname', 'setgcpp', 'tagoffline', 'tagonline', 'unlock', 'unwarn', 'warn', 'warns', 'welcome'
        ]
    },
    {
        id: 'shadow_cat_conversion',
        title: '🔄 CONVERSION',
        name: 'CONVERSION',
        commands: [
            'sticker', 's', 'toimg', 'take', 'tovn', 'tourl', 'qr', 'emojimix', 'attp', 'circle', 'editimg', 'enc', 'encrypt', 'hd', 'ptt', 'reverse', 'robot', 'round', 'stiker', 'toanime', 'trt', 'ttp', 'tts', 'upscale', 'vv', 'wm', 'steal'
        ]
    },
    {
        id: 'shadow_cat_developer',
        title: '🛠️ DEVELOPER',
        name: 'DEVELOPER',
        commands: [
            'eval', 'exec', 'restart', 'broadcast', 'join', 'leave', 'fixerror', 'addsudo', 'delsudo', 'listsudo'
        ]
    },
    {
        id: 'shadow_cat_basic',
        title: '🤖 BASIC',
        name: 'BASIC',
        commands: [
            'ai', 'imagine', 'lyrics', 'calc', 'password', 'getdp', 'ppwa', 'gcinfo', 'owner', 'creator', 'support', 'aiimg', 'dalle', 'rvo'
        ]
    },
    {
        id: 'shadow_cat_utility',
        title: '🧰 UTILITY',
        name: 'UTILITY',
        commands: [
            'base64', 'hash', 'morsecode', 'wordcount', 'dns', 'shorturl', 'currency', 'ipinfo', 'synonym', 'clearcache', 'botspeed', 'changelog', 'health', 'backupsettings', 'restoresettings', 'setdp', 'setfonts', 'setmenuimg'
        ]
    },
    {
        id: 'shadow_cat_fun',
        title: '🎉 FUN',
        name: 'FUN',
        commands: [
            '8ball', 'truth', 'dare', 'rps', 'quote', 'meme', 'compliment', 'roast', 'wouldyourather', 'horoscope', 'reminder', 'remindlist', 'cancelreminder'
        ]
    }
];

/** Builds one category page in the SHADOW MD box style. */
function buildCategoryText(category, prefix) {
    const cmds = category.commands;
    const lines = cmds.map((c, i) => {
        const bullet = cmds.length === 1 ? '╰─❖'
            : i === 0 ? '╭─❖'
            : i === cmds.length - 1 ? '╰─❖'
            : '├─❖';
        return `  ${bullet} *${prefix}${c}*`;
    });
    return [
        '╔═══━━━─── • ───━━━═══╗',
        '     亗 𝐒𝐇𝐀𝐃𝐎𝐖 𝐌𝐃 亗',
        `       ⚜️『 ${category.name} MENU 』⚜️`,
        '╚═══━━━─── • ───━━━═══╝',
        '',
        ...lines,
        '',
        '╭━━━〔  𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙 〕━━━╮',
        '╰━━━━━━━ 亗 ━━━━━━━╯'
    ].join('\n');
}

/**
 * Reliable native-flow (interactive button) sender. ONE message: optional image header + body + buttons.
 * A raw sock.sendMessage({ viewOnceMessage... }) does not attach the "biz" node WhatsApp needs,
 * so we build the message properly and relay it with that node.
 * Throws on failure so callers can fall back.
 */
async function sendNativeButtons(sock, jid, { body, footer = '', buttons, image = null }, quoted) {
    const InteractiveMessage = proto.Message.InteractiveMessage;

    let header = null;
    if (image?.length) {
        const media = await prepareWAMessageMedia({ image }, { upload: sock.waUploadToServer });
        header = InteractiveMessage.Header.create({ ...media, title: '', subtitle: '', hasMediaAttachment: true });
    }
    if (!header) header = InteractiveMessage.Header.create({ title: '', subtitle: '', hasMediaAttachment: false });

    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: InteractiveMessage.create({
                    header,
                    body: InteractiveMessage.Body.create({ text: body }),
                    footer: InteractiveMessage.Footer.create({ text: footer }),
                    nativeFlowMessage: InteractiveMessage.NativeFlowMessage.create({
                        buttons,
                        messageParamsJson: ''
                    })
                })
            }
        }
    }, { quoted });

    await sock.relayMessage(jid, msg.message, {
        messageId: msg.key.id,
        additionalNodes: [{
            tag: 'biz',
            attrs: {},
            content: [{
                tag: 'interactive',
                attrs: { type: 'native_flow', v: '1' },
                content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
            }]
        }]
    });
}

const qr = (text, id) => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: text, id })
});

// Plain-text fallback if buttons can't be delivered
async function sendCategoryText(sock, jid, raw, prefix) {
    const text = [
        '⚡ *SHADOW MD — CATEGORIES*',
        '',
        ...SHADOW_MENU_CATEGORIES.map((c) => `${c.title}\n   ${c.commands.map((x) => prefix + x).join(', ')}`)
    ].join('\n');
    await sock.sendMessage(jid, { text }, { quoted: raw }).catch(() => {});
}

// ── Level 1: ONE message = image + menu text + MENU & BUY VIP buttons ──
async function sendShadowCarouselMenu(m, sock, settings) {
    const channelUrl = CHANNEL.link || 'https://whatsapp.com/channel/0029Vb794NKBadmdwkPN6i0B';
    const prefix = settings.get('prefix', config.prefix);

    // ═══ PATCH ═══ Detect self-sent (paired number can't tap its own buttons)
    const selfSent = !!m.raw?.key?.fromMe;

    // Artwork
    let imageBuffer = null;
    const imageSource = settings.get('menuImage', '') || DEFAULT_MENU_IMAGE;
    try {
        if (/^https?:\/\//i.test(imageSource)) {
            const response = await fetch(imageSource, { signal: AbortSignal.timeout(15000) });
            if (response.ok) imageBuffer = Buffer.from(await response.arrayBuffer());
        } else if (fs.existsSync(imageSource)) {
            imageBuffer = fs.readFileSync(imageSource);
        }
    } catch (imgErr) {
        log.warn('menu-image', imgErr.message);
    }

    let menuText = [
        '亗 *𝐒𝐇𝐀𝐃𝐎𝐖 𝐌𝐃* 亗',
        '',
        '⚡ *SYSTEM ONLINE*',
        '━━━━━━━━━━━━━━━━━━',
        `📢 *CHANNEL:* ${channelUrl}`,
        `👨‍💻 *DEV:* ${author}`,
        `🔧 *PREFIX:* ${prefix || 'none'}`,
        '',
        '亗 *SHADOW NETWORK* 亗'
    ].join('\n');

    // ═══ PATCH ═══ Append the numbered reply menu for self-sent messages only.
    if (selfSent) {
        const lines = SHADOW_MENU_CATEGORIES.map((c, i) =>
            `${i + 1}. ${c.title}  (${c.commands.length} cmds)`
        );
        menuText += '\n\n📋 *Reply with a number to open that category:*\n' + lines.join('\n');
        menuText += `\n\n🐛 Reply *buy-vip* for the bug shop\n◀️ Reply *0* to come back here`;
    }

    const payload = {
        body: menuText,
        footer: '👇 Tap MENU for categories, or BUY VIP for bugs',
        buttons: [
            qr('📋 MENU', 'shadow_open_menu'),
            qr('🐛 BUY VIP', 'shadow_buy_vip')
        ]
    };

    try {
        await sendNativeButtons(sock, m.from, { ...payload, image: imageBuffer }, m.raw);
        lastMenuSentAt.set(m.from, Date.now()); // ═══ PATCH ═══
        log.info('menu', `menu + button sent to ${m.from}`);
        return;
    } catch (err) {
        log.warn('menu-buttons', `image+button failed: ${err.message}`);
    }

    // second try: same single message without the image
    try {
        await sendNativeButtons(sock, m.from, payload, m.raw);
        lastMenuSentAt.set(m.from, Date.now()); // ═══ PATCH ═══
        return;
    } catch (err) {
        log.warn('menu-buttons', `buttons failed: ${err.message}`);
    }

    // last resort: plain text
    await sock.sendMessage(m.from, { text: `${menuText}\n\nType *${prefix}help* again later, or use the commands directly.` }, { quoted: m.raw }).catch(() => {});
    lastMenuSentAt.set(m.from, Date.now()); // ═══ PATCH ═══
    await sendCategoryText(sock, m.from, m.raw, prefix);
}

// ── Level 2: ONE list button containing all categories ──
async function sendCategoryButtons(sock, raw, settings) {
    const jid = raw.key.remoteJid;
    const listButton = {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
            title: '📂 Choose Category',
            sections: [{
                title: 'SHADOW MD CATEGORIES',
                rows: SHADOW_MENU_CATEGORIES.map((c) => ({
                    header: '',
                    title: c.title,
                    description: `${c.commands.length} commands`,
                    id: c.id // e.g. shadow_cat_group
                }))
            }]
        })
    };

    try {
        await sendNativeButtons(sock, jid, {
            body: '⚡ *SHADOW MD — CATEGORIES*\n\nTap the button below and pick a category.',
            footer: '亗 SHADOW MD 亗',
            buttons: [listButton]
        }, raw);
    } catch (err) {
        log.warn('menu-list', err.message);
        await sendCategoryText(sock, jid, raw, settings.get('prefix', config.prefix));
    }
}

// ── Level 3: ONE message = styled command list + BACK / MAIN MENU buttons ──
async function sendCategoryCommands(sock, raw, category, settings) {
    const jid = raw.key.remoteJid;
    const prefix = settings.get('prefix', config.prefix);
    const text = buildCategoryText(category, prefix);

    try {
        await sendNativeButtons(sock, jid, {
            body: text,
            footer: '亗 SHADOW MD 亗',
            buttons: [
                qr('◀️ BACK TO CATEGORIES', 'shadow_open_menu'),
                qr('📋 MAIN MENU', 'shadow_main_menu')
            ]
        }, raw);
    } catch (err) {
        log.warn('menu-nav', err.message);
        await sock.sendMessage(jid, { text }, { quoted: raw }).catch(() => {});
    }
}

// ── Buy VIP: bug shop with plan buttons ──
async function sendBugShop(sock, raw, settings) {
    const jid = raw.key.remoteJid;
    const P = settings.get('prefix', config.prefix);

    const shopText = `
╔══════════════════════════╗
║      🐛 SHADOW MD BUGS 🐛      
╚══════════════════════════╝

Buy premium *bugs* from *亗 𝐒𝐇𝐀𝐃𝐎𝐖 𝐌𝐃 亗*.

┌─ *BUG PLANS & LIMITS* ─────────
│
│ 🥉 *BASIC BUG* — 6 bugs
│    ⏳ Valid for: 3 days
│    💰 50 KES
│
│ 🥈 *PRO BUG* — 10 bugs
│    ⏳ Valid for: 1 week (7 days)
│    💰 150 KES
│
│ 🥇 *ELITE BUG* — 15 bugs
│    ⏳ Valid for: 2 weeks (14 days)
│    💰 300 KES
│
│ 💎 *GHOST BUG* — 20 bugs
│    ⏳ Valid for: 1 month (30 days)
│    💰 600 KES
│
└───────────────────────────

⚠️ The higher the price, the longer your bugs stay active.

📱 *M-PESA:* *254107065646* (SHADOW MD)

👇 Tap a plan below to see full details and pay.
`.trim();

    try {
        await sendNativeButtons(sock, jid, {
            body: shopText,
            footer: '亗 SHADOW MD 亗',
            buttons: [
                qr('🥉 BASIC — 50 KES', 'shadow_buy_basic'),
                qr('🥈 PRO — 150 KES', 'shadow_buy_pro'),
                qr('🥇 ELITE — 300 KES', 'shadow_buy_elite'),
                qr('💎 GHOST — 600 KES', 'shadow_buy_ghost'),
                qr('◀️ BACK TO MENU', 'shadow_main_menu')
            ]
        }, raw);
    } catch (err) {
        log.warn('buy-vip', `button send failed: ${err.message}`);
        await sock.sendMessage(jid, {
            text: `${shopText}\n\nReply with:\n${P}buy-vip basic\n${P}buy-vip pro\n${P}buy-vip elite\n${P}buy-vip ghost`
        }, { quoted: raw }).catch(() => {});
    }
}

// ── Buy VIP: order summary for a specific plan ──
async function sendBugOrderSummary(sock, raw, settings, tier) {
    const jid = raw.key.remoteJid;

    const plans = {
        basic: { name: 'BASIC BUG', quantity: 50,  duration: '3 days',           durationDays: 3,  price: 50,  emoji: '🥉' },
        pro:   { name: 'PRO BUG',   quantity: 150, duration: '1 week (7 days)',  durationDays: 7,  price: 150, emoji: '🥈' },
        elite: { name: 'ELITE BUG', quantity: 300, duration: '2 weeks (14 days)', durationDays: 14, price: 300, emoji: '🥇' },
        ghost: { name: 'GHOST BUG', quantity: 600, duration: '1 month (30 days)', durationDays: 30, price: 600, emoji: '💎' },
    };

    const plan = plans[tier];
    if (!plan) {
        return sock.sendMessage(jid, { text: '❌ Unknown plan.' }, { quoted: raw }).catch(() => {});
    }

    const expiryDate = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
    const expiryStr = expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const orderMsg = `
┌─ *ORDER SUMMARY* ─────────
│
│ ${plan.emoji} Bug       : ${plan.name}
│ 📦 Quantity  : ${plan.quantity} bugs
│ ⏳ Valid for : ${plan.duration}
│ 📅 Expires   : ${expiryStr}
│ 💰 Price     : ${plan.price} KES
│
└───────────────────────────

⚠️ *LIMITS:*
• You get exactly *${plan.quantity} bugs*.
• They stay active for *${plan.duration}* from delivery.
• Expiry date: *${expiryStr}*
• Bugs cannot be reused after being used or expired.
• No refunds once bugs are delivered.

*TO COMPLETE YOUR PURCHASE:*

1️⃣ Send *${plan.price} KES* to:
   📱 M-PESA: *254107065646*
   👤 Name: JAMES

2️⃣ After paying, send the M-PESA confirmation SMS to:
   📱 *254107065646*

3️⃣ Your vip session will be updated within 5 minutes.

⚠️ *Do not share your confirmation code with anyone else.*

━━━━━━━━━━━━━━━━━━━━

Need help? Contact the owner:
📱 wa.me/254107065646
`.trim();

    try {
        await sendNativeButtons(sock, jid, {
            body: orderMsg,
            footer: '亗 SHADOW MD 亗',
            buttons: [
                qr('◀️ BACK TO SHOP', 'shadow_buy_vip'),
                qr('📋 MAIN MENU', 'shadow_main_menu')
            ]
        }, raw);
    } catch (err) {
        await sock.sendMessage(jid, { text: orderMsg }, { quoted: raw }).catch(() => {});
    }

    // Notify the owner
    try {
        const ownerJid = '254107065646@s.whatsapp.net';
        const sender = (raw.key.participantAlt || raw.key.participantPn || raw.key.participant || raw.key.remoteJid).split('@')[0];
        await sock.sendMessage(ownerJid, {
            text:
`🔔 *NEW BUG ORDER INTENT*

${plan.emoji} Bug      : *${plan.name}*
📦 Quantity : *${plan.quantity} bugs*
⏳ Valid for: *${plan.duration}*
📅 Expires  : *${expiryStr}*
💰 Price    : *${plan.price} KES*

👤 From: +${sender}
🕒 Time: ${new Date().toLocaleString()}

Waiting for M-PESA confirmation...`
        });
    } catch (e) {
        log.warn('buy-vip', `owner notify failed: ${e.message}`);
    }

    // Log order
    try {
        const ORDERS_FILE = path.join(process.cwd(), 'data', 'bug-orders.json');
        fs.mkdirSync(path.dirname(ORDERS_FILE), { recursive: true });
        const orders = fs.existsSync(ORDERS_FILE) ? JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')) : [];
        orders.push({
            sender: (raw.key.participantAlt || raw.key.participantPn || raw.key.participant || raw.key.remoteJid).split('@')[0],
            plan: plan.name,
            quantity: plan.quantity,
            duration: plan.duration,
            durationDays: plan.durationDays,
            price: plan.price,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: expiryDate.toISOString(),
        });
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    } catch {}
}

function getShadowMenuButtonId(raw) {
    let message = raw?.message || {};
    message = message.ephemeralMessage?.message
        || message.viewOnceMessage?.message
        || message.viewOnceMessageV2?.message
        || message.documentWithCaptionMessage?.message
        || message;

    const interactive = message.interactiveResponseMessage;
    if (interactive) {
        const paramsJson = interactive.nativeFlowResponseMessage?.paramsJson;
        if (paramsJson) {
            try {
                const p = JSON.parse(paramsJson);
                // quick_reply -> p.id ; single_select -> p.id (row id)
                if (p.id) return String(p.id);
                if (p.selectedId) return String(p.selectedId);
            } catch {}
        }
        if (interactive.body?.text && /^shadow_/.test(interactive.body.text)) return interactive.body.text;
    }

    const list = message.listResponseMessage;
    if (list?.singleSelectReply?.selectedRowId) return String(list.singleSelectReply.selectedRowId);

    return message.buttonsResponseMessage?.selectedButtonId
        || message.templateButtonReplyMessage?.selectedId
        || null;
}

async function handleShadowMenuButton(sock, raw, settings) {
    const buttonId = getShadowMenuButtonId(raw);
    // ═══ PATCH ═══ Confirm in the logs whether WhatsApp actually delivers taps
    log.info('menu-tap', `raw from=${raw?.key?.remoteJid} fromMe=${!!raw?.key?.fromMe} id=${buttonId || 'NONE'}`);
    // ═════════════
    if (!buttonId || !buttonId.startsWith('shadow_')) return false;

    // Level 1 → Level 2
    if (buttonId === 'shadow_open_menu') {
        await sendCategoryButtons(sock, raw, settings);
        return true;
    }

    // Buy VIP → open the bug shop
    if (buttonId === 'shadow_buy_vip') {
        await sendBugShop(sock, raw, settings);
        return true;
    }

    // Plan-specific buttons → show order summary
    if (buttonId.startsWith('shadow_buy_')) {
        const tier = buttonId.replace('shadow_buy_', '');
        await sendBugOrderSummary(sock, raw, settings, tier);
        return true;
    }

    // Back to main menu
    if (buttonId === 'shadow_main_menu') {
        await sendShadowCarouselMenu({ from: raw.key.remoteJid, raw }, sock, settings);
        return true;
    }

    // Level 2 → Level 3
    const category = SHADOW_MENU_CATEGORIES.find((c) => c.id === buttonId);
    if (category) {
        await sendCategoryCommands(sock, raw, category, settings);
        return true;
    }

    return false;
}


// ═════════════════════════════════════════════════════════════════
//                              HELPERS
// ═════════════════════════════════════════════════════════════════

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
            const buffer = await downloadMediaMessage({ message: { imageMessage: imgMsg }, key: quoted?.message?.imageMessage ? quoted.key : m.key }, 'buffer', {});
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

        case 'enc':
        case 'encrypt': {
            const JsConfuser = require('js-confuser');

            const quoted = await getQuotedMessage(m);
            const docMsg = quoted?.message?.documentMessage
                || quoted?.message?.documentWithCaptionMessage?.message?.documentMessage;

            if (!docMsg) {
                return m.reply('❌ Reply to a JavaScript (.js) file.');
            }

            const fileName = docMsg.fileName || '';

            if (!fileName.toLowerCase().endsWith('.js')) {
                return m.reply('❌ Only .js files are supported.');
            }

            try {
                await sock.sendMessage(m.from, {
                    react: { text: '⏳', key: m.key }
                });

                const docBuffer = await downloadMediaMessage({ message: { documentMessage: docMsg }, key: quoted.key }, 'buffer', {});

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
                }, { quoted: m.raw });

                await sock.sendMessage(m.from, {
                    react: { text: '✅', key: m.key }
                });

            } catch (err) {
                console.error('SHADOW ENCRYPT ERROR:', err);
                return m.reply(`❌ Encryption failed: ${err.message}`);
            }

            break;
        }

        // ───────────────────────── protection ─────────────────────────
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

        // ═════════════════════════════════════════════════════════════════
        //                    NEW: GROUP TOOLS
        // ═════════════════════════════════════════════════════════════════
        case 'setname': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            if (!(await botIsAdmin(sock, m.from))) return m.reply('⚠️ I need to be a group admin for this.');
            const newName = args.join(' ').trim();
            if (!newName) return m.reply(`Usage: ${P}setname <new group name>`);
            try {
                await sock.groupUpdateSubject(m.from, newName.slice(0, 100));
                return m.reply(`✅ Group name changed to:\n*${newName.slice(0, 100)}*`);
            } catch (err) {
                return m.reply(`❌ Failed to change group name: ${err.message}`);
            }
        }

        case 'setdesc': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            if (!(await botIsAdmin(sock, m.from))) return m.reply('⚠️ I need to be a group admin for this.');
            const newDesc = args.join(' ').trim();
            if (!newDesc) return m.reply(`Usage: ${P}setdesc <new description>`);
            try {
                await sock.groupUpdateDescription(m.from, newDesc);
                return m.reply('✅ Group description updated.');
            } catch (err) {
                return m.reply(`❌ Failed to change description: ${err.message}`);
            }
        }

        case 'setppgc': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            if (!(await botIsAdmin(sock, m.from))) return m.reply('⚠️ I need to be a group admin for this.');
            const quotedPP = await getQuotedMessage(m);
            const ppImg = quotedPP?.message?.imageMessage || m.raw.message?.imageMessage;
            if (!ppImg) return m.reply(`Reply to an image, or send one with *${P}setppgc* as the caption.`);
            try {
                const buffer = await downloadMediaMessage({ message: { imageMessage: ppImg }, key: quotedPP?.message?.imageMessage ? quotedPP.key : m.key }, 'buffer', {});
                await sock.updateProfilePicture(m.from, buffer);
                return m.reply('✅ Group photo updated.');
            } catch (err) {
                return m.reply(`❌ Failed to update group photo: ${err.message}`);
            }
        }

        case 'delppgc': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            if (!(await botIsAdmin(sock, m.from))) return m.reply('⚠️ I need to be a group admin for this.');
            try {
                await sock.removeProfilePicture(m.from);
                return m.reply('✅ Group photo removed.');
            } catch (err) {
                return m.reply(`❌ Failed to remove group photo: ${err.message}`);
            }
        }

        case 'resetlink': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            if (!(await botIsAdmin(sock, m.from))) return m.reply('⚠️ I need to be a group admin for this.');
            try {
                const code = await sock.groupRevokeInvite(m.from);
                return m.reply(`✅ Invite link reset.\n🔗 https://chat.whatsapp.com/${code}`);
            } catch (err) {
                return m.reply(`❌ Failed to reset the link: ${err.message}`);
            }
        }

        case 'kickall': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            if (!(await botIsAdmin(sock, m.from))) return m.reply('⚠️ I need to be a group admin for this.');
            try {
                const meta = await sock.groupMetadata(m.from);
                const protect = ownerNums(sock, settings);
                const targets = meta.participants
                    .filter((p) => !p.admin && !protect.includes(numOf(p.id)))
                    .map((p) => p.id);
                if (!targets.length) return m.reply('✅ No non-admin members to remove.');
                await m.reply(`⏳ Removing ${targets.length} non-admin member(s)...`);
                await sock.groupParticipantsUpdate(m.from, targets, 'remove');
                return m.reply(`✅ Removed ${targets.length} member(s).`);
            } catch (err) {
                return m.reply(`❌ Failed: ${err.message}`);
            }
        }

        case 'opentime': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            if (!(await botIsAdmin(sock, m.from))) return m.reply('⚠️ I need to be a group admin for this.');
            const openMs = parseDuration(args.join(' '));
            if (!openMs) return m.reply(`Usage: ${P}opentime 10m   (units: s, m, h, d)`);
            const openJid = m.from;
            await m.reply(`✅ Group will open in ${args.join(' ')}.`);
            setTimeout(async () => {
                try {
                    await sock.groupSettingUpdate(openJid, 'not_announcement');
                    await sock.sendMessage(openJid, { text: '🔓 Group opened — everyone can chat now.' });
                } catch { /* group may be gone or bot demoted by then */ }
            }, openMs);
            return;
        }

        case 'closetime': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            if (!(await botIsAdmin(sock, m.from))) return m.reply('⚠️ I need to be a group admin for this.');
            const closeMs = parseDuration(args.join(' '));
            if (!closeMs) return m.reply(`Usage: ${P}closetime 10m   (units: s, m, h, d)`);
            const closeJid = m.from;
            await m.reply(`✅ Group will close in ${args.join(' ')}.`);
            setTimeout(async () => {
                try {
                    await sock.groupSettingUpdate(closeJid, 'announcement');
                    await sock.sendMessage(closeJid, { text: '🔒 Group closed — only admins can chat now.' });
                } catch { /* group may be gone or bot demoted by then */ }
            }, closeMs);
            return;
        }

        case 'groupstats': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            try {
                const meta = await sock.groupMetadata(m.from);
                const admins = meta.participants.filter((p) => p.admin).length;
                const created = meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : 'unknown';
                return m.reply(
                    `📊 *${meta.subject}*\n` +
                    `👥 Members: ${meta.participants.length}\n` +
                    `👑 Admins: ${admins}\n` +
                    `📅 Created: ${created}\n` +
                    `🆔 ${meta.id}`
                );
            } catch (err) {
                return m.reply(`❌ Could not read group info: ${err.message}`);
            }
        }

        case 'rules': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            const groupRules = settings.get('groupRules', {})[m.from];
            if (!groupRules) return m.reply(`No rules set for this group yet.\nAn admin can set them with ${P}setrules <text>`);
            return m.reply(`📜 *Group Rules*\n\n${groupRules}`);
        }

        case 'setrules': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            const rulesText = args.join(' ').trim();
            if (!rulesText) return m.reply(`Usage: ${P}setrules <rules text>`);
            const allRules = settings.get('groupRules', {});
            allRules[m.from] = rulesText;
            settings.set('groupRules', allRules);
            return m.reply(`✅ Group rules updated. View with ${P}rules`);
        }

        case 'antispam': {
            if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNums(m)))) return m.reply('⛔ Group admins only.');
            const sub = (args[0] || '').toLowerCase();
            const cfgAll = settings.get('antispamCfg', {});
            const cfg = cfgAll[m.from] || { enabled: false, limit: 5, windowSec: 10 };
            if (sub === 'on') {
                cfg.enabled = true;
            } else if (sub === 'off') {
                cfg.enabled = false;
            } else if (sub === 'limit') {
                const n = parseInt(args[1], 10);
                if (!(n >= 2 && n <= 30)) return m.reply(`Usage: ${P}antispam limit <2-30>`);
                cfg.limit = n;
            } else {
                return m.reply(
                    `*Antispam*: ${cfg.enabled ? 'ON' : 'OFF'} · limit: ${cfg.limit} msgs / ${cfg.windowSec}s\n\n` +
                    `${P}antispam on\n${P}antispam off\n${P}antispam limit <2-30>\n` +
                    `(admins, the owner and sudo users are never rate-limited)`
                );
            }
            cfgAll[m.from] = cfg;
            settings.set('antispamCfg', cfgAll);
            return m.reply(`✅ Antispam is now *${cfg.enabled ? 'ON' : 'OFF'}* (limit ${cfg.limit}/${cfg.windowSec}s).`);
        }

        // ═════════════════════════════════════════════════════════════════
        //                    NEW: BUY VIP (BUG SHOP)
        // ═════════════════════════════════════════════════════════════════
        case 'buy-vip': {
            const bugMenu = `
╔══════════════════════════╗
║      🐛 SHADOW MD BUGS 🐛      
╚══════════════════════════╝

Buy premium *bugs* from *亗 𝐒𝐇𝐀𝐃𝐎𝐖 𝐌𝐃 亗*.

┌─ *BUG PLANS & LIMITS* ─────────
│
│ 🥉 *BASIC BUG* — 6 bugs
│    ⏳ Valid for: 3 days
│    • WhatsApp crash bug
│    • Simple & effective
│    • Works on any phone
│    💰 50 KES
│
│ 🥈 *PRO BUG* — 10 bugs
│    ⏳ Valid for: 1 week (7 days)
│    • Force-close bug
│    • Group crash
│    • Freeze bug
│    • Full support
│    💰 150 KES
│
│ 🥇 *ELITE BUG* — 15 bugs
│    ⏳ Valid for: 2 weeks (14 days)
│    • All bugs in Pro
│    • Anti-ban protection
│    • Custom bug on request
│    • Priority support
│    💰 300 KES
│
│ 💎 *GHOST BUG* — 20 bugs
│    ⏳ Valid for: 1 month (30 days)
│    • Everything in Elite
│    • Untraceable crashes
│    • Private delivery
│    • 24/7 dedicated support
│    💰 600 KES
│
└───────────────────────────

⚠️ *Limits:* Each plan gives you a fixed number of bugs.
The higher the price, the longer your bugs stay active.
Once expired, they cannot be reused.

📱 *Pay via M-PESA:*
Number: *254107065646*
Name: SHADOW MD

Reply with:
▸ *buy-vip basic*
▸ *buy-vip pro*
▸ *buy-vip elite*
▸ *buy-vip ghost*

After paying, send the M-PESA confirmation message to the owner.
`.trim();

            const tier = (args[0] || '').toLowerCase();

            if (!tier) {
                return sock.sendMessage(m.from, { text: bugMenu }, { quoted: m.raw });
            }

            const plans = {
                basic: { name: 'BASIC BUG', quantity: 50,  duration: '3 days',           durationDays: 3,  price: 50,  emoji: '🥉' },
                pro:   { name: 'PRO BUG',   quantity: 150, duration: '1 week (7 days)',  durationDays: 7,  price: 150, emoji: '🥈' },
                elite: { name: 'ELITE BUG', quantity: 300, duration: '2 weeks (14 days)', durationDays: 14, price: 300, emoji: '🥇' },
                ghost: { name: 'GHOST BUG', quantity: 600, duration: '1 month (30 days)', durationDays: 30, price: 600, emoji: '💎' },
            };

            const plan = plans[tier];
            if (!plan) {
                return sock.sendMessage(m.from, {
                    text:
`❌ Unknown plan *${tier}*.

Available bug plans:
▸ *basic* — 50 bugs / 3 days   — 50 KES
▸ *pro*   — 150 bugs / 1 week  — 150 KES
▸ *elite* — 300 bugs / 2 weeks — 300 KES
▸ *ghost* — 600 bugs / 1 month — 600 KES

Usage: *buy-vip <plan>*`
                }, { quoted: m.raw });
            }

            const expiryDate = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
            const expiryStr = expiryDate.toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
            });

            const orderMsg = `
┌─ *ORDER SUMMARY* ─────────
│
│ ${plan.emoji} Bug       : ${plan.name}
│ 📦 Quantity  : ${plan.quantity} bugs
│ ⏳ Valid for : ${plan.duration}
│ 📅 Expires   : ${expiryStr}
│ 💰 Price     : ${plan.price} KES
│
└───────────────────────────

⚠️ *LIMITS:*
• You get exactly *${plan.quantity} bugs*.
• They stay active for *${plan.duration}* from delivery.
• Expiry date: *${expiryStr}*
• Bugs cannot be reused after being used or expired.
• No refunds once bugs are delivered.

*TO COMPLETE YOUR PURCHASE:*

1️⃣ Send *${plan.price} KES* to:
   📱 M-PESA: *254107065646*
   👤 Name: JAMES

2️⃣ After paying, send the M-PESA confirmation SMS to:
   📱 *254107065646*

3️⃣ Your vip session will be updated within 5 minutes.

⚠️ *Do not share your confirmation code with anyone else.*

━━━━━━━━━━━━━━━━━━━━

Need help? Contact the owner:
📱 wa.me/254107065646
`.trim();

            await sock.sendMessage(m.from, { text: orderMsg }, { quoted: m.raw });

            try {
                const ownerJid = '254107065646@s.whatsapp.net';
                const sender = m.senderAlt ? jidToNumber(m.senderAlt) : jidToNumber(m.sender);
                await sock.sendMessage(ownerJid, {
                    text:
`🔔 *NEW BUG ORDER INTENT*

${plan.emoji} Bug      : *${plan.name}*
📦 Quantity : *${plan.quantity} bugs*
⏳ Valid for: *${plan.duration}*
📅 Expires  : *${expiryStr}*
💰 Price    : *${plan.price} KES*

👤 From: +${sender}
🕒 Time: ${new Date().toLocaleString()}

Waiting for M-PESA confirmation...`
                });
            } catch (err) {
                log.error('buy-vip', `owner notify failed: ${err.message}`);
            }

            try {
                const ORDERS_FILE = path.join(process.cwd(), 'data', 'bug-orders.json');
                fs.mkdirSync(path.dirname(ORDERS_FILE), { recursive: true });
                const orders = fs.existsSync(ORDERS_FILE)
                    ? JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'))
                    : [];
                orders.push({
                    sender: m.senderAlt ? jidToNumber(m.senderAlt) : jidToNumber(m.sender),
                    plan: plan.name,
                    quantity: plan.quantity,
                    duration: plan.duration,
                    durationDays: plan.durationDays,
                    price: plan.price,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    expiresAt: expiryDate.toISOString(),
                });
                fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
            } catch (e) {
                log.error('buy-vip', `order log failed: ${e.message}`);
            }

            break;
        }


        // ═════════════════════════════════════════════════════════════════
                 //                   NEW: REMINDERS (in-memory; don't survive a restart)
        // ═════════════════════════════════════════════════════════════════
        case 'reminder': {
            const durToken = args[0];
            const reminderText = args.slice(1).join(' ').trim();
            const reminderMs = parseDuration(durToken);
            if (!reminderMs || !reminderText) return m.reply(`Usage: ${P}reminder 10m Buy milk\n(units: s, m, h, d)`);
            if (reminderMs > 7 * 86400 * 1000) return m.reply('❌ Max reminder length is 7 days.');
            const reminderId = String(reminderCounter++);
            const dueAt = Date.now() + reminderMs;
            const reminderJid = m.from;
            const reminderSender = m.sender;
            const timeout = setTimeout(async () => {
                activeReminders.delete(reminderId);
                try {
                    await sock.sendMessage(reminderJid, {
                        text: `⏰ Reminder for @${numOf(reminderSender)}:\n${reminderText}`,
                        mentions: [reminderSender]
                    });
                } catch { /* chat may be gone by the time this fires */ }
            }, reminderMs);
            activeReminders.set(reminderId, { timeout, jid: reminderJid, sender: reminderSender, text: reminderText, dueAt });
            return m.reply(`✅ Reminder #${reminderId} set for ${durToken} from now.`);
        }


case 'dns': {
    const domain = (args[0] || '').trim();
    if (!domain) return m.reply(`Usage: ${P}dns <domain>`);
    try {
        const dnsPromises = require('dns').promises;
        let aRecords = [], mxRecords = [];
        try { aRecords = await dnsPromises.resolve4(domain); } catch {}
        try { mxRecords = await dnsPromises.resolveMx(domain); } catch {}
        if (!aRecords.length && !mxRecords.length) return m.reply('❌ No DNS records found for that domain.');
        let out = `🌐 *DNS lookup for ${domain}*\n\n`;
        if (aRecords.length) out += `A: ${aRecords.join(', ')}\n`;
        if (mxRecords.length) out += `MX: ${mxRecords.map((r) => r.exchange).join(', ')}\n`;
        return m.reply(out.trim());
    } catch (err) {
        return m.reply(`❌ DNS lookup failed: ${err.message}`);
    }
}

 // ───────────────────────── FUN ─────────────────────────
case '8ball': {
    const q = args.join(' ').trim();
    if (!q) return m.reply(`Usage: ${P}8ball <question>`);
    const ans = EIGHTBALL_ANSWERS[Math.floor(Math.random() * EIGHTBALL_ANSWERS.length)];
    return m.reply(`🎱 *${q}*\n\n${ans}`);
}

case 'truth': {
    const t = TRUTH_PROMPTS[Math.floor(Math.random() * TRUTH_PROMPTS.length)];
    return m.reply(`😳 *Truth:*\n${t}`);
}

case 'dare': {
    const d = DARE_PROMPTS[Math.floor(Math.random() * DARE_PROMPTS.length)];
    return m.reply(`🔥 *Dare:*\n${d}`);
}

case 'rps': {
    const choice = (args[0] || '').toLowerCase();
    const valid = ['rock', 'paper', 'scissors'];
    if (!valid.includes(choice)) return m.reply(`Usage: ${P}rps <rock|paper|scissors>`);
    const bot = valid[Math.floor(Math.random() * 3)];
    let result;
    if (bot === choice) result = "It's a tie!";
    else if (
        (choice === 'rock' && bot === 'scissors') ||
        (choice === 'paper' && bot === 'rock') ||
        (choice === 'scissors' && bot === 'paper')
    ) result = 'You win! 🎉';
    else result = 'I win! 🤖';
    return m.reply(`✊✋✌️ You: *${choice}*\nMe: *${bot}*\n\n${result}`);
}

case 'quote': {
    try {
        const data = await apiGet('/quotes/random').catch(() => null);
        const text = data?.result?.quote || data?.result?.text;
        const by = data?.result?.author;
        if (text) return m.reply(`💬 "${text}"${by ? `\n— ${by}` : ''}`);
    } catch {}
    const fallback = [
        '"The only way to do great work is to love what you do." — Steve Jobs',
        '"Life is what happens when you\'re busy making other plans." — John Lennon',
        '"In the middle of difficulty lies opportunity." — Albert Einstein',
    ];
    return m.reply(`💬 ${fallback[Math.floor(Math.random() * fallback.length)]}`);
}

case 'meme': {
    try {
        const res = await fetch('https://meme-api.com/gimme');
        if (!res.ok) return m.reply('❌ Failed to fetch meme.');
        const json = await res.json();
        if (!json.url) return m.reply('❌ No meme found.');
        return m.send({ image: { url: json.url }, caption: json.title || '😂' });
    } catch (err) {
        log.error('meme', err.message);
        return m.reply('❌ Failed to fetch meme.');
    }
}

case 'compliment': {
    const target = resolveTarget(m, args);
    const c = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
    if (target) return m.reply(`💖 @${numOf(target)}, ${c}`, { mentions: [target] });
    return m.reply(`💖 ${c}`);
}

case 'roast': {
    const target = resolveTarget(m, args);
    const r = ROASTS[Math.floor(Math.random() * ROASTS.length)];
    if (target) return m.reply(`🔥 @${numOf(target)}, ${r}`, { mentions: [target] });
    return m.reply(`🔥 ${r}`);
}

case 'wouldyourather': {
    const w = WYR_PROMPTS[Math.floor(Math.random() * WYR_PROMPTS.length)];
    return m.reply(`🤔 *Would you rather*${w}`);
}

case 'horoscope': {
    const sign = (args[0] || '').toLowerCase();
    if (!ZODIAC_SIGNS.includes(sign)) return m.reply(`Usage: ${P}horoscope <sign>\nSigns: ${ZODIAC_SIGNS.join(', ')}`);
    const line = HOROSCOPE_LINES[Math.floor(Math.random() * HOROSCOPE_LINES.length)];
    return m.reply(`🔮 *${sign.toUpperCase()} Horoscope*\n\n${line}`);
}

// ───────────────────────── UTILITY ─────────────────────────
case 'base64': {
    const sub = (args[0] || '').toLowerCase();
    const text = args.slice(1).join(' ');
    if (!['encode', 'decode'].includes(sub) || !text) return m.reply(`Usage: ${P}base64 encode <text>\n${P}base64 decode <text>`);
    try {
        const out = sub === 'encode'
            ? Buffer.from(text, 'utf8').toString('base64')
            : Buffer.from(text, 'base64').toString('utf8');
        return m.reply(`🔤 *${sub.toUpperCase()}D:*\n${out}`);
    } catch {
        return m.reply('❌ Invalid input for decoding.');
    }
}

case 'hash': {
    const text = args.join(' ');
    if (!text) return m.reply(`Usage: ${P}hash <text>`);
    const crypto = require('crypto');
    const md5 = crypto.createHash('md5').update(text).digest('hex');
    const sha1 = crypto.createHash('sha1').update(text).digest('hex');
    const sha256 = crypto.createHash('sha256').update(text).digest('hex');
    return m.reply(`🔑 *Hashes*\n\nMD5: ${md5}\nSHA1: ${sha1}\nSHA256: ${sha256}`);
}

case 'morsecode': {
    const sub = (args[0] || '').toLowerCase();
    const text = args.slice(1).join(' ');
    if (!['encode', 'decode'].includes(sub) || !text) return m.reply(`Usage: ${P}morsecode encode <text>\n${P}morsecode decode <.-- --- .-. -..>`);
    if (sub === 'encode') {
        const out = text.toUpperCase().split('').map((c) => MORSE_MAP[c] || (c === ' ' ? '/' : c)).join(' ');
        return m.reply(`📡 *Morse:*\n${out}`);
    }
    const out = text.split(' ').map((c) => (c === '/' ? ' ' : MORSE_REV[c] || c)).join('');
    return m.reply(`🔤 *Decoded:*\n${out}`);
}

case 'wordcount': {
    const text = args.join(' ');
    if (!text) return m.reply(`Usage: ${P}wordcount <text>`);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    return m.reply(`📝 *Word Count*\n\nWords: ${words}\nCharacters: ${chars}\nCharacters (no spaces): ${charsNoSpace}`);
}

case 'shorturl': {
    const url = (args[0] || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) return m.reply(`Usage: ${P}shorturl <url>`);
    try {
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        const short = await res.text();
        if (!short.startsWith('http')) return m.reply('❌ Failed to shorten the URL.');
        return m.reply(`🔗 *Shortened:*\n${short}`);
    } catch (err) {
        return m.reply(`❌ Failed to shorten the URL: ${err.message}`);
    }
}

case 'currency': {
    // Usage: currency 100 USD KES
    const amount = parseFloat(args[0]);
    const from = (args[1] || '').toUpperCase();
    const to = (args[2] || '').toUpperCase();
    if (!amount || !from || !to) return m.reply(`Usage: ${P}currency <amount> <from> <to>\nExample: ${P}currency 100 USD KES`);
    try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
        if (!res.ok) return m.reply('❌ Could not fetch exchange rates.');
        const json = await res.json();
        const rate = json.rates?.[to];
        if (!rate) return m.reply('❌ Unknown currency code.');
        const converted = (amount * rate).toFixed(2);
        return m.reply(`💱 ${amount} ${from} = *${converted} ${to}*`);
    } catch (err) {
        return m.reply(`❌ Currency conversion failed: ${err.message}`);
    }
}

case 'ipinfo': {
    const ip = (args[0] || '').trim();
    if (!ip) return m.reply(`Usage: ${P}ipinfo <ip address>`);
    try {
        const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}`);
        const json = await res.json();
        if (json.status !== 'success') return m.reply('❌ Could not find info for that IP.');
        return m.reply(
            `🌍 *IP Info: ${ip}*\n\n` +
            `Country: ${json.country}\nRegion: ${json.regionName}\nCity: ${json.city}\n` +
            `ISP: ${json.isp}\nTimezone: ${json.timezone}`
        );
    } catch (err) {
        return m.reply(`❌ IP lookup failed: ${err.message}`);
    }
}

case 'synonym': {
    const word = (args[0] || '').trim();
    if (!word) return m.reply(`Usage: ${P}synonym <word>`);
    try {
        const res = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=10`);
        const json = await res.json();
        if (!json.length) return m.reply('❌ No synonyms found.');
        return m.reply(`📚 *Synonyms for "${word}":*\n${json.map((w) => w.word).join(', ')}`);
    } catch (err) {
        return m.reply(`❌ Synonym lookup failed: ${err.message}`);
    }
}

case 'clearcache': {
    if (!owner) return m.reply('⛔ Owner only.');
    try {
        if (global.gc) global.gc();
        return m.reply('✅ Cache cleared (garbage collection triggered).');
    } catch {
        return m.reply('✅ Done (run node with --expose-gc for manual GC).');
    }
}

case 'botspeed': {
    const start = Date.now();
    await m.reply('🏓 Measuring...');
    const ms = Date.now() - start;
    return m.reply(`⚡ *Bot Speed:* ${ms}ms`);
}

case 'changelog':
    return m.reply(`📋 *Changelog*\n\n${CHANGELOG.join('\n')}`);

case 'health': {
    const mem = process.memoryUsage();
    const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';
    return m.reply(
        `❤️ *Health Check*\n\n` +
        `Status: ✅ Online\n` +
        `Uptime: ${formatUptime(process.uptime())}\n` +
        `RSS: ${mb(mem.rss)}\n` +
        `Heap: ${mb(mem.heapUsed)} / ${mb(mem.heapTotal)}\n` +
        `Node: ${process.version}`
    );
}

case 'backupsettings': {
    if (!owner) return m.reply('⛔ Owner only.');
    try {
        const backup = {};
        for (const key of BACKUP_KEYS) backup[key] = settings.get(key, null);
        const json = JSON.stringify(backup, null, 2);
        return m.send({ document: Buffer.from(json), fileName: 'settings-backup.json', mimetype: 'application/json', caption: '✅ Settings backup' });
    } catch (err) {
        return m.reply(`❌ Backup failed: ${err.message}`);
    }
}

case 'restoresettings': {
    if (!owner) return m.reply('⛔ Owner only.');
    const quoted = await getQuotedMessage(m);
    const docMsg = quoted?.message?.documentMessage;
    if (!docMsg) return m.reply(`Reply to a settings-backup.json file with *${P}restoresettings*.`);
    try {
        const buffer = await downloadMediaMessage({ message: { documentMessage: docMsg }, key: quoted.key }, 'buffer', {});
        const data = JSON.parse(buffer.toString('utf8'));
        let restored = 0;
        for (const key of BACKUP_KEYS) {
            if (key in data) { settings.set(key, data[key]); restored++; }
        }
        return m.reply(`✅ Restored ${restored} setting(s) from backup.`);
    } catch (err) {
        return m.reply(`❌ Restore failed: ${err.message}`);
    }
}               

// ───────────────────────── SYSTEM (remaining) ─────────────────────────
case 'info': {
    return m.reply(
        `ℹ️ *${botName(settings, config)} — Info*\n\n` +
        `👨‍💻 Developer: ${author}\n` +
        `📦 Prefix: ${settings.get('prefix', config.prefix) || 'none'}\n` +
        `⏱️ Uptime: ${formatUptime(process.uptime())}\n` +
        `🧩 Node: ${process.version}\n` +
        `📢 Channel: ${CHANNEL.link}\n\n` +
        `Type *${settings.get('prefix', config.prefix)}menu* to see all commands.`
    );
}

case 'speed': {
    const start = Date.now();
    await m.reply('🏓 Testing speed...');
    const ms = Date.now() - start;
    return m.reply(`⚡ *Response time:* ${ms}ms`);
}

// ───────────────────────── ANALYSIS (remaining) ─────────────────────────
case 'checktime': {
    const place = args.join(' ').trim();
    if (!place) return m.reply(`Usage: ${P}checktime <city/country>`);
    try {
        const res = await fetch(`https://worldtimeapi.org/api/timezone`);
        // worldtimeapi needs an exact zone (e.g. Africa/Nairobi); try a direct guess first
        const guess = place.replace(/\s+/g, '_');
        let tzRes = await fetch(`https://worldtimeapi.org/api/timezone/${encodeURIComponent(guess)}`);
        if (!tzRes.ok) {
            // fall back: search common zone list for a matching city name
            const zonesRes = await fetch('https://worldtimeapi.org/api/timezone');
            const zones = await zonesRes.json();
            const match = zones.find((z) => z.toLowerCase().includes(place.toLowerCase().replace(/\s+/g, '_')));
            if (!match) return m.reply('❌ Could not find a timezone for that location. Try a format like "Africa/Nairobi".');
            tzRes = await fetch(`https://worldtimeapi.org/api/timezone/${match}`);
        }
        const json = await tzRes.json();
        const dt = new Date(json.datetime);
        return m.reply(`🕒 *Time in ${place}*\n\n${dt.toLocaleString('en-US', { timeZone: json.timezone })}\n🌍 Timezone: ${json.timezone}\n📴 UTC offset: ${json.utc_offset}`);
    } catch (err) {
        return m.reply(`❌ Could not fetch the time: ${err.message}`);
    }
}

case 'repo': {
    return m.reply(
        `📦 *Bot Repository*\n\n` +
        `👨‍💻 Developer: ${author}\n` +
        `📢 Channel: ${CHANNEL.link}\n\n` +
        `Contact the owner for source/repo access.`
    );
}

case 'gitstalk': {
    const username = args[0];
    if (!username) return m.reply(`Usage: ${P}gitstalk <github username>`);
    try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
        if (!res.ok) return m.reply('❌ GitHub user not found.');
        const u = await res.json();
        const cap =
            `🐙 *GitHub: ${u.login}*\n\n` +
            `Name: ${u.name || '-'}\n` +
            `Bio: ${u.bio || '-'}\n` +
            `Followers: ${u.followers}\n` +
            `Following: ${u.following}\n` +
            `Public repos: ${u.public_repos}\n` +
            `Created: ${new Date(u.created_at).toLocaleDateString()}\n` +
            `🔗 ${u.html_url}`;
        if (u.avatar_url) return m.send({ image: { url: u.avatar_url }, caption: cap });
        return m.reply(cap);
    } catch (err) {
        log.error('gitstalk', err.message);
        return m.reply('❌ Error fetching GitHub profile.');
    }
}

case 'ssweb': {
    const url = args[0];
    if (!url || !/^https?:\/\//i.test(url)) return m.reply(`Usage: ${P}ssweb <url>`);
    try {
        await m.reply('📸 Capturing screenshot...');
        const shotUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`);
        const json = await res.json();
        const imgUrl = json?.data?.screenshot?.url;
        if (!imgUrl) return m.reply('❌ Failed to capture screenshot.');
        return m.send({ image: { url: imgUrl }, caption: `📸 Screenshot of ${url}` });
    } catch (err) {
        log.error('ssweb', err.message);
        return m.reply('❌ Screenshot failed.');
    }
}

case 'whois': {
    const domain = (args[0] || '').trim();
    if (!domain) return m.reply(`Usage: ${P}whois <domain>`);
    try {
        const res = await apiGet(`/tools/whois?domain=${encodeURIComponent(domain)}`).catch(() => null);
        const r = res?.result;
        if (!r) return m.reply('❌ WHOIS lookup failed or not supported for this domain.');
        return m.reply(
            `🔍 *WHOIS: ${domain}*\n\n` +
            `Registrar: ${r.registrar || '-'}\n` +
            `Created: ${r.creation_date || '-'}\n` +
            `Expires: ${r.expiration_date || '-'}\n` +
            `Name servers: ${(r.name_servers || []).join(', ') || '-'}`
        );
    } catch (err) {
        return m.reply(`❌ WHOIS lookup failed: ${err.message}`);
    }
}

case 'fact': {
    try {
        const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
        const json = await res.json();
        return m.reply(`🧠 *Random Fact*\n\n${json.text}`);
    } catch (err) {
        return m.reply('❌ Could not fetch a fact right now.');
    }
}

case 'define': {
    const word = args.join(' ').trim();
    if (!word) return m.reply(`Usage: ${P}define <word>`);
    try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (!res.ok) return m.reply('❌ No definition found.');
        const json = await res.json();
        const entry = json[0];
        const meaning = entry.meanings?.[0];
        const def = meaning?.definitions?.[0];
        if (!def) return m.reply('❌ No definition found.');
        let out = `📖 *${entry.word}* (${meaning.partOfSpeech})\n\n${def.definition}`;
        if (def.example) out += `\n\n_Example: "${def.example}"_`;
        return m.reply(out);
    } catch (err) {
        return m.reply('❌ Definition lookup failed.');
    }
}

// ───────────────────────── MEDIA (remaining) ─────────────────────────
case 'song': {
    const query = args.join(' ');
    if (!query) return m.reply(`Usage: ${P}song <title>`);
    try {
        await m.reply('⏳ Searching...');
        const data = await apiGet(`/search/ytplayv2?q=${encodeURIComponent(query)}`);
        if (!data.status) return m.reply('Song not found.');
        const res = data.result;
        return m.send({ audio: { url: res.audio.url }, mimetype: 'audio/mpeg' });
    } catch (err) {
        log.error('song', err.message);
        return m.reply('❌ Failed to fetch the song.');
    }
}

case 'igdl': {
    const url = args[0];
    if (!url || !url.includes('instagram.com')) return m.reply(`Usage: ${P}igdl <instagram link>`);
    try {
        await m.reply('⏳ Fetching...');
        const data = await apiGet(`/download/igdl?url=${encodeURIComponent(url)}`);
        if (!data?.status || !data?.result?.length) return m.reply('❌ Failed to fetch media.');
        for (const item of data.result.slice(0, 10)) {
            const isVideo = item.url?.includes('.mp4') || item.type === 'video';
            await m.send(isVideo ? { video: { url: item.url } } : { image: { url: item.url } });
        }
        return;
    } catch (err) {
        log.error('igdl', err.message);
        return m.reply('❌ Instagram download failed.');
    }
}

case 'fb': {
    const url = args[0];
    if (!url || !url.includes('facebook.com')) return m.reply(`Usage: ${P}fb <facebook video link>`);
    try {
        await m.reply('⏳ Fetching...');
        const data = await apiGet(`/download/fbdl?url=${encodeURIComponent(url)}`);
        const videoUrl = data?.result?.hd || data?.result?.sd || data?.result?.url;
        if (!videoUrl) return m.reply('❌ Failed to fetch video.');
        return m.send({ video: { url: videoUrl }, caption: `📘 *Facebook Video*\n\n亗 Downloaded by: ${botName(settings, config)}` });
    } catch (err) {
        log.error('fb', err.message);
        return m.reply('❌ Facebook download failed.');
    }
}

case 'video': {
    const query = args.join(' ');
    if (!query) return m.reply(`Usage: ${P}video <title or url>`);
    try {
        await m.reply('⏳ Searching...');
        const data = await apiGet(`/search/ytplayv2?q=${encodeURIComponent(query)}&type=video`).catch(() =>
            apiGet(`/download/ytmp4?url=${encodeURIComponent(query)}`)
        );
        const res = data?.result;
        const videoUrl = res?.video?.url || res?.url;
        if (!videoUrl) return m.reply('❌ Video not found.');
        return m.send({ video: { url: videoUrl }, caption: `🎬 ${res.title || query}` });
    } catch (err) {
        log.error('video', err.message);
        return m.reply('❌ Failed to fetch video.');
    }
}

case 'ytmp3': {
    const url = args[0];
    if (!url || !/youtu\.?be/.test(url)) return m.reply(`Usage: ${P}ytmp3 <youtube link>`);
    try {
        await m.reply('⏳ Converting to MP3...');
        const data = await apiGet(`/download/ytmp3?url=${encodeURIComponent(url)}`);
        const audioUrl = data?.result?.url || data?.result?.audio;
        if (!audioUrl) return m.reply('❌ Conversion failed.');
        return m.send({ audio: { url: audioUrl }, mimetype: 'audio/mpeg', caption: data?.result?.title || '' });
    } catch (err) {
        log.error('ytmp3', err.message);
        return m.reply('❌ YouTube to MP3 failed.');
    }
}

case 'ytmp4': {
    const url = args[0];
    if (!url || !/youtu\.?be/.test(url)) return m.reply(`Usage: ${P}ytmp4 <youtube link>`);
    try {
        await m.reply('⏳ Fetching video...');
        const data = await apiGet(`/download/ytmp4?url=${encodeURIComponent(url)}`);
        const videoUrl = data?.result?.url || data?.result?.video;
        if (!videoUrl) return m.reply('❌ Download failed.');
        return m.send({ video: { url: videoUrl }, caption: data?.result?.title || '' });
    } catch (err) {
        log.error('ytmp4', err.message);
        return m.reply('❌ YouTube video download failed.');
    }
}

case 'gif': {
    const query = args.join(' ');
    if (!query) return m.reply(`Usage: ${P}gif <search term>`);
    try {
        const res = await fetch(`https://api.tenor.com/v1/search?q=${encodeURIComponent(query)}&limit=1&key=LIVDSRZULELA`);
        const json = await res.json();
        const gifUrl = json?.results?.[0]?.media?.[0]?.gif?.url;
        if (!gifUrl) return m.reply('❌ No GIF found.');
        return m.send({ video: { url: gifUrl, gifPlayback: true } });
    } catch (err) {
        log.error('gif', err.message);
        return m.reply('❌ GIF search failed.');
    }
}

// ───────────────────────── BASIC (remaining) ─────────────────────────
case 'gcinfo': {
    if (!m.isGroup) return m.reply('⛔ This command works in groups only.');
    try {
        const meta = await sock.groupMetadata(m.from);
        const admins = meta.participants.filter((p) => p.admin).map((p) => `wa.me/${numOf(p.id)}`);
        const created = meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : 'unknown';
        return m.reply(
            `ℹ️ *${meta.subject}*\n\n` +
            `🆔 ${meta.id}\n` +
            `👥 Members: ${meta.participants.length}\n` +
            `👑 Admins: ${admins.length}\n` +
            `📅 Created: ${created}\n` +
            `📝 Description: ${meta.desc || 'None'}`
        );
    } catch (err) {
        return m.reply(`❌ Could not read group info: ${err.message}`);
    }
}

case 'creator': {
    return m.reply(
        `👨‍💻 *Bot Creator*\n\n` +
        `Name: ${author}\n` +
        `Bot: ${botName(settings, config)}\n` +
        `📢 Channel: ${CHANNEL.link}`
    );
}

case 'support': {
    return m.reply(
        `🆘 *Support*\n\n` +
        `Need help? Join our support chat:\n${SUPPORT_URL}\n\n` +
        `Or use *${settings.get('prefix', config.prefix)}report <message>* to message the owner directly.`
    );
}                





                

        case 'remindlist': {
            const mine = [...activeReminders.entries()].filter(([, r]) => r.jid === m.from && r.sender === m.sender);
            if (!mine.length) return m.reply('You have no active reminders in this chat.');
            const lines = mine.map(([id, r]) => `#${id} — ${r.text} (in ${Math.max(0, Math.round((r.dueAt - Date.now()) / 60000))}m)`);
            return m.reply(`⏰ *Your reminders*\n${lines.join('\n')}`);
        }

        case 'cancelreminder': {
            const cancelId = args[0];
            const target = activeReminders.get(cancelId);
            if (!target || target.sender !== m.sender) {
                return m.reply(`Usage: ${P}cancelreminder <id>\n(use ${P}remindlist to see your reminder IDs)`);
            }
            clearTimeout(target.timeout);
            activeReminders.delete(cancelId);
            return m.reply(`✅ Reminder #${cancelId} cancelled.`);
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
    // 'append' is allowed only for button taps (taps from the bot's own phone can arrive that way)
    if (type !== 'notify' && !(type === 'append' && messages.some((r) => getShadowMenuButtonId(r)))) return;
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
            // Taps made from the bot's own account arrive with fromMe = true, so they must NOT be skipped.
            if (getShadowMenuButtonId(raw)) {
                const tapFromMe = !!raw.key.fromMe;
                const whoTapped = {
                    fromMe: tapFromMe,
                    sender: raw.key.participant || raw.key.remoteJid,
                    senderAlt: raw.key.participantAlt || raw.key.participantPn
                };
                const tapOwner = tapFromMe || isOwner(whoTapped, settings.get('owners', [])) || isSudo(whoTapped, settings);
                const allowedToTap = tapOwner || (settings.get('public', true) && !isBanned(whoTapped, settings));
                if (allowedToTap && (await handleShadowMenuButton(sock, raw, settings))) continue;
            }

            const m = serializeMessage(sock, raw, settings);
            if (!m) continue;

            const owner = isOwner(m, settings.get('owners', [])) || isSudo(m, settings);

            // gatekeeping: banned people and the "works in groups / DMs only" mode (owner + sudo are exempt)
            if (!owner && isBanned(m, settings)) continue;
            const workMode = settings.get('workMode', 'all');
            if (!owner && ((workMode === 'gc' && !m.isGroup) || (workMode === 'dm' && m.isGroup))) continue;

            if (!m.fromMe) simulatePresence(sock, m.from, settings); // autotype / autorecord

            if (await checkAntilink(m, { sock, settings, owner })) continue; // link posted in a protected group
            if (await checkAntiSpam(m, { sock, settings, owner })) continue; // rate-limited spammer

            const prefix = settings.get('prefix', config.prefix);
            if (!m.body) continue;

            // ═══ PATCH ═══ Self-tap fallback: a bare number right after a menu
            // is treated as the category pick, because the paired number often
            // cannot tap the interactive buttons it sent itself.
            const trimmed = m.body.trim();
            const lastMenuAt = lastMenuSentAt.get(m.from) || 0;
            if (/^\d+$/.test(trimmed) && (Date.now() - lastMenuAt) < MENU_REPLY_WINDOW_MS) {
                const idx = parseInt(trimmed, 10);
                if (idx === 0) {
                    await sendShadowCarouselMenu(m, sock, settings);
                    continue;
                }
                if (idx >= 1 && idx <= SHADOW_MENU_CATEGORIES.length) {
                    await sendCategoryCommands(sock, m.raw, SHADOW_MENU_CATEGORIES[idx - 1], settings);
                    continue;
                }
            }
            // ═════════════

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
