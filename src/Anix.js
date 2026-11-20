/*
╔══════════════════════════╗
║             𓆩 BASE TELE X WA 𓆪   
║             ⚡ DEVELOPER CREDITS ⚡      
║          ᴅᴇᴠᴇʟᴏᴘᴇʀ : ᴊᴀᴍᴇsᴍᴏᴅᴢ  
║          ᴛᴇᴀᴍ      : james Inc 
║  © 2026 JAMESMODZ — ALL RIGHTS RESERVED 
╚════════════════════════╝
*/
const fs = require('fs');
const path = require('path');
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
const autochat = require('./lib/autochat');

// ──────────────── EDIT HERE ────────────────
const CHANNEL = {
    link: 'https://whatsapp.com/channel/0029Vb794NKBadmdwkPN6i0B',
    jid: '',
    emojis: ['❤️', '🔥', '😍', '💯', '👏'],
};
const CHANNEL_BUTTON_URL = 'https://whatsapp.com/channel/0029Vb794NKBadmdwkPN6i0B';
const SUPPORT_URL = 'https://chat.whatsapp.com/';
const DEFAULT_MENU_IMAGE = 'https://files.catbox.moe/uqr56d.jpeg';
const BOT_DISPLAY = '么 𝐒𝚳𝚰𝐋𝚵 𝐏𝐑𝐈𝐌𝐄 𝚳𝐃 么';
const BOT_PLAIN   = '么 SMILE PRIME MD 么';
// ───────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════
//               NEW COMMAND SUPPORT (helpers & static data)
// ═════════════════════════════════════════════════════════════════
// ─── extra text effects ───
const EPHOTO = {
    neon:        'https://en.ephoto360.com/create-colorful-neon-light-text-effects-online-797.html',
    metallic:    'https://en.ephoto360.com/impressive-decorative-3d-metal-text-effect-798.html',
    ice:         'https://en.ephoto360.com/ice-text-effect-online-101.html',
    snow:        'https://en.ephoto360.com/create-a-snow-3d-text-effect-free-online-621.html',
    impressive:  'https://en.ephoto360.com/create-3d-colorful-paint-text-effect-online-801.html',
    noel:        'https://en.ephoto360.com/noel-text-effect-online-99.html',
    water:       'https://en.ephoto360.com/create-water-effect-text-online-295.html',
    matrixlogo:  'https://en.ephoto360.com/matrix-text-effect-154.html',
    light:       'https://en.ephoto360.com/light-text-effect-futuristic-technology-style-648.html',
    silver:      'https://en.ephoto360.com/create-glossy-silver-3d-text-effect-online-802.html',
    devil:       'https://en.ephoto360.com/neon-devil-wings-text-effect-online-683.html',
    typography:  'https://en.ephoto360.com/create-typography-text-effect-on-pavement-online-774.html',
    purple:      'https://en.ephoto360.com/purple-text-effect-online-100.html',
    thunder:     'https://en.ephoto360.com/thunder-text-effect-online-97.html',
    leaves:      'https://en.ephoto360.com/green-brush-text-effect-typography-maker-online-153.html',
    '1917':      'https://en.ephoto360.com/1917-style-text-effect-523.html',
    arena:       'https://en.ephoto360.com/create-cover-arena-of-valor-by-mastering-360.html',
    hacker:      'https://en.ephoto360.com/create-anonymous-hacker-avatars-cyan-neon-677.html',
    sand:        'https://en.ephoto360.com/write-names-and-messages-on-the-sand-online-582.html',
    dragonball:  'https://en.ephoto360.com/create-dragon-ball-style-text-effects-online-809.html',
    naruto:      'https://en.ephoto360.com/naruto-shippuden-logo-style-text-effect-online-808.html',
    graffiti:    'https://en.ephoto360.com/create-a-cartoon-style-graffiti-text-effect-online-668.html',
    cat:         'https://en.ephoto360.com/handwritten-text-on-foggy-glass-online-680.html',
    gold:        'https://en.ephoto360.com/modern-gold-4-213.html',
    child:       'https://en.ephoto360.com/write-text-on-wet-glass-online-589.html',
fire:       'https://en.ephoto360.com/flame-lettering-effect-372.html',
galaxy:     'https://en.ephoto360.com/galaxy-text-effect-641.html',
rainbow:    'https://en.ephoto360.com/rainbow-text-effect-online-101.html',
horror:     'https://en.ephoto360.com/horror-text-effect-285.html',
stone:      'https://en.ephoto360.com/stone-text-effect-246.html',
birthday:   'https://en.ephoto360.com/create-colorful-birthday-text-effect-online-703.html',
christmas:  'https://en.ephoto360.com/christmas-text-effect-online-100.html',
halloween:  'https://en.ephoto360.com/halloween-text-effect-online-101.html',
valentine:  'https://en.ephoto360.com/valentine-s-day-text-effect-online-99.html'
};







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

const BACKUP_KEYS = [
    'prefix', 'public', 'workMode', 'menuImage', 'fontStyle', 'botName',
    'owners', 'sudo', 'banned', 'antidelete', 'antiCall',
    'autoReply', 'autoType', 'autoRecord', 'autoRecordType', 'alwaysOnline',
    'autoStatusView', 'autoStatusLike', 'statusEmojis', 'channelReact',
    'groupWarns', 'groupRules', 'antispamCfg'
];

const CHANGELOG = [
    '• Rebranded to 么 𝐒𝚳𝚰𝐋𝚵 𝐏𝐑𝐈𝐌𝐄 𝚳𝐃 么',
    '• New default menu image',
    '• Numbered-reply menu, with a single Channel button on every page',
    '• Buy VIP bug shop removed',
    '• Category pages now include the menu image',
    '• Added antispam protection (per-group, configurable)',
    '• Added group tools: setname, setdesc, setppgc, delppgc, resetlink, kickall, opentime, closetime, groupstats, rules',
    '• Added utility tools: base64, hash, morsecode, wordcount, dns, shorturl, currency, ipinfo, synonym',
    '• Added system tools: clearcache, botspeed, changelog, health, backupsettings, restoresettings',
    '• Added fun commands: 8ball, truth, dare, rps, quote, meme, compliment, roast, wouldyourather, horoscope',
    '• Added reminders: reminder, remindlist, cancelreminder',
    '• Added autochat (AI auto-reply) with mode control',
    '• Fixed: chatbot reply when message is not a command',
    '• Added handleMessages export for session.js'
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

const spamTracker = new Map();
const activeReminders = new Map();
let reminderCounter = 1;

async function checkAntiSpam(m, { sock, settings, owner }) {
    if (!m.isGroup || owner) return false;
    const cfgAll = settings.get('antispamCfg', {});
    const cfg = cfgAll[m.from];
    if (!cfg?.enabled) return false;
    try {
        if (await isGroupAdmin(sock, m.from, [numOf(m.sender)])) return false;
    } catch { }

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
        } catch { }
        return true;
    }
    return false;
}

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
//         MENU  (numbered reply + one Channel button on every page)
// ═════════════════════════════════════════════════════════════════

