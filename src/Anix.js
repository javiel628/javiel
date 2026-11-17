const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { downloadMediaMessage, generateWAMessageFromContent, prepareWAMessageMedia, proto } = require('./lib/baileys');
const config = require('./config');
const { FONT_NAMES } = require('./lib/fonts');
const { serializeMessage } = require('./lib/serializer');
const { isOwner } = require('./middleware/owner');
const { requireGroup } = require('./middleware/group');
const { jidToNumber } = require('./lib/utils');
const { numOf, digits, senderNums, isSudo, resolveTarget, isGroupAdmin, botIsAdmin } = require('./lib/access');
const { checkAntilink, getCfg: antilinkCfg, setCfg: setAntilinkCfg, getWarns, setWarns } = require('./lib/antilink');
const { GROUP_CMDS, runGroupCommand, trackPresence } = require('./commands/group');
const { handleParticipants } = require('./lib/welcome');
const { sendCopy } = require('./lib/buttons');
const { rememberMessage, handleRevoke } = require('./lib/antidelete');
const { chatReply, allowed: chatAllowed } = require('./lib/chatbot');
const { simulatePresence, startAlwaysOnline } = require('./lib/presence');
const { apiGet } = require('./lib/api');
const log = require('./lib/logger');
const { handleStatus } = require('./lib/status');
const { followChannel, handleChannelPost } = require('./lib/channel');
const { postGroupStatus } = require('./lib/groupstatus');
const { convertMediaToWebp, writeExifWebp, convertStickerToImage, createCircularSticker, generateTextSticker } = require('./lib/media');
const { parseEmojiPair } = require('./lib/emoji-kitchen');
const autochat = require('./lib/autochat');

const author = '𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙';

// ──────────────── EDIT HERE ────────────────
const CHANNEL = {
    link: 'https://whatsapp.com/channel/0029Vb794NKBadmdwkPN6i0B',
    jid: '',
    emojis: ['❤️', '🔥', '😍', '💯', '👏'],
};
const CHANNEL_BUTTON_URL = 'https://whatsapp.com/channel/0029Vb794NKBadmdwkPN6i0B';
const DEFAULT_MENU_IMAGE = 'https://files.catbox.moe/uqr56d.jpeg';
const BOT_DISPLAY = '么 𝐒𝚳𝚰𝐋𝚵 𝐏𝐑𝐈𝚳𝚵 𝚳𝐃 么';
const BOT_PLAIN   = '么 SMILE PRIME MD 么';
// ───────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════
//               HELPERS
// ═════════════════════════════════════════════════════════════════

const senderNumsOf = (jid) => [numOf(jid)];

function withTimeout(promise, ms, label = 'request') {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
    ]);
}

async function safeFetch(url, opts = {}, ms = 15000) {
    return withTimeout(fetch(url, opts), ms, 'fetch');
}

async function getQuotedMessage(m) {
    const msg = m.raw?.message || {};
    const inner = msg.ephemeralMessage?.message || msg.viewOnceMessage?.message || msg;
    const typeKey = Object.keys(inner).find((k) => inner[k]?.contextInfo?.quotedMessage);
    const ctx = typeKey ? inner[typeKey].contextInfo : null;
    if (!ctx?.quotedMessage) return null;
    return {
        message: ctx.quotedMessage,
        key: { remoteJid: m.from, id: ctx.stanzaId, participant: ctx.participant, fromMe: false },
    };
}

// ═════════════════════════════════════════════════════════════════
//         MENU  (numbered reply + one Channel button on every page)
// ═════════════════════════════════════════════════════════════════

const SHADOW_MENU_CATEGORIES = [
    { title: '📊 SYSTEM', name: 'SYSTEM', commands: [
        'ping', 'alive', 'uptime', 'speed', 'public', 'self', 'mode', 'autoread',
        'autotyping', 'alwaysonline', 'autostatusview', 'autostatuslike', 'setprefix',
        'settings', 'anticall', 'autoreactch', 'antidelete', 'antidel', 'setbotname',
        'stats', 'config', 'donate', 'report', 'resetsettings', 'runtime', 'chatbot', 'autochat'
    ]},
    { title: '🧠 ANALYSIS', name: 'ANALYSIS', commands: [
        'weather', 'checktime', 'whois', 'fact', 'translate', 'trt', 'define', 'calculate', 'calc', 'idch'
    ]},
    { title: '🎬 MEDIA', name: 'MEDIA', commands: [
        'tiktok', 'tt', 'ttdl', 'sticker', 's', 'toimg', 'circle', 'round', 'ttp', 'attp', 'emojimix', 'take', 'steal', 'wm'
    ]},
    { title: '👥 GROUP', name: 'GROUP', commands: [
        'add', 'kick', 'promote', 'demote', 'antilink', 'tagall', 'hidetag', 'mute', 'unmute',
        'groupinfo', 'linkgroup', 'setname', 'link', 'setppgc', 'delppgc', 'resetlink', 'kickall',
        'groupstats', 'rules', 'setrules', 'antispam', 'admins', 'all', 'checkwarn', 'close',
        'del', 'delete', 'getppgc', 'goodbye', 'idgc', 'open', 'poll', 'remove', 'resetwarn',
        'revoke', 'setgcname', 'unlock', 'lock', 'unwarn', 'warn', 'warns', 'welcome'
    ]},
    { title: '🔄 CONVERSION', name: 'CONVERSION', commands: [
        'sticker', 's', 'toimg', 'take', 'tourl', 'qr', 'emojimix', 'attp', 'circle', 'ptt', 'round', 'stiker', 'ttp', 'steal'
    ]},
    { title: '🛠️ DEVELOPER', name: 'DEVELOPER', commands: [
        'eval', 'exec', 'restart', 'broadcast', 'join', 'leave', 'addsudo', 'delsudo', 'listsudo', 'getcase', 'showsource', 'src'
    ]},
    { title: '🤖 BASIC', name: 'BASIC', commands: [
        'ai', 'lyrics', 'calc', 'password', 'getdp', 'owner', 'creator', 'support'
    ]},
    { title: '🧰 UTILITY', name: 'UTILITY', commands: [
        'base64', 'hash', 'morsecode', 'wordcount', 'changelog', 'health', 'setdp', 'setfonts', 'setmenuimg', 'style', 'fancy', 'font'
    ]},
    { title: '🌐 WEB & NETWORK', name: 'WEB', commands: [
        'dns', 'whois', 'ip', 'myip', 'pinghost', 'httpstatus', 'nslookup'
    ]},
    { title: '🎉 FUN', name: 'FUN', commands: [
        '8ball', 'truth', 'dare', 'rps', 'quote', 'compliment', 'roast'
    ]}
];

const menuState = new Map();
const MENU_WINDOW_MS = 5 * 60 * 1000;

async function loadMenuImage(settings) {
    const source = settings.get('menuImage', '') || DEFAULT_MENU_IMAGE;
    try {
        if (/^https?:\/\//i.test(source)) {
            const res = await safeFetch(source, {}, 15000);
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
    const lines = cmds.map((c, i) => {
        const bullet = cmds.length === 1 ? '╰─❖'
            : i === 0 ? '╭─❖'
            : i === cmds.length - 1 ? '╰─❖'
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
        `┃✬│ Cmds    : ${cmds.length}`,
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
                        buttons: [{
                            name: 'cta_url',
                            buttonParamsJson: JSON.stringify({
                                display_text: '📢 Channel',
                                url: CHANNEL_BUTTON_URL,
                                merchant_url: CHANNEL_BUTTON_URL
                            })
                        }],
                        messageParamsJson: ''
                    })
                })
            }
        }
    }, { quoted });

    await sock.relayMessage(jid, msg.message, {
        messageId: msg.key.id,
        additionalNodes: [{
            tag: 'biz', attrs: {},
            content: [{
                tag: 'interactive', attrs: { type: 'native_flow', v: '1' },
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

            // ── numbered menu reply handler ──
            const state = menuState.get(m.from);
            if (state && !m._cmd) {
                const body = String(m.text || m.body || '').trim();
                if (/^\d+$/.test(body)) {
                    if (Date.now() - state.at > MENU_WINDOW_MS) {
                        menuState.delete(m.from);
                    } else {
                        const n = parseInt(body, 10);
                        if (n === 0) {
                            menuState.delete(m.from);
                            await m.reply('Menu closed.').catch(() => {});
                            continue;
                        }
                        if (n >= 1 && n <= SHADOW_MENU_CATEGORIES.length) {
                            await sendCategoryPage(m, sock, settings, n - 1);
                            continue;
                        }
                    }
                }
            }

            if (m.isGroup) {
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
    try { await handleParticipants(sock, update, { sessionId, settings }); }
    catch (e) { log.warn('groupUpdate', e.message); }
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
    } catch (e) { log.warn('antiCall', e.message); }
}

// ═════════════════════════════════════════════════════════════════
//                       COMMAND DISPATCHER
// ═════════════════════════════════════════════════════════════════
async function handleCommand(m, { args, sock, session }) {
    m.chat = m.from;
    const { settings, sessionId } = session;
    const cmd = (m._cmd || '').toLowerCase();
    const owners = settings.get('owners', []);
    const owner = isOwner(m, owners) || isSudo(m, settings);
    const P = settings.get('prefix', config.prefix);
    const isPublic = settings.get('public', true);

    log.command(`[${sessionId}] wa.me/${jidToNumber(m.sender)}`, `${P}${cmd}`);
    if (!isPublic && !owner) return;

    if (GROUP_CMDS.has(cmd)) return runGroupCommand(cmd, m, { sock, settings, owner, args, P, getQuotedMessage });

    try {
        switch (cmd) {
        case 'menu':
        case 'help':
            return sendMainMenu(m, sock, settings);

        // ───────────── FUN ─────────────
        case '8ball': {
            const q = args.join(' ');
            if (!q) return m.reply(`Usage: ${P}8ball <question>`);
            const answers = [
                'Yes, definitely.', 'It is certain.', 'Without a doubt.', 'Most likely.',
                'Ask again later.', 'Cannot predict now.', "Don't count on it.",
                'My reply is no.', 'Very doubtful.', 'Outlook good.'
            ];
            return m.reply(`🎱 *Question:* ${q}\n*Answer:* ${answers[Math.floor(Math.random() * answers.length)]}`);
        }
        case 'truth': {
            const truths = [
                "What's the most embarrassing thing you've ever done?",
                "What's a secret you've never told anyone here?",
                "What's your biggest fear?", 'Who was your first crush?',
                "What's the weirdest dream you've had?"
            ];
            return m.reply(`🤔 *Truth:* ${truths[Math.floor(Math.random() * truths.length)]}`);
        }
        case 'dare': {
            const dares = [
                'Send the last photo in your gallery.',
                'Record a voice note singing any song for 10 seconds.',
                'Let the group pick your new profile picture for a day.',
                "Text someone in this chat 'I have something to confess' and then tell them it was a dare.",
                'Reply to the next 5 messages using only emojis.'
            ];
            return m.reply(`🔥 *Dare:* ${dares[Math.floor(Math.random() * dares.length)]}`);
        }
        case 'rps': {
            const u = (args[0] || '').toLowerCase();
            if (!['rock', 'paper', 'scissors'].includes(u)) return m.reply(`Usage: ${P}rps <rock|paper|scissors>`);
            const choices = ['rock', 'paper', 'scissors'];
            const b = choices[Math.floor(Math.random() * 3)];
            let r = 'It\'s a tie!';
            if ((u === 'rock' && b === 'scissors') || (u === 'paper' && b === 'rock') || (u === 'scissors' && b === 'paper')) r = 'You win! 🎉';
            else if (u !== b) r = 'I win! 🤖';
            return m.reply(`You: *${u}*\nMe: *${b}*\n\n${r}`);
        }
        case 'quote': {
            const quotes = [
                'The only way to do great work is to love what you do. — Steve Jobs',
                "Life is what happens when you're busy making other plans. — John Lennon",
                'In the middle of difficulty lies opportunity. — Albert Einstein',
                "Believe you can and you're halfway there. — Theodore Roosevelt",
                'The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt'
            ];
            return m.reply(`💬 *Quote:*\n\n${quotes[Math.floor(Math.random() * quotes.length)]}`);
        }
        case 'compliment': {
            const c = [
                'You bring out the best in people around you.',
                'Your energy is contagious — in a great way.',
                "You're more talented than you give yourself credit for.",
                'You make hard things look easy.',
                'The world is better with you in it.'
            ];
            return m.reply(`✨ ${c[Math.floor(Math.random() * c.length)]}`);
        }
        case 'roast': {
            const r = [
                "You have the confidence of someone who's never seen the replay.",
                "You're proof that even WiFi has standards.",
                "I'd agree with you, but then we'd both be wrong.",
                "You're like a cloud — things get better when you disappear for a bit.",
                'Somewhere, a tree is working hard to produce oxygen for you. Seems unfair to the tree.'
            ];
            return m.reply(`🔥 ${r[Math.floor(Math.random() * r.length)]}`);
        }

        // ───────────── UTILITY (safe / self-contained) ─────────────
        case 'base64': {
            const t = args.join(' ');
            if (!t) return m.reply(`Usage: ${P}base64 <text>`);
            return m.reply(`🔐 *Base64:*\n\`${Buffer.from(t).toString('base64')}\``);
        }
        case 'hash': {
            const t = args.join(' ');
            if (!t) return m.reply(`Usage: ${P}hash <text>`);
            const md5 = crypto.createHash('md5').update(t).digest('hex');
            const sha256 = crypto.createHash('sha256').update(t).digest('hex');
            return m.reply(`🔑 *Hashes for:* ${t}\n\n*MD5:* \`${md5}\`\n*SHA256:* \`${sha256}\``);
        }
        case 'morsecode': {
            const t = args.join(' ').toUpperCase();
            if (!t) return m.reply(`Usage: ${P}morsecode <text>`);
            const map = { A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....', I:'..', J:'.---', K:'-.-', L:'.-..', M:'--', N:'-.', O:'---', P:'.--.', Q:'--.-', R:'.-.', S:'...', T:'-', U:'..-', V:'...-', W:'.--', X:'-..-', Y:'-.--', Z:'--..', '0':'-----', '1':'.----', '2':'..---', '3':'...--', '4':'....-', '5':'.....', '6':'-....', '7':'--...', '8':'---..', '9':'----.' };
            return m.reply(`📡 *Morse:*\n${t.split('').map(c => map[c] || c).join(' ')}`);
        }
        case 'wordcount': {
            const t = args.join(' ');
            if (!t) return m.reply(`Usage: ${P}wordcount <text>`);
            return m.reply(`📝 Words: ${t.trim().split(/\s+/).length}\nChars: ${t.length}`);
        }
        case 'calc': {
            const e = args.join(' ').trim();
            if (!e) return m.reply(`Usage: ${P}calc <expression>`);
            if (!/^[\d\s+\-*/().%]+$/.test(e)) return m.reply('❌ Only numbers and + - * / ( ) % allowed.');
            try {
                const val = Function(`"use strict";return (${e})`)();
                return m.reply(`🧮 ${e} = *${val}*`);
            } catch { return m.reply('❌ Invalid expression.'); }
        }
        case 'password': {
            const len = Math.min(Math.max(parseInt(args[0], 10) || 16, 6), 64);
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
            let out = '';
            for (let i = 0; i < len; i++) out += chars[crypto.randomInt(0, chars.length)];
            return m.reply(`🔐 Password (${len}):\n\`${out}\``);
        }
        case 'qr': {
            const t = args.join(' ').trim();
            if (!t) return m.reply(`Usage: ${P}qr <text or url>`);
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(t)}`;
            return m.send({ image: { url }, caption: '🔳 QR Code' });
        }
        case 'checktime': {
            return m.reply(`🕒 *Current Time:*\n${new Date().toLocaleString()}`);
        }
        case 'runtime':
        case 'uptime': {
            const s = process.uptime();
            return m.reply(`⏱️ Uptime: ${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`);
        }
        case 'stats': {
            const mem = process.memoryUsage();
            const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';
            return m.reply(
                `📊 *Stats*\n• Uptime: ${Math.floor(process.uptime() / 60)} min\n• RSS: ${mb(mem.rss)}\n• Heap: ${mb(mem.heapUsed)} / ${mb(mem.heapTotal)}\n• Node: ${process.version}\n• Platform: ${process.platform}`
            );
        }
        case 'ping': {
            const start = Date.now();
            await m.reply('Pinging...');
            return m.reply(`🏓 Pong! ${Date.now() - start}ms`);
        }
        case 'alive': {
            const s = process.uptime();
            const up = `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`;
            return m.reply(`✅ *${config.botName || 'SMILE PRIME MD'}* is alive!\nUptime: ${up}`);
        }
        case 'owner': {
            if (!owners.length) return m.reply('No owner configured.');
            return m.reply(`👑 Owner contact:\n${owners.map(j => `wa.me/${jidToNumber(j)}`).join('\n')}`);
        }

        // ───────────── MODE / ACCESS ─────────────
        case 'public':
            if (!owner) return m.reply('⛔ Owner only.');
            settings.set('public', true);
            return m.reply('✅ Bot is now *public*.');
        case 'self':
            if (!owner) return m.reply('⛔ Owner only.');
            settings.set('public', false);
            return m.reply('✅ Bot is now *self mode*.');
        case 'setprefix': {
            if (!owner) return m.reply('⛔ Owner only.');
            const v = (args[0] || '').toLowerCase();
            if (!v) return m.reply('Usage: setprefix <character|none>');
            const np = v === 'none' ? '' : args[0];
            settings.set('prefix', np);
            return m.reply(np ? `✅ Prefix set to: ${np}` : '✅ Prefix removed.');
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
                return m.reply(`✅ Menu image set. Send *${P}menu* to see it.`);
            }
            try {
                const quoted = await getQuotedMessage(m);
                const imgMsg = quoted?.message?.imageMessage || m.raw.message?.imageMessage;
                if (!imgMsg) return m.reply(`Reply to an image with *${P}setmenuimg*, or give a link, or use "reset".`);
                const buffer = await downloadMediaMessage(
                    { message: { imageMessage: imgMsg }, key: quoted?.message?.imageMessage ? quoted.key : m.key },
                    'buffer', {}
                );
                const dir = path.join(process.cwd(), 'session', sessionId);
                fs.mkdirSync(dir, { recursive: true });
                const dest = path.join(dir, 'menu-image.jpg');
                fs.writeFileSync(dest, buffer);
                settings.set('menuImage', dest);
                return m.reply(`✅ Menu image updated.`);
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
            return m.reply(`✅ Font style set to *${style}*.`);
        }
        case 'autostatusview':
        case 'autostatuslike': {
            if (!owner) return m.reply('⛔ Owner only.');
            const key = cmd === 'autostatusview' ? 'autoStatusView' : 'autoStatusLike';
            const label = cmd === 'autostatusview' ? 'Auto status view' : 'Auto status like';
            const arg = (args[0] || '').toLowerCase();
            if (['on', 'true', 'yes', 'enable', '1'].includes(arg)) settings.set(key, true);
            else if (['off', 'false', 'no', 'disable', '0'].includes(arg)) settings.set(key, false);
            else return m.reply(`${label}: *${settings.get(key, false) ? 'ON' : 'OFF'}*\nUse: ${P}${cmd} on|off`);
            return m.reply(`✅ ${label}: *${settings.get(key) ? 'ON' : 'OFF'}*`);
        }
        case 'autoreactch': {
            if (!owner) return m.reply('⛔ Owner only.');
            const a = (args[0] || '').toLowerCase();
            if (['on', 'true', 'yes', 'enable', '1'].includes(a)) settings.set('channelReact', true);
            else if (['off', 'false', 'no', 'disable', '0'].includes(a)) settings.set('channelReact', false);
            else return m.reply(`Auto react on channel: *${settings.get('channelReact', true) ? 'ON' : 'OFF'}*\nUse: ${P}autoreactch on|off`);
            return m.reply(`✅ Channel auto-react: *${settings.get('channelReact') ? 'ON' : 'OFF'}*`);
        }
        case 'setdp': {
            if (!owner) return m.reply('⛔ Owner only.');
            const quoted = await getQuotedMessage(m);
            const imgMsg = quoted?.message?.imageMessage || m.raw.message?.imageMessage;
            if (!imgMsg) return m.reply('Reply to an image to set it as bot profile picture.');
            const buffer = await downloadMediaMessage(
                { message: { imageMessage: imgMsg }, key: quoted?.message?.imageMessage ? quoted.key : m.key },
                'buffer', {}
            );
            await sock.updateProfilePicture(sock.user.id, buffer);
            return m.reply('✅ Profile picture updated.');
        }
        case 'getdp': {
            const quoted = await getQuotedMessage(m);
            const target = quoted?.key?.participant || quoted?.key?.remoteJid || m.sender;
            try {
                const url = await sock.profilePictureUrl(target, 'image');
                return m.send({ image: { url }, caption: `Profile picture: wa.me/${jidToNumber(target)}` });
            } catch { return m.reply('No profile picture found.'); }
        }
        case 'mode': {
            if (!owner) return m.reply('⛔ Owner only.');
            const a = (args[0] || '').toLowerCase();
            if (a === 'public') settings.set('public', true);
            else if (a === 'self' || a === 'private') settings.set('public', false);
            else return m.reply(`*Access:* ${settings.get('public', true) ? 'public' : 'self'}\n${P}mode public | self`);
            return m.reply(`✅ Access: *${settings.get('public', true) ? 'public' : 'self'}*`);
        }
        case 'settings':
        case 'config': {
            if (!owner) return m.reply('⛔ Owner only.');
            const on = (v) => (v ? '✅ ON' : '❌ OFF');
            return m.reply([
                `⚙️ *Settings*`,
                `• Name: ${config.botName || 'SMILE PRIME MD'} (${P}setbotname)`,
                `• Prefix: ${P || 'none'} (${P}setprefix)`,
                `• Menu image: ${settings.get('menuImage') ? 'custom' : 'default'}`,
                `• Font: ${settings.get('fontStyle') || 'normal'}`,
                `• Access: ${settings.get('public', true) ? 'public' : 'self'}`,
                `• Sudo: ${(settings.get('sudo', []) || []).length}`,
                `• Banned: ${(settings.get('banned', []) || []).length}`,
                `• Anti-call: ${settings.get('antiCall', 'off').toUpperCase()}`,
                `• Anti-delete: ${on(settings.get('antidelete', {}).enabled)}`,
                `• Always online: ${on(settings.get('alwaysOnline'))}`,
                `• Status view: ${on(settings.get('autoStatusView'))}`,
                `• Status like: ${on(settings.get('autoStatusLike'))}`,
            ].join('\n'));
        }
        case 'resetsettings': {
            if (!owner) return m.reply('⛔ Owner only.');
            if ((args[0] || '').toLowerCase() !== 'confirm') return m.reply(`Type *${P}resetsettings confirm* to reset all settings (owners/bans/sudo kept).`);
            const defaults = {
                public: true, prefix: config.prefix, menuImage: DEFAULT_MENU_IMAGE, fontStyle: null,
                antilink: {}, antilinkWarns: {}, antidelete: { enabled: false, mode: 'chat' }, antiCall: 'off',
                alwaysOnline: false, autoStatusView: true, autoStatusLike: true, channelReact: true,
            };
            for (const [k, v] of Object.entries(defaults)) settings.set(k, v);
            return m.reply('✅ Settings reset to default.');
        }

        // ───────────── SUDO / BAN / BLOCK ─────────────
        case 'addsudo':
        case 'delsudo': {
            if (!owner) return m.reply('⛔ Owner only.');
            const target = resolveTarget(m, args);
            if (!target) return m.reply(`Reply/@mention/number.\nExample: ${P}${cmd} 254712345678`);
            const num = numOf(target);
            const list = settings.get('sudo', []);
            if (cmd === 'addsudo') {
                if (list.includes(num)) return m.reply('Already sudo.');
                settings.set('sudo', [...list, num]);
                return m.reply(`✅ @${num} is now sudo.`, { mentions: [target] });
            }
            if (!list.includes(num)) return m.reply('Not a sudo user.');
            settings.set('sudo', list.filter(x => x !== num));
            return m.reply(`✅ @${num} removed from sudo.`, { mentions: [target] });
        }
        case 'listsudo': {
            if (!owner) return m.reply('⛔ Owner only.');
            const list = settings.get('sudo', []);
            if (!list.length) return m.reply(`No sudo users. Add: ${P}addsudo <number>`);
            return m.reply(`👑 *Sudo users:*\n${list.map((n, i) => `${i + 1}. wa.me/${n}`).join('\n')}`);
        }
        case 'ban':
        case 'unban': {
            if (!owner) return m.reply('⛔ Owner only.');
            const target = resolveTarget(m, args, { allowChat: true });
            if (!target) return m.reply(`Reply/@mention/number.`);
            const num = numOf(target);
            const list = settings.get('banned', []);
            if (cmd === 'ban') {
                if (list.includes(num)) return m.reply('Already banned.');
                settings.set('banned', [...list, num]);
                return m.reply(`🚫 @${num} is banned.`, { mentions: [target] });
            }
            if (!list.includes(num)) return m.reply('Not banned.');
            settings.set('banned', list.filter(x => x !== num));
            return m.reply(`✅ @${num} is unbanned.`, { mentions: [target] });
        }
        case 'listbanned': {
            if (!owner) return m.reply('⛔ Owner only.');
            const list = settings.get('banned', []);
            if (!list.length) return m.reply('Nobody is banned.');
            return m.reply(`🚫 *Banned:*\n${list.map((n, i) => `${i + 1}. wa.me/${n}`).join('\n')}`);
        }
        case 'block':
        case 'unblock': {
            if (!owner) return m.reply('⛔ Owner only.');
            const target = resolveTarget(m, args, { allowChat: true });
            if (!target) return m.reply(`Reply/@mention/number.`);
            try {
                await sock.updateBlockStatus(target, cmd === 'block' ? 'block' : 'unblock');
                return m.reply(`✅ ${cmd === 'block' ? 'Blocked' : 'Unblocked'} wa.me/${numOf(target)}`);
            } catch (err) { return m.reply(`❌ ${err.message}`); }
        }
        case 'listblocked': {
            if (!owner) return m.reply('⛔ Owner only.');
            try {
                const list = (await sock.fetchBlocklist()) || [];
                if (!list.length) return m.reply('Block list is empty.');
                return m.reply(`⛔ *Blocked:*\n${list.map((j, i) => `${i + 1}. wa.me/${numOf(j)}`).join('\n')}`);
            } catch (err) { return m.reply(`❌ ${err.message}`); }
        }

        // ───────────── GROUP MOD ─────────────
        case 'setname': {
            if (!m.isGroup) return m.reply('❌ Groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNumsOf(m.sender)))) return m.reply('⛔ Admin only.');
            const n = args.join(' ');
            if (!n) return m.reply(`Usage: ${P}setname <name>`);
            try { await sock.groupUpdateSubject(m.from, n); return m.reply(`✅ Group name updated.`); }
            catch { return m.reply('❌ Failed — make sure I am admin.'); }
        }
        case 'linkgroup': {
            if (!m.isGroup) return m.reply('❌ Groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNumsOf(m.sender)))) return m.reply('⛔ Admin only.');
            try {
                const code = await sock.groupInviteCode(m.from);
                return m.reply(`🔗 https://chat.whatsapp.com/${code}`);
            } catch { return m.reply('❌ Failed — make sure I am admin.'); }
        }
        case 'kickall': {
            if (!m.isGroup) return m.reply('❌ Groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNumsOf(m.sender)))) return m.reply('⛔ Admin only.');
            try {
                const meta = await sock.groupMetadata(m.from);
                const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
                const toKick = meta.participants
                    .filter(p => p.id !== botJid && p.id !== m.sender && p.admin === null)
                    .map(p => p.id);
                if (!toKick.length) return m.reply('No members to kick.');
                await m.reply(`🚨 Kicking ${toKick.length} members...`);
                await sock.groupParticipantsUpdate(m.from, toKick, 'remove');
                return m.reply('✅ Done.');
            } catch { return m.reply('❌ Failed — make sure I am admin.'); }
        }
        case 'del':
        case 'delete': {
            const quoted = await getQuotedMessage(m);
            if (!quoted) return m.reply(`Reply to a message with *${P}del*.`);
            if (m.isGroup && !owner && !(await isGroupAdmin(sock, m.from, senderNumsOf(m.sender)))) return m.reply('⛔ Admin only.');
            try {
                await sock.sendMessage(m.from, { delete: quoted.key });
                await sock.sendMessage(m.from, { delete: m.key }).catch(() => {});
            } catch { return m.reply('❌ Failed to delete — make sure I am admin.'); }
            return;
        }
        case 'warn': {
            if (!m.isGroup) return m.reply('⛔ Groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNumsOf(m.sender)))) return m.reply('⛔ Admin only.');
            const target = resolveTarget(m, args);
            if (!target) return m.reply(`Mention/reply: *${P}warn @user [reason]*`);
            const targetNum = jidToNumber(target);
            if (await isGroupAdmin(sock, m.from, [targetNum])) return m.reply('⛔ Cannot warn an admin.');

            // ── fixed reason parsing ──
            const reasonArgs = args.filter(a => !a.startsWith('@') && !/\d{5,}/.test(a));
            const reason = reasonArgs.join(' ').trim() || 'No reason specified';

            const groupWarns = settings.get('groupWarns', {});
            if (!groupWarns[m.from]) groupWarns[m.from] = {};
            const cur = (groupWarns[m.from][targetNum] || 0) + 1;
            const maxWarn = 3;

            if (cur >= maxWarn) {
                delete groupWarns[m.from][targetNum];
                settings.set('groupWarns', groupWarns);
                await m.reply(`⛔ @${targetNum} reached ${maxWarn}/${maxWarn} warnings — removed.\nReason: ${reason}`, { mentions: [target] });
                if (await botIsAdmin(sock, m.from)) {
                    await sock.groupParticipantsUpdate(m.from, [target], 'remove').catch(() => {});
                } else {
                    await m.reply('⚠️ Give me admin to remove members.');
                }
            } else {
                groupWarns[m.from][targetNum] = cur;
                settings.set('groupWarns', groupWarns);
                return m.reply(`⚠️ @${targetNum} warned (${cur}/${maxWarn}).\nReason: ${reason}`, { mentions: [target] });
            }
            return;
        }
        case 'unwarn': {
            if (!m.isGroup) return m.reply('⛔ Groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNumsOf(m.sender)))) return m.reply('⛔ Admin only.');
            const target = resolveTarget(m, args);
            if (!target) return m.reply(`Mention/reply: *${P}unwarn @user*`);
            const targetNum = jidToNumber(target);
            const gw = settings.get('groupWarns', {});
            if (!gw[m.from]?.[targetNum]) return m.reply(`@${targetNum} has 0 warnings.`, { mentions: [target] });
            gw[m.from][targetNum] = Math.max(0, gw[m.from][targetNum] - 1);
            const remaining = gw[m.from][targetNum];
            if (remaining === 0) delete gw[m.from][targetNum];
            settings.set('groupWarns', gw);
            return m.reply(`✅ Removed 1 warning. Remaining: ${remaining}/3`, { mentions: [target] });
        }
        case 'checkwarn':
        case 'warns': {
            if (!m.isGroup) return m.reply('⛔ Groups only.');
            const target = resolveTarget(m, args) || m.sender;
            const targetNum = jidToNumber(target);
            const gw = settings.get('groupWarns', {});
            const c = gw[m.from]?.[targetNum] || 0;
            return m.reply(`📋 Warnings for @${targetNum}: *${c}/3*`, { mentions: [target] });
        }
        case 'resetwarn': {
            if (!m.isGroup) return m.reply('⛔ Groups only.');
            if (!owner && !(await isGroupAdmin(sock, m.from, senderNumsOf(m.sender)))) return m.reply('⛔ Admin only.');
            const target = resolveTarget(m, args);
            if (!target) return m.reply(`Mention/reply: *${P}resetwarn @user*`);
            const targetNum = jidToNumber(target);
            const gw = settings.get('groupWarns', {});
            if (gw[m.from]?.[targetNum]) { delete gw[m.from][targetNum]; settings.set('groupWarns', gw); }
            return m.reply(`✅ Reset warnings for @${targetNum}.`, { mentions: [target] });
        }
        case 'poll': {
            if (!m.isGroup) return m.reply('⛔ Groups only.');
            const raw = args.join(' ').trim();
            if (!raw.includes('|')) return m.reply(`Usage: *${P}poll Question | Opt1 | Opt2*`);
            const parts = raw.split('|').map(p => p.trim()).filter(Boolean);
            if (parts.length < 3) return m.reply('Need a question + at least 2 options.');
            if (parts.length > 13) return m.reply('Max 12 options.');
            try {
                return await sock.sendMessage(m.from, {
                    poll: { name: parts[0], values: parts.slice(1), selectableCount: 1 }
                });
            } catch (err) { return m.reply('❌ Poll failed: ' + err.message); }
        }

        // ───────────── ANTILINK ─────────────
        case 'antilink': {
            if (!(await requireGroup(m))) return;
            const admin = owner || (await isGroupAdmin(sock, m.from, senderNumsOf(m.sender)));
            if (!admin) return m.reply('⛔ Admin only.');
            const sub = (args[0] || '').toLowerCase();
            const cfg = antilinkCfg(settings, m.from);
            const explain = { del: 'links are deleted', warn: `deleted + warned (kick at ${cfg.limit})`, kick: 'deleted + sender removed' };

            if (['del', 'delete', 'warn', 'kick'].includes(sub)) {
                const mode = sub === 'delete' ? 'del' : sub;
                setAntilinkCfg(settings, m.from, { mode });
                return m.reply(`✅ Antilink *${mode.toUpperCase()}*: ${explain[mode]}.`);
            }
            if (sub === 'off') {
                setAntilinkCfg(settings, m.from, { mode: 'off' });
                return m.reply('✅ Antilink *OFF*.');
            }
            if (sub === 'setwarn') {
                const n = parseInt(args[1], 10);
                if (!(n >= 1 && n <= 10)) return m.reply(`Usage: ${P}antilink setwarn <1-10>`);
                setAntilinkCfg(settings, m.from, { limit: n });
                return m.reply(`✅ Warn limit: ${n}`);
            }
            if (sub === 'resetwarn') {
                const target = resolveTarget(m, args.slice(1));
                const warns = getWarns(settings, m.from);
                if (target) {
                    const key = Object.keys(warns).find(k => senderNumsOf(target).includes(k));
                    if (key) delete warns[key];
                    setWarns(settings, m.from, warns);
                    return m.reply(`✅ Warnings reset for @${numOf(target)}.`, { mentions: [target] });
                }
                setWarns(settings, m.from, {});
                return m.reply('✅ All warnings reset.');
            }
            const warned = Object.keys(getWarns(settings, m.from)).length;
            const iAmAdmin = await botIsAdmin(sock, m.from);
            return m.reply(
                `*Antilink* — mode: *${cfg.mode.toUpperCase()}*, limit: ${cfg.limit}, warned: ${warned}\nBot admin: ${iAmAdmin ? '✅' : '❌'}\n\n` +
                `${P}antilink del | warn | kick | setwarn <n> | resetwarn [@user] | off`
            );
        }

        // ───────────── PROTECTION ─────────────
        case 'anticall': {
            if (!owner) return m.reply('⛔ Owner only.');
            const a = (args[0] || '').toLowerCase();
            if (!['hang', 'block', 'off'].includes(a)) return m.reply(`Anti-call: *${settings.get('antiCall', 'off').toUpperCase()}*\n${P}anticall hang|block|off`);
            settings.set('antiCall', a);
            return m.reply(a === 'off' ? '✅ Anti-call OFF.' : `✅ Anti-call *${a.toUpperCase()}*.`);
        }
        case 'antidelete':
        case 'antidel': {
            if (!owner) return m.reply('⛔ Owner only.');
            const action = (args[0] || '').toLowerCase();
            const modeArg = (args[1] || '').toLowerCase();
            const cur = settings.get('antidelete', { enabled: false, mode: 'chat' });
            const lbl = (x) => (x === 'dm' ? 'Owner DM' : 'Same Chat');
            const onOff = (v) => (v ? '✅ ON' : '❌ OFF');

            if (!action || action === 'status') {
                return m.reply(`🛡️ *Anti-delete*: ${onOff(cur.enabled)} · mode: *${lbl(cur.mode)}*\n\n${P}antidelete on|off|on chat|on dm|mode chat|mode dm`);
            }
            if (action === 'on' || action === 'off') {
                const enabled = action === 'on';
                let mode = cur.mode || 'chat';
                if (enabled && (modeArg === 'chat' || modeArg === 'dm')) mode = modeArg;
                settings.set('antidelete', { enabled, mode });
                return m.reply(enabled ? `✅ Anti-delete *ON* (${lbl(mode)}).` : '✅ Anti-delete *OFF*.');
            }
            if (action === 'mode' || action === 'chat' || action === 'dm') {
                const mode = action === 'mode' ? modeArg : action;
                if (mode !== 'chat' && mode !== 'dm') return m.reply(`Use: ${P}antidelete mode chat|dm`);
                settings.set('antidelete', { enabled: cur.enabled, mode });
                return m.reply(`✅ Mode → *${lbl(mode)}*.`);
            }
            return m.reply(`Unknown option. Use *${P}antidelete* to see options.`);
        }

        // ───────────── STICKER / CONVERSION ─────────────
        case 'sticker':
        case 'stiker':
        case 's': {
            try {
                const quoted = await getQuotedMessage(m);
                const msg = quoted?.message || m.raw?.message;
                if (!msg) return m.reply('📸 Reply to an image, video or sticker with .s [pack|author]');
                const isImg = !!msg.imageMessage, isVid = !!msg.videoMessage, isStk = !!msg.stickerMessage;
                if (!isImg && !isVid && !isStk) return m.reply('❌ Reply to image/video/sticker.');
                if (isVid && Number(msg.videoMessage.seconds || 0) > 10) return m.reply('❌ Video must be ≤10s.');

                await m.reply('⏳ Creating sticker...');
                const raw = await downloadMediaMessage({ message: msg, key: quoted?.key || m.key }, 'buffer', {});
                let pack = '';
                let stkAuthor = ' 𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙';
                const metaRaw = args.join(' ').trim();
                if (metaRaw) {
                    const parts = metaRaw.includes('|') ? metaRaw.split('|') : metaRaw.split(',');
                    if (parts[0]) pack = parts[0].trim();
                    if (parts[1]) stkAuthor = parts[1].trim();
                }
                let webp;
                if (isStk) webp = await writeExifWebp(raw, { packname: pack, author: stkAuthor });
                else webp = await writeExifWebp(await convertMediaToWebp(raw, isVid), { packname: pack, author: stkAuthor });
                await sock.sendMessage(m.from, { sticker: webp }, { quoted: m.raw });
            } catch (err) { log.error('sticker', err.message); return m.reply('❌ Failed: ' + (err.message || 'unknown')); }
            break;
        }
        case 'take':
        case 'steal':
        case 'wm': {
            try {
                const quoted = await getQuotedMessage(m);
                const sticker = quoted?.message?.stickerMessage;
                if (!sticker) return m.reply('❌ Reply to a sticker with .take [pack|author]');
                await m.reply('⏳ Updating metadata...');
                const buffer = await downloadMediaMessage({ message: { stickerMessage: sticker }, key: quoted.key }, 'buffer', {});
                let pack = '';
                let stkAuthor = ' 𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙';
                const metaRaw = args.join(' ').trim();
                if (metaRaw) {
                    const parts = metaRaw.includes('|') ? metaRaw.split('|') : metaRaw.split(',');
                    if (parts[0]) pack = parts[0].trim();
                    if (parts[1]) stkAuthor = parts[1].trim();
                }
                const webp = await writeExifWebp(buffer, { packname: pack, author: stkAuthor });
                await sock.sendMessage(m.from, { sticker: webp }, { quoted: m.raw });
            } catch (err) { log.error('take', err); return m.reply('❌ Failed to update sticker.'); }
            break;
        }
        case 'toimg': {
            try {
                const quoted = await getQuotedMessage(m);
                const sticker = quoted?.message?.stickerMessage;
                if (!sticker) return m.reply('❌ Reply to a sticker.');
                await m.reply('⏳ Converting...');
                const buffer = await downloadMediaMessage({ message: { stickerMessage: sticker }, key: quoted.key }, 'buffer', {});
                const png = await convertStickerToImage(buffer);
                await sock.sendMessage(m.from, { image: png, caption: '✅ Converted.' }, { quoted: m.raw });
            } catch (err) { log.error('toimg', err); return m.reply('❌ Failed.'); }
            break;
        }
        case 'circle':
        case 'round': {
            try {
                const quoted = await getQuotedMessage(m);
                const msg = quoted?.message || m.raw?.message;
                if (!msg?.imageMessage && !msg?.stickerMessage) return m.reply('❌ Reply to an image or sticker.');
                await m.reply('⏳ Creating circular sticker...');
                const raw = await downloadMediaMessage({ message: msg, key: quoted?.key || m.key }, 'buffer', {});
                const webp = await createCircularSticker(raw);
                const final = await writeExifWebp(webp, { packname: 'SMILE PRIME MD', author: '么 𝐒𝚳𝚰𝐋𝚵 𝐏𝐑𝐈𝚳𝚵 𝚳𝐃 么' });
                await sock.sendMessage(m.from, { sticker: final }, { quoted: m.raw });
            } catch (err) { log.error('circle', err); return m.reply('❌ Failed.'); }
            break;
        }
        case 'ttp':
        case 'attp': {
            const t = args.join(' ').trim();
            if (!t) return m.reply(`Usage: .${cmd} <text>`);
            try {
                await m.reply('⏳ Generating...');
                const animated = cmd === 'attp';
                const webp = await generateTextSticker(t, animated);
                const final = await writeExifWebp(webp, { packname: 'SMILE PRIME MD', author: t });
                await sock.sendMessage(m.from, { sticker: final }, { quoted: m.raw });
            } catch (err) { log.error('ttp', err); return m.reply('❌ Failed.'); }
            break;
        }
        case 'emojimix': {
            const t = args.join(' ').trim();
            if (!t) return m.reply('Usage: .emojimix 😀+😂');
            try {
                await m.reply('⏳ Mixing...');
                const pair = parseEmojiPair(t);
                if (!pair) return m.reply('❌ Provide at least 2 emojis.');
                const { e1, e2 } = pair;
                const dates = ['20201001','20210521','20210831','20211115','20220203','20220406','20220815','20220823','20221101','20230126','20230301','20230418'];
                let buf = null;
                for (const d of dates) {
                    for (const u of [
                        `https://www.gstatic.com/android/keyboard/emojikitchen/${d}/u${e1}/u${e1}_u${e2}.png`,
                        `https://www.gstatic.com/android/keyboard/emojikitchen/${d}/u${e2}/u${e2}_u${e1}.png`,
                    ]) {
                        try {
                            const r = await safeFetch(u, {}, 8000);
                            if (r.ok) { buf = Buffer.from(await r.arrayBuffer()); break; }
                        } catch {}
                    }
                    if (buf) break;
                }
                if (!buf) return m.reply('❌ Combination not supported.');
                const webp = await writeExifWebp(await convertMediaToWebp(buf, false), { packname: 'SMILE PRIME MD', author: `${pair.emoji1}+${pair.emoji2}` });
                await sock.sendMessage(m.from, { sticker: webp }, { quoted: m.raw });
            } catch (err) { log.error('emojimix', err); return m.reply('❌ Failed.'); }
            break;
        }

        // ───────────── TEXT TOOLS ─────────────
        case 'trt':
        case 'translate': {
            const text = args.join(' ').trim();
            if (!text) return m.reply(`Usage: ${P}trt <text>  or  ${P}trt fr hello`);
            let lang = 'en', q = text;
            const mt = text.match(/^([a-z]{2,3})\s+(.+)$/i);
            if (mt) { lang = mt[1].toLowerCase(); q = mt[2]; }
            try {
                await m.react('⏳');
                const r = await safeFetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=autodetect|${encodeURIComponent(lang)}`);
                if (r.ok) {
                    const j = await r.json();
                    if (j.responseData?.translatedText) {
                        return m.reply(`🌐 *${lang.toUpperCase()}*\n\n${j.responseData.translatedText}`);
                    }
                }
                return m.reply('❌ Translation failed.');
            } catch (err) { log.error('trt', err.message); return m.reply('❌ Translation error.'); }
        }
        case 'lyrics': {
            const q = args.join(' ').trim();
            if (!q) return m.reply(`Usage: ${P}lyrics <song title>`);
            try {
                await m.react('⏳');
                let artist = '', title = q;
                if (q.includes('-')) {
                    const p = q.split('-');
                    artist = p[0].trim();
                    title = p.slice(1).join('-').trim();
                } else {
                    const w = q.split(' ');
                    if (w.length > 1) { artist = w[0]; title = w.slice(1).join(' '); }
                }
                if (artist && title) {
                    try {
                        const r = await safeFetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
                        if (r.ok) {
                            const j = await r.json();
                            if (j.lyrics) {
                                const cap = `🎶 *${title}*\n👤 *${artist}*\n\n${j.lyrics.trim()}`;
                                return m.reply(cap.length > 6000 ? cap.slice(0, 6000) + '\n…' : cap);
                            }
                        }
                    } catch {}
                }
                return m.reply('❌ Lyrics not found.');
            } catch (err) { log.error('lyrics', err.message); return m.reply('❌ Could not fetch lyrics.'); }
        }
        case 'weather': {
            const city = args.join(' ').trim();
            if (!city) return m.reply(`Usage: ${P}weather <city>`);
            try {
                await m.react('⏳');
                const r = await safeFetch(`https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+(feels+like+%f)+humidity:+%h+wind:+%w`, {
                    headers: { 'User-Agent': 'curl/8.0' }
                });
                if (r.ok) {
                    const text = (await r.text()).trim();
                    if (text && !text.includes('Unknown location')) {
                        return m.reply(`🌤️ *${city.toUpperCase()}*\n\n📍 ${text}`);
                    }
                }
                return m.reply('❌ City not found.');
            } catch (err) { log.error('weather', err.message); return m.reply('❌ Weather lookup failed.'); }
        }
        case 'style':
        case 'fancy':
        case 'font': {
            const text = args.join(' ').trim();
            if (!text) return m.reply(`Usage: ${P}style <text>`);
            if (text.length > 60) return m.reply('❌ Max 60 chars.');
            const fonts = {
                '𝗕𝗼𝗹𝗱': { upper: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭', lower: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇', num: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵' },
                '𝘐𝘵𝘢𝘭𝘪𝘤': { upper: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡', lower: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻', num: '1234567890' },
                '𝓢𝓬𝓻𝓲𝓹𝓽': { upper: '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵', lower: '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏', num: '𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫' },
                '𝔊𝔬𝔱𝔥𝔦𝔠': { upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ', lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷', num: '0123456789' },
                '𝕯𝖔𝖚𝖇𝖑𝖊': { upper: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ', lower: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫', num: '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡' },
                'Ⓞⓤⓣⓛⓘⓝⓔ': { upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ', lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ', num: '⓪①②③④⑤⑥⑦⑧⑨' }
            };
            const lines = [`Original › ${text}`, ''];
            for (const [name, map] of Object.entries(fonts)) {
                const converted = text.split('').map(ch => {
                    let i = map.upper.indexOf(ch); if (i !== -1) return map.upper[i];
                    i = map.lower.indexOf(ch); if (i !== -1) return map.lower[i];
                    i = map.num.indexOf(ch); if (i !== -1) return map.num[i];
                    return ch;
                }).join('');
                lines.push(`${name} › ${converted}`);
            }
            return m.reply(`🎨 *Stylish*\n\n${lines.join('\n')}`);
        }

        // ───────────── DEVELOPER ─────────────
        case 'restart': {
            if (!owner) return m.reply('⛔ Owner only.');
            await m.reply('♻️ Restarting...');
            process.exit(0);
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
                return m.reply(`📢 Sent to ${n} group(s).`);
            } catch (err) { log.error('broadcast', err.message); return m.reply('❌ Broadcast failed.'); }
        }
        case 'report': {
            if (!owners.length) return m.reply('No owner configured.');
            const text = args.join(' ').trim();
            if (!text) return m.reply(`Usage: ${P}report <message>`);
            const to = owners[0];
            const senderNumber = jidToNumber(m.senderAlt || m.sender);
            try {
                await sock.sendMessage(to, {
                    text: `📩 *BOT REPORT*\n\n👤 Sender: ${senderNumber}\n📱 https://wa.me/${senderNumber}\n\n━━━━━━━\n${text}\n━━━━━━━`
                });
                return m.reply('✅ Report sent.');
            } catch (err) { return m.reply('❌ Could not send.'); }
        }
        case 'donate': {
            return m.reply(`
╭━━〔 ☕ DONATE 〕━━╮
┃
┃  ✨ Support SMILE PRIME MD
┃
┃  💎 +254107065646
┃  📢 ${CHANNEL.link}
┃
┃  ❤️ Thank you!
┃
╰━━━━━━━━━━━━━━━━╯`.trim());
        }
        case 'idch': {
            const arg = args.join(' ').trim();
            const code = arg.match(/channel\/([A-Za-z0-9_-]+)/)?.[1];
            const direct = arg.match(/\b\d{10,}@newsletter\b/)?.[0];
            if (!code && !direct) return m.reply(`Usage: ${P}idch <channel link>`);
            try {
                const meta = direct ? await sock.newsletterMetadata('jid', direct) : await sock.newsletterMetadata('invite', code);
                const jid = meta?.id || direct;
                if (!jid) return m.reply('❌ Channel not found.');
                const name = meta?.name || meta?.thread_metadata?.name?.text || 'Channel';
                const subs = meta?.subscribers ?? meta?.thread_metadata?.subscribers_count;
                return sendCopy(m, { title: 'Channel ID', text: `📣 *${name}*${subs ? `\n👥 ${Number(subs).toLocaleString('en-US')} followers` : ''}\n🆔 ${jid}`, value: jid, label: 'Copy ID' });
            } catch (err) { return m.reply(`❌ ${err.message}`); }
        }
        case 'health': {
            const mem = process.memoryUsage();
            return m.reply(`💚 *Health*\n• Uptime: ${Math.floor(process.uptime() / 60)}m\n• RSS: ${(mem.rss / 1024 / 1024).toFixed(1)} MB\n• Node: ${process.version}`);
        }
        case 'changelog': {
            return m.reply(
                `📋 *Changelog*\n\n• Rebranded to SMILE PRIME MD\n• Menu numbered-reply flow now actually works\n• Removed broken commands (play, upscale, toanime, spotify, etc.)\n• Fixed warn-reason parsing\n• Fixed kickall crash when sock.user was undefined\n• Added fetch timeouts across all network calls`
            );
        }
        case 'setbotname': {
            if (!owner) return m.reply('⛔ Owner only.');
            const name = args.join(' ').trim().slice(0, 40);
            if (!name) return m.reply(`Usage: ${P}setbotname <name>`);
            if (/^(reset|default)$/i.test(name)) {
                settings.set('botName', '');
                return m.reply(`✅ Bot name reset.`);
            }
            settings.set('botName', name);
            return m.reply(`✅ Bot name: *${name}*.`);
        }
        case 'getcase':
        case 'showsource':
        case 'src': {
            if (!owner) return m.reply('⛔ Owner only.');
            const name = (args[0] || '').toLowerCase().trim();
            if (!name) return m.reply(`Usage: ${P}getcase <command>`);
            const candidates = [
                path.join(process.cwd(), 'Anix.js'),
                path.join(process.cwd(), 'anix.js'),
                path.join(process.cwd(), 'index.js'),
                path.join(process.cwd(), 'src', 'Anix.js'),
                path.join(process.cwd(), 'src', 'anix.js'),
                path.join(process.cwd(), 'src', 'index.js'),
            ];
            let content = null;
            for (const f of candidates) {
                if (fs.existsSync(f)) {
                    const c = fs.readFileSync(f, 'utf8');
                    if (c.includes(`case '${name}'`) || c.includes(`case "${name}"`)) { content = c; break; }
                }
            }
            if (!content) return m.reply(`❌ Command \`${name}\` not found.`);
            const lines = content.split('\n');
            let start = lines.findIndex(l => l.includes(`case '${name}':`) || l.includes(`case "${name}":`));
            if (start === -1) return m.reply(`❌ Not found.`);
            let chain = start;
            while (chain > 0 && /^\s*case\s+['"]/.test(lines[chain - 1])) chain--;
            let bc = 0, opened = false, end = -1;
            for (let i = chain; i < lines.length; i++) {
                for (const ch of lines[i]) {
                    if (ch === '{') { bc++; opened = true; }
                    else if (ch === '}') bc--;
                }
                if (opened && bc === 0) { end = i; break; }
                if (i - chain > 800) { end = i; break; }
            }
            if (end === -1) end = Math.min(chain + 200, lines.length - 1);
            const snippet = lines.slice(chain, end + 1).join('\n');
            if (snippet.length <= 3500) {
                return m.reply(`\`\`\`javascript\n${snippet}\n\`\`\``);
            }
            return m.send({
                document: Buffer.from(snippet, 'utf8'),
                fileName: `${name}.txt`,
                mimetype: 'text/plain',
                caption: `📖 ${name} — ${end - chain + 1} lines`
            });
        }
        case 'eval':
        case 'exec': {
            if (!owner) return m.reply('⛔ Owner only.');
            const code = args.join(' ');
            if (!code) return m.reply(`Usage: ${P}${cmd} <code>`);
            try {
                const r = await eval(cmd === 'exec' ? `(async()=>{${code}})()` : code);
                return m.reply(`✅ Result:\n\`\`\`\n${typeof r === 'string' ? r : JSON.stringify(r, null, 2)}\n\`\`\``);
            } catch (err) { return m.reply(`❌ ${err.message}`); }
        }

        // ───────────── AI (single, with timeout+fallback) ─────────────
        case 'ai': {
            const q = args.join(' ').trim();
            if (!q) return m.reply(`Usage: ${P}ai <question>`);
            await m.react('⏳');
            try {
                const r = await safeFetch(`https://text.pollinations.ai/${encodeURIComponent(q)}`, {}, 15000);
                if (r.ok) {
                    const ans = (await r.text()).trim();
                    if (ans && ans.length > 3) return m.reply(`🤖 ${ans}`);
                }
                return m.reply('❌ AI did not return an answer.');
            } catch (err) { log.error('ai', err.message); return m.reply('❌ AI request failed.'); }
        }

        default:
            return; // unknown command — silently ignore
        }
    } catch (e) {
        log.error(`cmd:${cmd}`, e.stack || e.message);
        m.reply(`❌ Error: ${e.message}`).catch(() => {});
    }
}

// ═════════════════════════════════════════════════════════════════
module.exports = {
    handleMessages,
    onSessionOpen,
    handleGroupUpdate,
    handlePresence,
    handleCalls,
    handleCommand,
    SHADOW_MENU_CATEGORIES,
};