const SHADOW_MENU_CATEGORIES = [
    {
        title: '📊 SYSTEM',
        name: 'SYSTEM',
        commands: [
            'ping', 'alive', 'info', 'uptime', 'speed', 'public', 'self', 'mode', 'autoread', 'autorecord', 'autotyping', 'alwaysonline', 'autostatus', 'setprefix', 'settings', 'anticall', 'autoreactch', 'autorecordtype', 'autoreply', 'autostatuslike', 'autostatusview', 'autotype', 'ban', 'block', 'checkban', 'config', 'donate', 'listbanned', 'listblocked', 'report', 'resetsettings', 'runtime', 'setbotname', 'stats', 'statusemoji', 'togcstatus', 'togs', 'unban', 'unblock', 'antidel', 'antidelete', 'update', 'chatbot', 'autochat'
        ]
    },
    {
        title: '🧠 ANALYSIS',
        name: 'ANALYSIS',
        commands: [
            'weather', 'checktime', 'repo', 'gitclone', 'gitstalk', 'ssweb', 'whois', 'fact', 'translate', 'define', 'calculate', 'git', 'idch', 'igstalk'
        ]
    },
    {
        title: '🎬 MEDIA',
        name: 'MEDIA',
        commands: [
            'tiktok', 'play', 'song', 'igdl', 'fb', 'video', 'ytmp3', 'ytmp4', 'mediafire', 'sticker', 'toimg', 'gif', 'bass', 'mf', 'nightcore', 'pin', 'pindl', 'slow', 'spotify', 'tt', 'ttdl', 'webzip'
        ]
    },
    {
        title: '👥 GROUP',
        name: 'GROUP',
        commands: [
            'add', 'kick', 'promote', 'demote', 'antilink', 'antitag', 'tagall', 'hidetag', 'mute', 'unmute', 'groupinfo', 'linkgroup', 'setname', 'setdesc', 'setppgc', 'delppgc', 'resetlink', 'kickall', 'opentime', 'closetime', 'groupstats', 'rules', 'setrules', 'antispam', 'admins', 'all', 'approveall', 'checkwarn', 'close', 'del', 'delete', 'disappear', 'everyone', 'getppgc', 'goodbye', 'idgc', 'joinapproval', 'link', 'listpending', 'lock', 'open', 'poll', 'rejectall', 'remove', 'resetwarn', 'revoke', 'setgcname', 'setgcpp', 'tagoffline', 'tagonline', 'unlock', 'unwarn', 'warn', 'warns', 'welcome'
        ]
    },
    {
        title: '🔄 CONVERSION',
        name: 'CONVERSION',
        commands: [
            'sticker', 's', 'toimg', 'take', 'tovn', 'tourl', 'qr', 'emojimix', 'attp', 'circle', 'editimg', 'enc', 'encrypt', 'hd', 'ptt', 'reverse', 'robot', 'round', 'stiker', 'toanime', 'trt', 'ttp', 'tts', 'upscale', 'vv', 'wm', 'steal'
        ]
    },
    {
        title: '🛠️ DEVELOPER',
        name: 'DEVELOPER',
        commands: [
            'eval', 'exec', 'restart', 'broadcast', 'join', 'leave', 'fixerror', 'addsudo', 'delsudo', 'listsudo', 'getcase', 'showsource', 'src'
        ]
    },
    {
        title: '🤖 BASIC',
        name: 'BASIC',
        commands: [
            'ai', 'imagine', 'lyrics', 'calc', 'password', 'getdp', 'ppwa', 'gcinfo', 'owner', 'creator', 'support', 'aiimg', 'dalle', 'rvo'
        ]
    },
    {
        title: '🧰 UTILITY',
        name: 'UTILITY',
        commands: [
            'base64', 'hash', 'morsecode', 'wordcount', 'dns', 'shorturl', 'currency', 'ipinfo', 'synonym', 'clearcache', 'botspeed', 'changelog', 'health', 'backupsettings', 'restoresettings', 'setdp', 'setfonts', 'setmenuimg'
        ]
    },
    {
        title: '🌐 WEB & NETWORK',
        name: 'WEB',
        commands: [
            'dns', 'whois', 'ip', 'myip', 'pinghost', 'portscan', 'headers',
            'httpstatus', 'redirect', 'robots', 'sitemap', 'ssl', 'cert',
            'cors', 'nslookup', 'traceroute', 'httpget', 'httphead', 'speedtest'
        ]
    },
    {
        title: '🎉 FUN',
        name: 'FUN',
        commands: [
            '8ball', 'truth', 'dare', 'rps', 'quote', 'meme', 'compliment', 'roast', 'wouldyourather', 'horoscope', 'reminder', 'remindlist', 'cancelreminder'
        ]
    }
];

const menuState = new Map();
const MENU_WINDOW_MS = 5 * 60 * 1000;

async function loadMenuImage(settings) {
    const source = settings.get('menuImage', '') || DEFAULT_MENU_IMAGE;
    try {
        if (/^https?:\/\//i.test(source)) {
            const res = await fetch(source, { signal: AbortSignal.timeout(15000) });
            if (res.ok) return Buffer.from(await res.arrayBuffer());
        } else if (fs.existsSync(source)) {
            return fs.readFileSync(source);
        }
    } catch (err) {
        log.warn('menu-image', err.message);
    }
    return null;
}

function buildMainMenuText(settings) {
    const prefix = settings.get('prefix', config.prefix);
    const cleanBotName = BOT_DISPLAY.replace(/^么\s*/, '').replace(/\s*么$/, '');
    const totalCmds = SHADOW_MENU_CATEGORIES.reduce((s, c) => s + c.commands.length, 0);
    const categoryLines = SHADOW_MENU_CATEGORIES.map((c, i) => {
        const num = String(i + 1).padStart(2, '0');
        return `┃ ${num}  ${c.title}  ·  ${c.commands.length}`;
    });

    return [
        `╭═══〘 *${cleanBotName}* 〙═══╮`,
        '┃✫╭═─────────────────═╮',
        `┃✬│ Dev     : ${author}`,
        `┃✫│ Prefix  : ${prefix || 'none'}`,
        `┃✫│ Edition : PRIME`,
        `┃✯│ Status  : ONLINE`,
        `┃✬│ Cmds    : ${totalCmds}`,
        '┃✫│═════════════════════',
        `┃✬│ ${cleanBotName}`,
        '┃✫│═════════════════════',
        '╰══──────────────────══╯',
        '',
        '●════ 〘 *CATEGORIES* 〙═──═●',
        '╭══───────◇───────══╮',
        ...categoryLines,
        '╰══───────◇───────══╯',
        '',
        '●════ 〘 *HOW TO USE* 〙═──═●',
        '╭══───────◇───────══╮',
        `┃ ✧ Reply with a number (1–${SHADOW_MENU_CATEGORIES.length})`,
        '┃ ✧ Type 0 to close menu',
        `┃ ✧ Example: ${prefix || ''}ping`,
        '╰══───────◇───────══╯',
        '',
        '么 *𝐒𝚳𝚰𝐋𝚵 𝐌𝚯𝐃𝐙* 么'
    ].join('\n');
}

function buildCategoryText(category, prefix) {
    const cleanBotName = BOT_DISPLAY.replace(/^么\s*/, '').replace(/\s*么$/, '');
    const cmds = category.commands;
    const totalCmds = cmds.length;
    const lines = cmds.map((c, i) => {
        const bullet = totalCmds === 1 ? '╰─❖'
            : i === 0 ? '╭─❖'
            : i === totalCmds - 1 ? '╰─❖'
            : '├─❖';
        return `  ${bullet} *${prefix}${c}*`;
    });

    return [
        `╭═══〘 *${cleanBotName}* 〙═══╮`,
        '┃✫╭═─────────────────═╮',
        `┃✬│ Dev     : ${author}`,
        `┃✫│ Prefix  : ${prefix || 'none'}`,
        `┃✫│ Edition : PRIME`,
        `┃✯│ Status  : ONLINE`,
        `┃✬│ Cmds    : ${totalCmds}`,
        '┃✫│═════════════════════',
        `┃✬│ ${cleanBotName}`,
        '┃✫│═════════════════════',
        '╰══──────────────────══╯',
        `●════ 〘 ${category.name} 〙═──═●`,
        '',
        '╭══───────◇───────══╮',
        ...lines.map(l => '┃' + l),
        '╰══───────◇───────══╯',
        '',
        '么 *𝐒𝚳𝚰𝐋𝚵 𝐏𝐑𝐈𝚳𝚵 𝚳𝐃* 么'
    ].join('\n');
}

async function sendChannelButton(sock, jid, { text, imageBuffer }, quoted) {
    const InteractiveMessage = proto.Message.InteractiveMessage;
    let header = null;
    if (imageBuffer?.length) {
        const media = await prepareWAMessageMedia({ image: imageBuffer }, { upload: sock.waUploadToServer });
        header = InteractiveMessage.Header.create({ ...media, title: '', subtitle: '', hasMediaAttachment: true });
    }
    if (!header) header = InteractiveMessage.Header.create({ title: '', subtitle: '', hasMediaAttachment: false });

    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: InteractiveMessage.create({
                    header,
                    body: InteractiveMessage.Body.create({ text }),
                    footer: InteractiveMessage.Footer.create({ text: BOT_PLAIN }),
                    nativeFlowMessage: InteractiveMessage.NativeFlowMessage.create({
                        buttons: [
                            {
                                name: 'cta_url',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '📢 Channel',
                                    url: CHANNEL_BUTTON_URL,
                                    merchant_url: CHANNEL_BUTTON_URL
                                })
                            }
                        ],
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

async function sendMainMenu(m, sock, settings) {
    const imageBuffer = await loadMenuImage(settings);
    const text = buildMainMenuText(settings);
    try {
        await sendChannelButton(sock, m.from, { text, imageBuffer }, m.raw);
    } catch (err) {
        log.warn('menu', `button send failed, falling back: ${err.message}`);
        const payload = imageBuffer ? { image: imageBuffer, caption: text } : { text };
        await sock.sendMessage(m.from, payload, { quoted: m.raw }).catch(() => {});
    }
    menuState.set(m.from, { step: 'main', at: Date.now() });
    log.info('menu', `main menu sent to ${m.from}`);
}

async function sendCategoryPage(m, sock, settings, index) {
    const category = SHADOW_MENU_CATEGORIES[index];
    if (!category) return;
    const prefix = settings.get('prefix', config.prefix);
    const imageBuffer = await loadMenuImage(settings);
    const text = buildCategoryText(category, prefix);
    try {
        await sendChannelButton(sock, m.from, { text, imageBuffer }, m.raw);
    } catch (err) {
        log.warn('menu', `button send failed, falling back: ${err.message}`);
        const payload = imageBuffer ? { image: imageBuffer, caption: text } : { text };
        await sock.sendMessage(m.from, payload, { quoted: m.raw }).catch(() => {});
    }
    menuState.set(m.from, { step: index, at: Date.now() });
}

// ═════════════════════════════════════════════════════════════════
//                              HELPERS
// ═════════════════════════════════════════════════════════════════

function parseSwitch(arg) {
    const a = String(arg || '').toLowerCase();
    if (['on', 'true', 'yes', 'enable', '1'].includes(a)) return true;
    if (['off', 'false', 'no', 'disable', '0'].includes(a)) return false;
    return null;
}
const senderNumsOf = (jid) => [numOf(jid)];

// ═════════════════════════════════════════════════════════════════
//           MESSAGE HANDLER — what session.js calls
// ═════════════════════════════════════════════════════════════════
async function handleMessages(sock, upsert, { sessionId, settings }) {
    const { messages, type } = upsert;
    if (type !== 'notify') return;

    for (const msg of messages) {
        if (!msg?.message) continue;

        try {
            const m = serializeMessage(msg, sock, { sessionId, settings });
            if (!m) continue;

            if (m.key?.fromMe) continue;

            const banned = (settings.get('banned', []) || []).includes(numOf(m.sender));
            if (banned) continue;

            const owners = settings.get('owners', []);
            const owner = isOwner(m, owners) || isSudo(m, settings);
            const isPublic = settings.get('public', true);
            if (!isPublic && !owner) continue;

            if (m.isGroup) {
                try {
                    const blocked = await checkAntiSpam(m, { sock, settings, owner });
                    if (blocked) continue;
                } catch (e) { log.warn('antispam', e.message); }
                try {
                    await checkAntilink(m, { sock, settings });
                } catch (e) { log.warn('antilink', e.message); }
            }

            if (m._cmd) {
                await handleCommand(m, { args: m.args || [], sock, session: { settings, sessionId } });
                continue;
            }

            try {
                await autochat.handle(m, { sock, session: { settings, sessionId }, settings });
            } catch (e) {
                log.warn('autochat', e.message);
            }
        } catch (e) {
            log.error('handleMessages', e.stack || e.message);
        }
    }
}

async function onSessionOpen(sock, { sessionId, settings }) {
    try {
        if (settings.get('alwaysOnline')) startAlwaysOnline(sock);
        if (settings.get('channelReact')) {
            try { await followChannel(sock, settings); } catch {}
        }
        log.success(`session:${sessionId}`, 'session open tasks complete');
    } catch (e) {
        log.warn(`session:${sessionId}`, `onSessionOpen: ${e.message}`);
    }
}

async function handleGroupUpdate(sock, update, { sessionId, settings }) {
    try {
        await handleParticipants(sock, update, { sessionId, settings });
    } catch (e) {
        log.warn('groupUpdate', e.message);
    }
}

function handlePresence(sock, update) {
    try { trackPresence(sock, update); } catch {}
}

async function handleCalls(sock, calls, { sessionId, settings }) {
    try {
        const mode = settings.get('antiCall', 'off');
        if (mode === 'off') return;
        for (const call of calls) {
            if (call.status !== 'offer') continue;
            try { await sock.rejectCall(call.id, call.from); } catch {}
            if (mode === 'block') {
                try { await sock.updateBlockStatus(call.from, 'block'); } catch {}
            }
        }
    } catch (e) {
        log.warn('antiCall', e.message);
    }
}

// ═════════════════════════════════════════════════════════════════
//                       COMMAND DISPATCHER
// ═════════════════════════════════════════════════════════════════
async function handleCommand(m, { args, sock, session }) {
    m.chat = m.from;
    const isGroup = !!m.isGroup;
    const { settings, sessionId } = session;
    const cmd = (m._cmd || '').toLowerCase();
    const owners = settings.get('owners', []);
    const owner = isOwner(m, owners) || isSudo(m, settings);
    const P = settings.get('prefix', config.prefix);
    const isPublic = settings.get('public', true);

    log.command(`[${sessionId}] wa.me/${jidToNumber(m.sender)}`, `${settings.get('prefix', config.prefix)}${cmd}`);

    if (!isPublic && !owner) return;

    if (GROUP_CMDS.has(cmd)) return runGroupCommand(cmd, m, { sock, settings, owner, args, P, getQuotedMessage });

    try {
        switch (cmd) {
        case 'menu':
        case 'help':
            return sendMainMenu(m, sock, settings);

        // ───────────────────────── group moderation & tools ─────────────────────────
      case 'neon':
case 'metallic':
case 'ice':
case 'snow':
case 'impressive':
case 'noel':
case 'water':
case 'matrixlogo':
case 'light':
case 'silver':
case 'silva':
case 'devil':
case 'typography':
case 'purple':
case 'thunder':
case 'leaves':
case '1917':
case 'arena':
case 'hacker':
case 'sand':
case 'dragonball':
case 'naruto':
case 'graffiti':
case 'cat':
case 'gold':
case 'fire':          // ← new
case 'galaxy':        // ← new
case 'rainbow':       // ← new
case 'horror':        // ← new
case 'stone':         // ← new
case 'birthday':      // ← new
case 'christmas':     // ← new
case 'halloween':     // ← new
case 'valentine':     // ← new
case 'child': {
    const logoText = args.join(' ').trim();
    if (!logoText) return m.reply(`Usage: ${P}${cmd} <text>`);
    if (logoText.length > 50) return m.reply('❌ Max 50 characters.');

    const key = cmd === 'matrixlogo' ? 'matrix' : (cmd === 'silva' ? 'silver' : cmd);
    const url = EPHOTO[key];
    if (!url) return m.reply('❌ Unknown logo style.');

    await m.react('🎨');
    try {
        const mumaker = require('mumaker');
        const result = await mumaker.ephoto(url, logoText);
        if (!result?.image) return m.reply('❌ Generation failed.');
        return m.send({ image: { url: result.image }, caption: `🎨 ${key.toUpperCase()} · ${botName(settings, config)}` });
    } catch (err) {
        log.error('logo', `${key}: ${err.message}`);
        return m.reply(`❌ Failed: ${err.message}`);
    }
}
  
        
        
        
        
        
        
        
        
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
                const caption = `🎬 *TikTok Video*\n\n📌 *Title:* ${title || 'No Title'}\n👤 *Author:* ${ttAuthor?.nickname || 'Unknown'} (@${ttAuthor?.unique_id || ''})\n⏱️ *Duration:* ${duration || 0}s\n\n么 *Downloaded by:* ${botName(settings, config)}`;
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
                    caption: `📦 *Repository:* ${user}/${cleanRepo}\n🔗 https://github.com/${user}/${cleanRepo}\n\n么 *Downloaded by:* ${botName(settings, config)}`,
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
                    caption: `🎨 *Prompt:* ${prompt}\n\n么 *Generated by:* ${botName(settings, config)}`,
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
                const ans = await autochat.reply(sessionId, `ai:${m.sender}`, question, { skipCooldown: true });
                if (!ans) {
                    await m.react('❌');
                    return m.reply('❌ AI unavailable, try again shortly.');
                }
                await m.react('✅');
                return m.reply(`🤖 *AI Assistant*\n\n${ans}`);
            } catch (err) {
                await m.react('❌');
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
                `• AI auto-reply: ${on(settings.get('autoReply'))}   (${P}chatbot)`,
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
                            return m.reply(`🌤️ *Weather in ${city.toUpperCase()}*\n\n📍 ${text}\n\n么 *Provided by:* ${botName(settings, config)}`);
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

        // ───────────────────────── STYLE / FONTS ─────────────────────────
        case 'editname':
        case 'style':
        case 'fancy':
        case 'font': {
            const text = args.join(' ').trim();
            if (!text) {
                return m.reply(
                    `╭━━━〔 🎨 *STYLISH TEXT* 〕━━━╮\n` +
                    `┃\n` +
                    `┃  Convert any text to stylish\n` +
                    `┃  Unicode fonts for group names,\n` +
                    `┃  bios, or messages.\n` +
                    `┃\n` +
                    `┃  📝 *Usage:*\n` +
                    `┃  \`${P}style <text>\`\n` +
                    `┃\n` +
                    `┃  📌 *Example:*\n` +
                    `┃  \`${P}style SMILE PRIME MD\`\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                    `么 *SMILE PRIME MD* 么`
                );
            }
            if (text.length > 60) return m.reply('❌ Text too long (max 60 chars).');

            const brandFont = (t) => {
                const map = {
                    a:'𝚨', b:'𝚩', c:'𝐂', d:'𝚫', e:'𝚬', f:'𝚭', g:'𝚮', h:'𝚯', i:'𝚰',
                    j:'𝚱', k:'𝚲', l:'𝚳', m:'𝚴', n:'𝚵', o:'𝚶', p:'𝚷', q:'𝚸', r:'𝚹',
                    s:'𝚺', t:'𝚻', u:'𝚼', v:'𝚽', w:'𝚾', x:'𝚿', y:'𝛀', z:'𝛁',
                    A:'𝚨', B:'𝚩', C:'𝐂', D:'𝚫', E:'𝚬', F:'𝚭', G:'𝚮', H:'𝚯', I:'𝚰',
                    J:'𝚱', K:'𝚲', L:'𝚳', M:'𝚴', N:'𝚵', O:'𝚶', P:'𝚷', Q:'𝚸', R:'𝚹',
                    S:'𝚺', T:'𝚻', U:'𝚼', V:'𝚽', W:'𝚾', X:'𝚿', Y:'𝛀', Z:'𝛁'
                };
                return t.split('').map(c => map[c] || c).join('');
            };

            const fonts = {
                '𝗕𝗼𝗹𝗱': {
                    upper: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
                    lower: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
                    num: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵'
                },
                '𝘐𝘵𝘢𝘭𝘪𝘤': {
                    upper: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡',
                    lower: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻',
                    num: '1234567890'
                },
                '𝓢𝓬𝓻𝓲𝓹𝓽': {
                    upper: '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
                    lower: '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
                    num: '𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫'
                },
                '𝔊𝔬𝔱𝔥𝔦𝔠': {
                    upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
                    lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
                    num: '0123456789'
                },
                '𝕯𝖔𝖚𝖇𝖑𝖊': {
                    upper: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ',
                    lower: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
                    num: '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡'
                },
                'ꜱᴍᴀʟʟᴄᴀᴘꜱ': {
                    upper: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ',
                    lower: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ',
                    num: '0123456789'
                },
                'Ⓞⓤⓣⓛⓘⓝⓔ': {
                    upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
                    lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
                    num: '⓪①②③④⑤⑥⑦⑧⑨'
                }
            };

            const results = [`┃ 么 𝚳𝚯𝐃𝐙      › 么 ${brandFont(text)} 么`];
            for (const [name, map] of Object.entries(fonts)) {
                const converted = text.split('').map(ch => {
                    const u = map.upper.indexOf(ch);
                    if (u !== -1) return map.upper[u];
                    const l = map.lower.indexOf(ch);
                    if (l !== -1) return map.lower[l];
                    const n = map.num.indexOf(ch);
                    if (n !== -1) return map.num[n];
                    return ch;
                }).join('');
                results.push(`┃ ${name.padEnd(12)} › ${converted}`);
            }

            return m.reply(
                `╭━━━〔 🎨 *STYLISH TEXT* 〕━━━╮\n` +
                `┃\n` +
                `┃  Original › ${text}\n` +
                `┃\n` +
                `┣━━━━━━━━━━━━━━━━━━━━━━━┫\n` +
                results.join('\n') +
                `\n┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                `_Copy any style by long-pressing it._\n\n` +
                `么 *SMILE PRIME MD* 么`
            );
        }

        // ───────────────────────── MATH ─────────────────────────
        case 'math':
        case 'solve': {
            const expr = args.join(' ').trim();
            if (!expr) {
                return m.reply(
                    `╭━━━〔 🧮 *MATH SOLVER* 〕━━━╮\n` +
                    `┃\n` +
                    `┃  Solve equations with steps.\n` +
                    `┃\n` +
                    `┃  📝 *Usage:*\n` +
                    `┃  \`${P}math <equation>\`\n` +
                    `┃\n` +
                    `┃  📌 *Examples:*\n` +
                    `┃  \`${P}math 2x+5=15\`\n` +
                    `┃  \`${P}math integrate x^2 dx\`\n` +
                    `┃  \`${P}math factor x^2-4\`\n` +
                    `┃  \`${P}math simplify 3x+2x\`\n` +
                    `┃  \`${P}math derive sin(x)\`\n` +
                    `┃  \`${P}math 12*8\`\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                    `么 *SMILE PRIME MD* 么`
                );
            }

            if (/^[\d\s+\-*/().%^]+$/.test(expr)) {
                try {
                    const safe = expr.replace(/\^/g, '**');
                    const val = Function(`"use strict";return (${safe})`)();
                    return m.reply(
                        `╭━━━〔 🧮 *RESULT* 〕━━━╮\n` +
                        `┃\n` +
                        `┃  📥 Input  : \`${expr}\`\n` +
                        `┃  📤 Answer : *${val}*\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━╯\n\n` +
                        `么 *SMILE PRIME MD* 么`
                    );
                } catch {
                    return m.reply('❌ Invalid expression.');
                }
            }

            await m.react('🧮');
            try {
                let op = 'simplify';
                let query = expr;
                if (/^integrate\s+/i.test(expr))      { op = 'integrate'; query = expr.replace(/^integrate\s+/i, ''); }
                else if (/^derive\s+/i.test(expr))    { op = 'derive';    query = expr.replace(/^derive\s+/i, ''); }
                else if (/^factor\s+/i.test(expr))    { op = 'factor';    query = expr.replace(/^factor\s+/i, ''); }
                else if (/^simplify\s+/i.test(expr))  { op = 'simplify';  query = expr.replace(/^simplify\s+/i, ''); }
                else if (/^zeroes?\s+/i.test(expr))   { op = 'zeroes';    query = expr.replace(/^zeroes?\s+/i, ''); }
                else if (/^area\s+/i.test(expr))      { op = 'area';      query = expr.replace(/^area\s+/i, ''); }
                else if (/^cos\s+/i.test(expr))       { op = 'cos';       query = expr.replace(/^cos\s+/i, ''); }
                else if (/^sin\s+/i.test(expr))       { op = 'sin';       query = expr.replace(/^sin\s+/i, ''); }
                else if (/^tan\s+/i.test(expr))       { op = 'tan';       query = expr.replace(/^tan\s+/i, ''); }
                else if (expr.includes('='))          { op = 'simplify'; }
                else if (/[a-z]/i.test(expr))         { op = 'simplify'; }

                const res = await fetch(`https://newton.now.sh/api/v2/${op}/${encodeURIComponent(query)}`);
                if (!res.ok) return m.reply('❌ Could not solve that expression.');
                const json = await res.json();

                return m.reply(
                    `╭━━━〔 🧮 *MATH SOLVER* 〕━━━╮\n` +
                    `┃\n` +
                    `┃  🔍 Operation : ${op}\n` +
                    `┃  📥 Input     : \`${query}\`\n` +
                    `┃  📤 Answer    : *${json.result}*\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                    `么 *SMILE PRIME MD* 么`
                );
            } catch (err) {
                log.error('math', err.message);
                return m.reply(`❌ Math solve failed: ${err.message}`);
            }
        }

        // ───────────────────────── password / qr ─────────────────────────
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

        // ───────────────────────── owner / system ─────────────────────────
        case 'restart': {
            if (!owner) return m.reply('⛔ Owner only.');
            await m.reply('♻️ Restarting...');
            process.exit(0);
        }

        case 'update': {
            if (!owner) return m.reply('⛔ Owner only.');
            return m.reply(
                'ℹ️ *SMILE MODZ UPDATE SYSTEM*\n\n' +
                'Publish the new bot version through your hosting deployment, then users can open the updates website and tap *UPDATE MY BOT*.\n\n' +
                'This command no longer pulls shared source code or restarts every paired number.'
            );
        }

        case 'getcase':
        case 'showsource':
        case 'src': {
            if (!owner) return m.reply('⛔ Owner only.');
            const name = (args[0] || '').toLowerCase().trim();
            if (!name) {
                return m.reply(
                    `╭━━━〔 📖 *GETCASE* 〕━━━╮\n` +
                    `┃\n` +
                    `┃  View source code of any\n` +
                    `┃  command directly here.\n` +
                    `┃\n` +
                    `┃  📝 *Usage:*\n` +
                    `┃  \`${P}getcase <command>\`\n` +
                    `┃\n` +
                    `┃  📌 *Example:*\n` +
                    `┃  \`${P}getcase sticker\`\n` +
                    `┃  \`${P}getcase antidelete\`\n` +
                    `┃  \`${P}getcase update\`\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                    `么 *SMILE PRIME MD* 么`
                );
            }

            const candidates = [
                path.join(process.cwd(), 'Anix.js'),
                path.join(process.cwd(), 'anix.js'),
                path.join(process.cwd(), 'index.js'),
                path.join(process.cwd(), 'src', 'Anix.js'),
                path.join(process.cwd(), 'src', 'anix.js'),
                path.join(process.cwd(), 'src', 'index.js'),
            ];

            let sourceContent = null;
            for (const f of candidates) {
                if (fs.existsSync(f)) {
                    const c = fs.readFileSync(f, 'utf8');
                    if (c.includes(`case '${name}'`) || c.includes(`case "${name}"`)) {
                        sourceContent = c;
                        break;
                    }
                }
            }

            if (!sourceContent) {
                return m.reply(`❌ No command named \`${name}\` exists.`);
            }

            const lines = sourceContent.split('\n');
            let startLine = -1;
            for (let i = 0; i < lines.length; i++) {
                const l = lines[i];
                if (l.includes(`case '${name}':`) || l.includes(`case "${name}":`)) {
                    startLine = i;
                    break;
                }
            }

            if (startLine === -1) return m.reply(`❌ No command named \`${name}\` exists.`);

            let chainStart = startLine;
            while (chainStart > 0) {
                const prev = lines[chainStart - 1].trim();
                if (prev.startsWith(`case '`) || prev.startsWith(`case "`)) chainStart--;
                else break;
            }

            let braceCount = 0;
            let opened = false;
            let endLine = -1;
            for (let i = chainStart; i < lines.length; i++) {
                const l = lines[i];
                for (const ch of l) {
                    if (ch === '{') { braceCount++; opened = true; }
                    else if (ch === '}') { braceCount--; }
                }
                if (opened && braceCount === 0) { endLine = i; break; }
                if (!opened && i > chainStart && /^\s*case\s+['"]/.test(l)) { endLine = i - 1; break; }
                if (i - chainStart > 800) { endLine = i; break; }
            }
            if (endLine === -1) endLine = Math.min(chainStart + 200, lines.length - 1);

            const snippet = lines.slice(chainStart, endLine + 1).join('\n');
            const maxInline = 3500;

            if (snippet.length <= maxInline) {
                return m.reply(
                    `╭━━━〔 📖 *${name.toUpperCase()}* 〕━━━╮\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                    `\`\`\`javascript\n${snippet}\n\`\`\`\n\n` +
                    `么 *SMILE PRIME MD* 么`
                );
            }

            return m.send({
                document: Buffer.from(snippet, 'utf8'),
                fileName: `${name}.txt`,
                mimetype: 'text/plain',
                caption: `╭━━━〔 📖 *${name.toUpperCase()}* 〕━━━╮\n┃  📏 ${endLine - chainStart + 1} lines\n┃  🧾 ${(snippet.length / 1024).toFixed(1)} KB\n╰━━━━━━━━━━━━━━━━━━━━━╯`
            });
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
            const senderNumber = jidToNumber(m.senderAlt || m.sender);
            try {
                await sock.sendMessage(to, {
                    text: `📩 *NEW BOT REPORT*\n\n👤 ${senderNumber}\n📱 https://wa.me/${senderNumber}\n\n━━━━━━━━━━━━━━\n📝 *Message:*\n${text}\n━━━━━━━━━━━━━━`
                });
                return m.reply('✅ Report sent to the owner.');
            } catch (err) {
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
┃  🔗 ${CHANNEL.link}
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
            if (!docMsg) return m.reply('❌ Reply to a JavaScript (.js) file.');
            const fileName = docMsg.fileName || '';
            if (!fileName.toLowerCase().endsWith('.js')) return m.reply('❌ Only .js files are supported.');
            try {
                await sock.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                const docBuffer = await downloadMediaMessage({ message: { documentMessage: docMsg }, key: quoted.key }, 'buffer', {});
                if (!docBuffer) return m.reply('❌ Failed to download the file.');
                const result = await JsConfuser.obfuscate(docBuffer.toString('utf-8'), {
                    target: 'node', preset: 'high', compact: true, minify: true, flatten: true,
                    renameVariables: true, renameGlobals: false, stringEncoding: true,
                    stringConcealing: true, stringCompression: true, controlFlowFlattening: 1.0,
                    dispatcher: true, calculator: true, hexadecimalNumbers: true,
                    movedDeclarations: true, objectExtraction: true, globalConcealing: true
                });
                const output = result.code || result;
                await sock.sendMessage(m.from, {
                    document: Buffer.from(output, 'utf-8'),
                    mimetype: 'application/javascript',
                    fileName: `SMILE-PRIME-${fileName}`,
                    caption: `🔐 ENCRYPTED\n📁 ${fileName}\n\n👨‍💻 么 𝐒𝚳𝚰𝐋𝚵 𝐏𝐑𝐈𝐌𝐄 𝚳𝐃 么`
                }, { quoted: m.raw });
                await sock.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            } catch (err) {
                log.error('encrypt', err.stack || err.message);
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
                return m.reply(`✅ Warn limit set to *${n}*.`);
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
                `*Antilink* · now: *${cfg.mode.toUpperCase()}* · warn limit: *${cfg.limit}* · warned: ${warned}\nI am admin here: ${iAmAdmin ? '✅ yes' : '❌ NO'}\n\n` +
                    `${P}antilink del | warn | kick | off | setwarn <n> | resetwarn [@user]`
            );
        }

        case 'anticall': {
            if (!owner) return m.reply('⛔ Owner only.');
            const a = (args[0] || '').toLowerCase();
            if (!['hang', 'block', 'off'].includes(a)) return m.reply(`*Anti-call*: ${settings.get('antiCall', 'off').toUpperCase()}\n\n${P}anticall hang | block | off`);
            settings.set('antiCall', a);
            return m.reply(a === 'off' ? '✅ Anti-call *OFF*.' : `✅ Anti-call *${a.toUpperCase()}*`);
        }

        case 'antidelete':
        case 'antidel': {
            if (!owner) return m.reply('⛔ Owner only.');
            const action  = (args[0] || '').toLowerCase();
            const modeArg = (args[1] || '').toLowerCase();
            const current = settings.get('antidelete', { enabled: false, mode: 'chat' });
            const modeLabel = (x) => (x === 'dm' ? 'Owner DM' : 'Same Chat');
            const onOff = (v) => (v ? '✅ ON' : '❌ OFF');

            if (!action || action === 'status') {
                return m.reply(
                    `🛡️ *ANTI-DELETE*\n\nStatus: ${onOff(current.enabled)}\nMode: *${modeLabel(current.mode)}*\n\n` +
                    `• ${P}antidelete on | off\n• ${P}antidelete on chat | dm\n• ${P}antidelete mode chat | dm`
                );
            }
            if (action === 'on' || action === 'off') {
                const enabled = action === 'on';
                let mode = current.mode || 'chat';
                if (enabled && (modeArg === 'chat' || modeArg === 'dm')) mode = modeArg;
                settings.set('antidelete', { enabled, mode });
                return m.reply(enabled ? `✅ Anti-delete ON (${modeLabel(mode)})` : '✅ Anti-delete OFF');
            }
            if (action === 'mode') {
                if (modeArg !== 'chat' && modeArg !== 'dm') return m.reply(`❌ Use: ${P}antidelete mode chat|dm`);
                settings.set('antidelete', { enabled: current.enabled, mode: modeArg });
                return m.reply(`✅ Anti-delete mode → *${modeLabel(modeArg)}*`);
            }
            return m.reply(`❌ Unknown option. Use ${P}antidelete for help.`);
        }

        // ───────────────────────── WEB & NETWORK ─────────────────────────
        case 'dns':
        case 'nslookup': {
            const host = (args[0] || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
            if (!host) return m.reply(`Usage: ${P}${cmd} <domain>`);
            try {
                await m.react('⏳');
                const dns = require('dns').promises;
                const [a, aaaa, mx, txt, ns, cname] = await Promise.all([
                    dns.resolve4(host).catch(() => []),
                    dns.resolve6(host).catch(() => []),
                    dns.resolveMx(host).catch(() => []),
                    dns.resolveTxt(host).catch(() => []),
                    dns.resolveNs(host).catch(() => []),
                    dns.resolveCname(host).catch(() => [])
                ]);
                return m.reply([
                    `🌐 *DNS LOOKUP* — ${host}`,
                    '',
                    `📌 *A:* ${a.length ? a.join(', ') : '—'}`,
                    `📌 *AAAA:* ${aaaa.length ? aaaa.join(', ') : '—'}`,
                    `📌 *CNAME:* ${cname.length ? cname.join(', ') : '—'}`,
                    `📌 *MX:* ${mx.length ? mx.map(r => `${r.priority} ${r.exchange}`).join(', ') : '—'}`,
                    `📌 *NS:* ${ns.length ? ns.join(', ') : '—'}`,
                    `📌 *TXT:* ${txt.length ? txt.map(t => t.join('')).join(' | ').slice(0, 300) : '—'}`
                ].join('\n'));
            } catch (err) {
                log.error(cmd, err.message);
                return m.reply(`❌ DNS lookup failed: ${err.message}`);
            }
        }

        case 'whois': {
            const host = (args[0] || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
            if (!host) return m.reply(`Usage: ${P}whois <domain>`);
            try {
                await m.react('⏳');
                const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(host)}`, {
                    headers: { 'Accept': 'application/rdap+json' },
                    signal: AbortSignal.timeout(15000)
                });
                if (!res.ok) return m.reply(`❌ No WHOIS data for ${host} (status ${res.status}).`);
                const j = await res.json();
                const events = (j.events || []).map(e => `• ${e.eventAction}: ${new Date(e.eventDate).toISOString().slice(0,10)}`).join('\n');
                const ns = (j.nameservers || []).map(n => n.ldhName).join(', ') || '—';
                const status = (j.status || []).join(', ') || '—';
                const registrar = (j.entities || []).find(e => (e.roles || []).includes('registrar'));
                const regName = registrar?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3] || '—';
                return m.reply(
                    `🔎 *WHOIS — ${host}*\n\n🏢 Registrar: ${regName}\n📅 Events:\n${events || '—'}\n\n🌐 Nameservers: ${ns}\n📌 Status: ${status}`
                );
            } catch (err) {
                log.error('whois', err.message);
                return m.reply(`❌ WHOIS failed: ${err.message}`);
            }
        }

        case 'ip':
        case 'myip': {
            const target = (args[0] || '').trim();
            try {
                await m.react('⏳');
                if (!target) {
                    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(10000) });
                    const j = await res.json();
                    return m.reply(`🌍 *Your server IP*\n${j.ip}`);
                }
                if (!/^[\d.]+$/.test(target) && !target.includes(':')) {
                    const dns = require('dns').promises;
                    const addrs = await dns.lookup(target, { all: true }).catch(() => []);
                    if (!addrs.length) return m.reply(`❌ Could not resolve ${target}.`);
                    return m.reply(`🌍 *${target}* resolves to:\n${addrs.map(a => `• ${a.address} (IPv${a.family})`).join('\n')}`);
                }
                const res = await fetch(`https://ipapi.co/${encodeURIComponent(target)}/json/`, { signal: AbortSignal.timeout(10000) });
                if (!res.ok) return m.reply('❌ IP lookup failed.');
                const j = await res.json();
                if (j.error) return m.reply(`❌ ${j.reason || 'Lookup failed'}`);
                return m.reply(
                    `🌍 *IP INFO — ${j.ip}*\n\n🏳️ Country: ${j.country_name || '—'} (${j.country_code || '—'})\n🏙️ City: ${j.city || '—'}\n📍 Region: ${j.region || '—'}\n📮 Postal: ${j.postal || '—'}\n🕒 Timezone: ${j.timezone || '—'}\n📡 ISP: ${j.org || '—'}\n🗺️ Loc: ${j.latitude ?? '—'}, ${j.longitude ?? '—'}`
                );
            } catch (err) {
                log.error('ip', err.message);
                return m.reply(`❌ IP lookup failed: ${err.message}`);
            }
        }

        case 'pinghost': {
            const host = (args[0] || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
            if (!host) return m.reply(`Usage: ${P}pinghost <host or url>`);
            try {
                await m.react('⏳');
                const start = Date.now();
                const res = await fetch(`https://${host}`, { method: 'HEAD', signal: AbortSignal.timeout(10000), redirect: 'follow' })
                    .catch(() => fetch(`http://${host}`, { method: 'HEAD', signal: AbortSignal.timeout(10000) }).catch(() => null));
                const ms = Date.now() - start;
                if (!res) return m.reply(`❌ ${host} is unreachable.`);
                return m.reply(`📡 *${host}*\n✅ Status: ${res.status} ${res.statusText}\n⏱️ Latency: ${ms}ms`);
            } catch (err) {
                return m.reply(`❌ ${host} unreachable: ${err.message}`);
            }
        }

        case 'headers': {
            const url = (args[0] || '').trim();
            if (!url) return m.reply(`Usage: ${P}headers <url>`);
            try {
                await m.react('⏳');
                const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000) });
                const lines = [`📋 *HEADERS — ${res.url}*\n`, `Status: ${res.status} ${res.statusText}\n`];
                res.headers.forEach((v, k) => lines.push(`• *${k}:* ${v.slice(0, 200)}`));
                return m.reply(lines.join('\n'));
            } catch (err) {
                return m.reply(`❌ Failed: ${err.message}`);
            }
        }

        case 'httpstatus':
        case 'httpget':
        case 'httphead': {
            const url = (args[0] || '').trim();
            if (!url) return m.reply(`Usage: ${P}${cmd} <url>`);
            try {
                await m.react('⏳');
                const method = cmd === 'httphead' ? 'HEAD' : 'GET';
                const start = Date.now();
                const res = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(15000) });
                const ms = Date.now() - start;
                if (cmd !== 'httpget') {
                    return m.reply(`🌐 *${url}*\n✅ ${res.status} ${res.statusText}\n⏱️ ${ms}ms\n📦 Type: ${res.headers.get('content-type') || '—'}`);
                }
                const buf = Buffer.from(await res.arrayBuffer());
                const type = res.headers.get('content-type') || '';
                if (type.includes('text') || type.includes('json') || type.includes('xml') || type.includes('javascript')) {
                    const body = buf.toString('utf8');
                    if (body.length > 3500) {
                        return m.send({
                            document: buf,
                            fileName: 'response.txt',
                            mimetype: type || 'text/plain',
                            caption: `🌐 *${url}*\n✅ ${res.status} ${res.statusText} — ${buf.length} bytes`
                        });
                    }
                    return m.reply(`🌐 *${url}*\n✅ ${res.status} — ${ms}ms\n\n\`\`\`\n${body}\n\`\`\``);
                }
                return m.reply(`🌐 *${url}*\n✅ ${res.status} ${res.statusText}\n📦 ${type || 'binary'} — ${buf.length} bytes`);
            } catch (err) {
                return m.reply(`❌ Request failed: ${err.message}`);
            }
        }

        case 'redirect': {
            const url = (args[0] || '').trim();
            if (!url) return m.reply(`Usage: ${P}redirect <url>`);
            try {
                await m.react('⏳');
                const chain = [];
                let current = url;
                for (let i = 0; i < 10; i++) {
                    const res = await fetch(current, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(10000) });
                    chain.push(`↳ ${res.status} ${current}`);
                    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
                        current = new URL(res.headers.get('location'), current).toString();
                    } else break;
                }
                return m.reply(`🔗 *REDIRECT CHAIN*\n\n${chain.join('\n')}\n\n🏁 Final: ${current}`);
            } catch (err) {
                return m.reply(`❌ Failed: ${err.message}`);
            }
        }

        case 'robots': {
            const base = (args[0] || '').trim().replace(/\/$/, '');
            if (!base) return m.reply(`Usage: ${P}robots <url>`);
            try {
                const url = base.startsWith('http') ? `${base}/robots.txt` : `https://${base}/robots.txt`;
                const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
                if (!res.ok) return m.reply(`❌ No robots.txt (status ${res.status})`);
                const text = (await res.text()).slice(0, 3500);
                return m.reply(`🤖 *robots.txt — ${base}*\n\n\`\`\`\n${text}\n\`\`\``);
            } catch (err) {
                return m.reply(`❌ Failed: ${err.message}`);
            }
        }

        case 'sitemap': {
            const base = (args[0] || '').trim().replace(/\/$/, '');
            if (!base) return m.reply(`Usage: ${P}sitemap <url>`);
            try {
                const url = base.startsWith('http') ? `${base}/sitemap.xml` : `https://${base}/sitemap.xml`;
                const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
                if (!res.ok) return m.reply(`❌ No sitemap.xml (status ${res.status})`);
                const xml = await res.text();
                const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
                if (!urls.length) return m.reply('⚠️ Sitemap found but no <loc> URLs.');
                return m.reply(`🗺️ *sitemap.xml — ${base}*\n📄 ${urls.length} URLs\n\n${urls.slice(0, 20).map(u => `• ${u}`).join('\n')}${urls.length > 20 ? `\n…and ${urls.length - 20} more` : ''}`);
            } catch (err) {
                return m.reply(`❌ Failed: ${err.message}`);
            }
        }

        case 'ssl':
        case 'cert': {
            const host = (args[0] || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
            if (!host) return m.reply(`Usage: ${P}${cmd} <domain>`);
            try {
                await m.react('⏳');
                const tls = require('tls');
                const info = await new Promise((resolve, reject) => {
                    const socket = tls.connect({ host, port: 443, servername: host, timeout: 10000 }, () => {
                        const cert = socket.getPeerCertificate();
                        socket.end();
                        resolve(cert);
                    });
                    socket.on('error', reject);
                    socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')); });
                });
                if (!info || !info.subject) return m.reply('❌ No certificate returned.');
                return m.reply(
                    `🔒 *TLS — ${host}*\n\n📛 Subject: ${info.subject.CN || '—'}\n🏢 Issuer: ${info.issuer.O || info.issuer.CN || '—'}\n📅 Valid from: ${info.valid_from}\n📅 Valid to: ${info.valid_to}\n🔑 Serial: ${info.serialNumber || '—'}\n🧬 Fingerprint: ${info.fingerprint || '—'}`
                );
            } catch (err) {
                log.error(cmd, err.message);
                return m.reply(`❌ TLS check failed: ${err.message}`);
            }
        }

        case 'cors': {
            const url = (args[0] || '').trim();
            if (!url) return m.reply(`Usage: ${P}cors <url>`);
            try {
                await m.react('⏳');
                const res = await fetch(url, {
                    method: 'OPTIONS',
                    headers: { 'Origin': 'https://example.com', 'Access-Control-Request-Method': 'GET' },
                    signal: AbortSignal.timeout(10000)
                });
                const h = (k) => res.headers.get(k) || '—';
                return m.reply(
                    `🌐 *CORS — ${url}*\n\nStatus: ${res.status}\n• Allow-Origin: ${h('access-control-allow-origin')}\n• Allow-Methods: ${h('access-control-allow-methods')}\n• Allow-Headers: ${h('access-control-allow-headers')}\n• Max-Age: ${h('access-control-max-age')}\n• Allow-Credentials: ${h('access-control-allow-credentials')}`
                );
            } catch (err) {
                return m.reply(`❌ Failed: ${err.message}`);
            }
        }

        case 'portscan': {
            const target = (args[0] || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
            if (!target) return m.reply(`Usage: ${P}portscan <host>`);
            const common = [21, 22, 23, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995, 3306, 3389, 5432, 6379, 8080, 8443, 27017];
            try {
                await m.react('⏳');
                const dns = require('dns').promises;
                const addrs = await dns.lookup(target, { all: true }).catch(() => []);
                if (!addrs.length) return m.reply(`❌ Could not resolve ${target}.`);
                const ip = addrs[0].address;
                const net = require('net');
                const open = [];
                await Promise.all(common.map(port => new Promise(resolve => {
                    const s = new net.Socket();
                    const done = (ok) => { s.destroy(); if (ok) open.push(port); resolve(); };
                    s.setTimeout(1500);
                    s.on('connect', () => done(true));
                    s.on('timeout', () => done(false));
                    s.on('error', () => done(false));
                    s.connect(port, ip);
                })));
                open.sort((a, b) => a - b);
                return m.reply(
                    `🔍 *PORT SCAN — ${target} (${ip})*\n\n✅ Open (${open.length}/${common.length}):\n${open.length ? open.map(p => `• ${p}`).join('\n') : '• none'}`
                );
            } catch (err) {
                log.error('portscan', err.message);
                return m.reply(`❌ Scan failed: ${err.message}`);
            }
        }

        case 'traceroute': {
            const host = (args[0] || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
            if (!host) return m.reply(`Usage: ${P}traceroute <host>`);
            return m.reply('⚠️ `traceroute` needs raw sockets / system privileges and is not portable in Node. Use `pinghost`, `dns`, or `portscan` instead.');
        }

        case 'speedtest': {
            return m.reply('⚠️ `speedtest` requires the `speedtest-net` package. Install it:\n`npm i speedtest-net`\nThen enable this command.');
        }

        // ───────────────────────── sticker / media ─────────────────────────
        case 'sticker':
        case 'stiker':
        case 's': {
            try {
                const quoted = await getQuotedMessage(m);
                const msg = quoted?.message || m.raw?.message;
                if (!msg) return m.reply('📸 Reply to an image or short video with .s [packname|author]');
                const isImg = !!msg.imageMessage;
                const isVid = !!msg.videoMessage;
                const isStk = !!msg.stickerMessage;
                if (!isImg && !isVid && !isStk) return m.reply('❌ Reply to an image, video or sticker.');
                if (isVid && Number(msg.videoMessage.seconds || 0) > 10) return m.reply('❌ Video must be 10 seconds or shorter.');

                await m.reply('⏳ Creating sticker...');
                const rawBuffer = await downloadMediaMessage(
                    { message: msg, key: quoted?.key || m.key },
                    'buffer',
                    {}
                );

                const metaRaw = args.join(' ').trim();
                let pack = '';
                let stkAuthor = ' 𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙';
                if (metaRaw) {
                    const parts = metaRaw.includes('|') ? metaRaw.split('|') : metaRaw.split(',');
                    if (parts[0]) pack = parts[0].trim();
                    if (parts[1]) stkAuthor = parts[1].trim();
                }

                let webpBuf;
                if (isStk) {
                    webpBuf = await writeExifWebp(rawBuffer, { packname: pack, author: stkAuthor });
                } else {
                    const converted = await convertMediaToWebp(rawBuffer, isVid);
                    webpBuf = await writeExifWebp(converted, { packname: pack, author: stkAuthor });
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
                if (!sticker) return m.reply('❌ Reply to a sticker with .take [packname|author]');
                await m.reply('⏳ Updating sticker metadata...');
                const buffer = await downloadMediaMessage(
                    { message: { stickerMessage: sticker }, key: quoted.key },
                    'buffer',
                    {}
                );
                const metaRaw = args.join(' ').trim();
                let pack = '';
                let stkAuthor = ' 𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙';
                if (metaRaw) {
                    const parts = metaRaw.includes('|') ? metaRaw.split('|') : metaRaw.split(',');
                    if (parts[0]) pack = parts[0].trim();
                    if (parts[1]) stkAuthor = parts[1].trim();
                }
                const webpBuf = await writeExifWebp(buffer, { packname: pack, author: stkAuthor });
                await sock.sendMessage(m.from, { sticker: webpBuf }, { quoted: m.raw });
            } catch (err) {
                log.error('take', err.message);
                return m.reply('❌ Failed: ' + (err.message || 'unknown error'));
            }
            break;
        }

        // ───────────────────────── AI CHATBOT CONTROL ─────────────────────────
        case 'chatbot':
        case 'autochat': {
            if (!owner) return m.reply('⛔ Owner only.');
            const current = settings.get('autoReply', 'off');
            const mode = current === true ? 'all' : String(current || 'off');
            const arg = (args[0] || '').toLowerCase();

            const modes = {
                off:     '❌ OFF',
                dm:      '📩 DMs only',
                mention: '💬 When @mentioned',
                reply:   '↩️ When replying to bot',
                trigger: '🔑 Keyword trigger',
                all:     '🌍 Every message',
            };

            if (!arg || arg === 'status') {
                return m.reply(
                    `╭━━━〔 🤖 *AUTO CHAT* 〕━━━╮\n` +
                    `┃\n` +
                    `┃  📌 Status: *${modes[mode] || '❌ OFF'}*\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━╯\n\n` +
                    `*Modes:*\n` +
                    `• ${P}chatbot off\n` +
                    `• ${P}chatbot dm       (DMs only)\n` +
                    `• ${P}chatbot mention  (@mentions in groups)\n` +
                    `• ${P}chatbot reply    (replying to bot)\n` +
                    `• ${P}chatbot trigger  (keyword)\n` +
                    `• ${P}chatbot all      (everything)\n\n` +
                    `*Extras:*\n` +
                    `• ${P}chatbot reset\n` +
                    `• ${P}chatbot persona <text>\n` +
                    `• ${P}chatbot trigger bot,hey,anime`
                );
            }

            if (arg === 'reset') {
                autochat.clearHistory(sessionId, m.from);
                return m.reply('✅ Chat history cleared.');
            }

            if (arg === 'persona') {
                const text = args.slice(1).join(' ').trim().slice(0, 200);
                if (!text) return m.reply(`Usage: ${P}chatbot persona <text>`);
                settings.set('chatPersona', text);
                return m.reply(`✅ Persona set:\n\n_"${text}"_`);
            }

            if (arg === 'trigger') {
                const words = args.slice(1).join(' ').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                if (!words.length) return m.reply(`Usage: ${P}chatbot trigger bot,hey,anime`);
                settings.set('chatTriggers', words);
                return m.reply(`✅ Triggers: ${words.map(w => '`' + w + '`').join(', ')}`);
            }

            if (!modes[arg]) {
                return m.reply(`❌ Unknown mode *${arg}*. Use: off, dm, mention, reply, trigger, all`);
            }

            settings.set('autoReply', arg);
            return m.reply(`✅ Auto-chat mode: *${modes[arg]}*`);
        }

        default:
            // Unknown command — silent (don't spam)
            return;
        }
    } catch (err) {
        log.error('handleCommand', err.stack || err.message);
        try { await m.reply(`❌ Error: ${err.message}`); } catch {}
    }
}

// ═════════════════════════════════════════════════════════════════
//                            EXPORTS
// ═════════════════════════════════════════════════════════════════
module.exports = {
    handleMessages,
    handleCommand,
    onSessionOpen,
    handleGroupUpdate,
    handlePresence,
    handleCalls,
    autochat,
    SHADOW_MENU_CATEGORIES,
};
      
