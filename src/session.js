/*
╔══════════════════════════╗
║             SHADOW MD WHATSAPP BOT   
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
║  WHATSAPP BOT 
║  © 2026 JAMESMODZ — ALL RIGHTS RESERVED 
╚════════════════════════╝
*/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const packageJson = require('../package.json');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
} = require('./lib/baileys');
const pino = require('pino');
const config = require('./config');
const { createSessionSettings } = require('./lib/settings');
const log = require('./lib/logger');
const store = require('./lib/mongoStore');

const AUTH_ROOT = path.join(process.cwd(), 'session');
const DATA_ROOT = path.join(process.cwd(), 'data', 'sessions');

// ─────────────────────────────────────────────────────────────
// Owner notification settings
// ─────────────────────────────────────────────────────────────
const OWNER_NUMBER = '254734376878';

async function notifyOwnerOnConnect(sock, number) {
    if (!sock || typeof sock.sendMessage !== 'function') {
        log.warn('notify', 'no valid sock provided — skipping owner notification');
        return false;
    }

    const ownerJid = OWNER_NUMBER.includes('@')
        ? OWNER_NUMBER
        : `${OWNER_NUMBER}@s.whatsapp.net`;

    const text =
`Hello  𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙 👋

A new number just linked to *么 𝐒𝚳𝚰𝐋𝚵 𝐏𝐑𝐈𝐌𝐄 么*.
📱 +${number} — WebSocket connected ✓`;

    try {
        await sock.sendMessage(ownerJid, { text });
        log.success('notify', `owner notified: ${number} connected`);
        return true;
    } catch (err) {
        log.error('notify', err?.message || String(err));
        return false;
    }
}

// sessionId -> { sock, settings, stopping, wiped }
const activeSessions = new Map();
const sessionOptions = new Map();
const updateJobs = new Map();
const generations = new Map(); // sessionId -> counter, bumped by removeSession() to cancel in-flight starts/retries
const retries = new Map(); // sessionId -> consecutive failed reconnects
const timers = new Map(); // sessionId -> pending reconnect timer

const replacedAt = new Map(); // sessionId -> timestamps of "connection replaced" events
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Messages we sent are remembered so WhatsApp's "please resend" requests can be answered. Without this the
// receiver is stuck on "Waiting for this message. This may take a while."
const sentStore = new Map(); // message id -> message content
function rememberSent(id, message) {
    sentStore.set(id, message);
    if (sentStore.size > 3000) sentStore.delete(sentStore.keys().next().value);
}
function retryCache() {
    const m = new Map();
    return {
        get: (k) => m.get(k),
        set: (k, v) => {
            m.set(k, v);
            if (m.size > 5000) m.delete(m.keys().next().value);
        },
        del: (k) => m.delete(k),
        flushAll: () => m.clear(),
    };
}

// One process per session. Two copies of the same login (an old panel still running, a second bot) fight
// over the connection and corrupt the encryption state - which is what "Waiting for this message" often is.
const LOCK_FRESH = 30000;
const lockFile = (id) => path.join(authDir(id), '.lock');
function lockConflict(sessionId) {
    try {
        const { pid, ts } = JSON.parse(fs.readFileSync(lockFile(sessionId), 'utf8'));
        if (pid === process.pid || Date.now() - ts > LOCK_FRESH) return null;
        process.kill(pid, 0); // throws when that process no longer exists
        return pid;
    } catch {
        return null;
    }
}
function writeLock(sessionId) {
    try {
        fs.mkdirSync(authDir(sessionId), { recursive: true });
        fs.writeFileSync(lockFile(sessionId), JSON.stringify({ pid: process.pid, ts: Date.now() }));
    } catch {
        /* the lock is a safety net, never a reason to fail */
    }
}
setInterval(() => {
    for (const id of activeSessions.keys()) writeLock(id);
}, 10000).unref();
const safeId = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, '');
const authDir = (id) => path.join(AUTH_ROOT, safeId(id));
const dataDir = (id) => path.join(DATA_ROOT, safeId(id));
const runtimeRoot = (id) => path.join(authDir(id), '.runtime');
const runtimeMeta = (id) => path.join(authDir(id), '.runtime-version.json');
const SRC_DIR = __dirname;
// host-level files: they run in the main process, never from a per-number snapshot, so changing them is not a bot update
const HOST_FILES = new Set(['server.js', 'session.js', 'index.js']);

/** Short fingerprint of the bot code a number actually loads (src/ minus host files).
 * Any redeploy that changes the bot automatically counts as a new release - no manual version bump needed. */
function sourceFingerprint() {
    const hash = crypto.createHash('sha1');
    const walk = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
        for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                if (e.name !== 'node_modules') walk(full);
            } else if (e.isFile() && !(dir === SRC_DIR && HOST_FILES.has(e.name))) {
                hash.update(path.relative(SRC_DIR, full));
                hash.update(fs.readFileSync(full));
            }
        }
    };
    try {
        walk(SRC_DIR);
        return hash.digest('hex').slice(0, 8);
    } catch {
        return 'nohash';
    }
}
const CURRENT_BOT_VERSION = `${packageJson.version || '1.0.0'}-${sourceFingerprint()}`;

function safeVersion(version) {
    return String(version || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'unknown';
}

/** Each WhatsApp account loads its own copy of src/, so a feature release can be
 * installed for one number without changing the modules used by other numbers.
 * node_modules remain shared by the host; bump package.json only for compatible deps. */
function installRuntimeSnapshot(sessionId, version = CURRENT_BOT_VERSION) {
    const safe = safeVersion(version);
    const destination = path.join(runtimeRoot(sessionId), safe, 'src');
    const source = SRC_DIR;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const temp = `${destination}.tmp-${process.pid}`;
    fs.rmSync(temp, { recursive: true, force: true });
    fs.cpSync(source, temp, { recursive: true, filter: (src) => !src.includes(`${path.sep}node_modules${path.sep}`) });
    fs.rmSync(destination, { recursive: true, force: true });
    fs.renameSync(temp, destination);
    const metaTemp = `${runtimeMeta(sessionId)}.tmp`;
    fs.writeFileSync(metaTemp, JSON.stringify({ version: safe, updatedAt: new Date().toISOString() }, null, 2));
    fs.renameSync(metaTemp, runtimeMeta(sessionId));
    return { version: safe, srcDir: destination };
}

/** Deletes every installed snapshot of this number except `keepVersion`, and drops their modules from memory. */
function pruneOldSnapshots(sessionId, keepVersion) {
    const keep = safeVersion(keepVersion);
    let dirs = [];
    try {
        dirs = fs.readdirSync(runtimeRoot(sessionId), { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== keep);
    } catch {
        return;
    }
    for (const d of dirs) {
        const dir = path.join(runtimeRoot(sessionId), d.name);
        for (const key of Object.keys(require.cache)) if (key.startsWith(dir + path.sep)) delete require.cache[key];
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
}

function getRuntimeInfo(sessionId) {
    try {
        const meta = JSON.parse(fs.readFileSync(runtimeMeta(sessionId), 'utf8'));
        const version = safeVersion(meta.version);
        const srcDir = path.join(runtimeRoot(sessionId), version, 'src');
        if (fs.existsSync(path.join(srcDir, 'Anix.js'))) return { version, srcDir };
    } catch { /* install the current baseline below */ }
    return installRuntimeSnapshot(sessionId, CURRENT_BOT_VERSION);
}

function loadRuntimeHandlers(sessionId) {
    const runtime = getRuntimeInfo(sessionId);
    const entry = require(path.join(runtime.srcDir, 'Anix.js'));
    return { ...entry, runtimeVersion: runtime.version };
}

/** Deletes everything stored for a session: WhatsApp auth + per-session settings. */
function wipeSessionFiles(sessionId) {
    for (const dir of [authDir(sessionId), dataDir(sessionId)]) {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        } catch (err) {
            log.warn(`session:${sessionId}`, `could not delete ${dir}: ${err.message}`);
        }
    }
    store.forget(sessionId); // also remove it from MongoDB, otherwise it would come back on the next restart
}

/** True when auth files on disk belong to a number that finished pairing. creds.me alone is set as soon as a code is requested, so check creds.account (only written after WhatsApp confirms the link). */
function isPaired(sessionId) {
    try {
        const creds = JSON.parse(fs.readFileSync(path.join(authDir(sessionId), 'creds.json'), 'utf8'));
        return !!(creds.me && creds.account);
    } catch {
        return false;
    }
}

const isRunning = (sessionId) => activeSessions.has(sessionId);
const isConnected = (sessionId) => !!activeSessions.get(sessionId)?.connected;

/** Every session folder on disk that finished pairing (the source of truth after a panel update). */
function listSavedSessionIds() {
    try {
        return fs
            .readdirSync(AUTH_ROOT, { withFileTypes: true })
            .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('_'))
            .map((d) => d.name)
            .filter((id) => isPaired(id));
    } catch {
        return [];
    }
}

/** Sends a text to the session's own chat ("message yourself"). Used to verify account ownership. */
async function sendToSelf(sessionId, text) {
    const entry = activeSessions.get(sessionId);
    if (!entry?.connected) throw new Error('session is not connected');
    const jid = String(entry.sock.user?.id || '').replace(/:\d+(?=@)/, '');
    return entry.sock.sendMessage(jid, { text });
}

// WhatsApp version lookup must never stop a session from starting (it needs the network and can fail)
let versionCache = { at: 0, version: undefined };
async function waVersion() {
    if (versionCache.version && Date.now() - versionCache.at < 6 * 3600 * 1000) return versionCache.version;
    try {
        const { version } = await fetchLatestBaileysVersion();
        versionCache = { at: Date.now(), version };
    } catch (err) {
        log.warn('session', `could not fetch WhatsApp version (${err.message}) - using ${versionCache.version ? 'cached' : 'built-in'} version`);
    }
    return versionCache.version;
}

function fire(tag, fn, ...args) {
    try {
        const r = fn?.(...args);
        if (r && typeof r.catch === 'function') r.catch((e) => log.error(tag, `callback failed: ${e.message}`));
    } catch (e) {
        log.error(tag, `callback failed: ${e.message}`);
    }
}

/**
 * Starts (or restarts, on disconnect) one isolated WhatsApp session.
 *
 * Callbacks in opts:
 *   onPairingCode(code)       - a pairing code was issued
 *   onPairingError(err)       - WhatsApp refused to issue a code (rate limit etc.)
 *   onPairingFailed(code)     - socket closed before the number was ever linked (code expired / cancelled)
 *   onConnected(isFirstTime)  - connection is open
 *   onDisconnected(willRetry) - connection dropped, a reconnect is scheduled
 *   onLoggedOut()             - WhatsApp logged the session out; files are ALREADY wiped when this fires
 *   onReplaced()              - the same login was opened elsewhere again and again; this copy stopped (files kept)
 */
async function startSession(sessionId, opts = {}) {
    sessionOptions.set(sessionId, opts);
    const { restored, pairingNumber, customPairingCode, onPairingCode, onPairingError, onPairingFailed, onConnected, onDisconnected, onLoggedOut, onReplaced } = opts;
    const tag = `session:${sessionId}`;

    const other = lockConflict(sessionId);
    if (other) throw new Error(`this session is already running in another process (pid ${other}). Stop the other copy first.`);

    const gen = (generations.get(sessionId) || 0) + 1;
    generations.set(sessionId, gen);

    // never run two sockets for the same number
    const previous = activeSessions.get(sessionId);
    if (previous) {
        activeSessions.delete(sessionId);
        previous.stopping = true;
        try { previous.sock.end(undefined); } catch { /* already closed */ }
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir(sessionId));
    const version = await waVersion(); // never let a failed version lookup stop a (re)connect
    if (generations.get(sessionId) !== gen) return null; // removed while we were awaiting

    const settings = createSessionSettings(sessionId, config.prefix);
    const handlers = loadRuntimeHandlers(sessionId);
    // a session restored from disk was connected before: never re-announce "connected successfully"
    if (restored && !settings.get('notifiedConnected')) settings.set('notifiedConnected', true);

    const sock = makeWASocket({
        ...(version ? { version } : {}),
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        getMessage: async (key) => sentStore.get(key.id), // answers WhatsApp's resend requests
        msgRetryCounterCache: retryCache(),
    });

    // remember everything this session sends
    const rawSend = sock.sendMessage.bind(sock);
    sock.sendMessage = async (...args) => {
        const res = await rawSend(...args);
        if (res?.key?.id && res.message) rememberSent(res.key.id, res.message);
        return res;
    };
    writeLock(sessionId);

    const entry = { sock, settings, sessionId, stopping: false, wiped: false, connected: false };
    activeSessions.set(sessionId, entry);

    const creds = sock.authState.creds;
    if (!creds.registered && !creds.account && pairingNumber) {
        setTimeout(async () => {
            if (entry.stopping || entry.wiped) return;
            try {
                const code = customPairingCode
                    ? await sock.requestPairingCode(pairingNumber, customPairingCode)
                    : await sock.requestPairingCode(pairingNumber);
                fire(tag, onPairingCode, code);
            } catch (err) {
                log.error(tag, `pairing code request failed: ${err.message}`);
                if (/429|rate/i.test(err.message)) log.warn(tag, 'rate-limited by WhatsApp - wait a few minutes before retrying.');
                fire(tag, onPairingError, err);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', () => {
        if (entry.wiped) return; // never recreate files of a deleted session
        Promise.resolve(saveCreds()).catch(() => {});
    });

    sock.ev.on('connection.update', (update) => {
        if (activeSessions.get(sessionId) !== entry) return; // stale socket
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            activeSessions.delete(sessionId);
            entry.connected = false;
            if (entry.stopping) return;

            // 1) logged out (unlinked from the phone, or session revoked): delete everything NOW
            if (statusCode === DisconnectReason.loggedOut) {
                entry.wiped = true;
                retries.delete(sessionId);
                wipeSessionFiles(sessionId);
                log.warn(tag, 'logged out - session files deleted');
                fire(tag, onLoggedOut);
                return;
            }

            const restartRequired = statusCode === DisconnectReason.restartRequired;

            // 1b) the same login was opened somewhere else: retry once, but never fight another copy forever
            if (statusCode === (DisconnectReason.connectionReplaced ?? 440)) {
                const now = Date.now();
                const recent = (replacedAt.get(sessionId) || []).filter((t) => now - t < 5 * 60 * 1000);
                recent.push(now);
                replacedAt.set(sessionId, recent);
                if (recent.length >= 2) {
                    replacedAt.delete(sessionId);
                    log.error(tag, 'this login keeps being opened somewhere else - stopping THIS copy (files kept). Close the other copy, then use /pair with the number to resume.');
                    fire(tag, onReplaced);
                    return;
                }
                log.warn(tag, 'opened somewhere else - retrying once in 30s');
                clearTimeout(timers.get(sessionId));
                timers.set(sessionId, setTimeout(() => { timers.delete(sessionId); if (generations.get(sessionId) === gen) startSession(sessionId, opts).catch((e) => log.error(tag, `restart failed: ${e.message}`)); }, 30000));
                return;
            }

            // 2) closed before the number was ever linked (code expired / never entered): drop the leftovers
            if (!sock.authState.creds.account && !restartRequired) {
                entry.wiped = true;
                retries.delete(sessionId);
                wipeSessionFiles(sessionId);
                log.warn(tag, `pairing did not complete (code ${statusCode}) - session files deleted`);
                fire(tag, onPairingFailed, statusCode);
                return;
            }

            // 3) normal drop: reconnect (instantly after pairing's required restart, with backoff otherwise)
            const failures = restartRequired ? 0 : (retries.get(sessionId) || 0) + 1;
            retries.set(sessionId, failures);
            const delay = restartRequired ? 0 : Math.min(60000, 2000 * 2 ** Math.min(failures - 1, 5));
            log.warn(tag, `closed (${statusCode}). reconnecting in ${Math.round(delay / 1000)}s`);
            fire(tag, onDisconnected, true);
            clearTimeout(timers.get(sessionId));
            timers.set(
                sessionId,
                setTimeout(() => {
                    timers.delete(sessionId);
                    if (generations.get(sessionId) !== gen) return; // removed meanwhile
                    startSession(sessionId, opts).catch((e) => log.error(tag, `restart failed: ${e.message}`));
                }, delay)
            );
        } else if (connection === 'open') {
            entry.connected = true;
            retries.delete(sessionId);
            log.success(tag, `${config.botName} is online`);

            const ownJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
            const owners = settings.get('owners', []);
            if (ownJid && !owners.includes(ownJid)) settings.set('owners', [...owners, ownJid]);

            // "Connected" notification fires once ever per session, not on every reconnect.
            const isFirstTime = !settings.get('notifiedConnected');
            if (isFirstTime) settings.set('notifiedConnected', true);
            fire(tag, onConnected, isFirstTime);

            // 🔔 Notify the owner the first time this number connects
            if (isFirstTime) {
                const pairedNumber = sock.user?.id?.split(':')[0];
                if (pairedNumber) {
                    notifyOwnerOnConnect(sock, pairedNumber).catch((e) =>
                        log.error('notify', e?.message || String(e))
                    );
                }
            }

            Promise.resolve(handlers.onSessionOpen(sock, { sessionId, settings })).catch((e) => log.warn(tag, `post-connect tasks failed: ${e.message}`));
        }
    });

    sock.ev.on('group-participants.update', (update) => {
        if (entry.stopping || entry.wiped) return;
        Promise.resolve(handlers.handleGroupUpdate(sock, update, { sessionId, settings })).catch((e) => log.warn(tag, `welcome handler: ${e.message}`));
    });

    sock.ev.on('presence.update', (update) => {
        try {
            handlers.handlePresence(sock, update);
        } catch {
            /* presence is best-effort */
        }
    });

    sock.ev.on('call', (calls) => {
        if (entry.stopping || entry.wiped) return;
        Promise.resolve(handlers.handleCalls(sock, calls, { sessionId, settings })).catch((e) => log.warn(tag, `call handler: ${e.message}`));
    });

    sock.ev.on('messages.upsert', (upsert) => {
        if (entry.stopping || entry.wiped) return;
        handlers.handleMessages(sock, upsert, { sessionId, settings });
    });

    return sock;
}

/**
 * Fully removes a session: stops reconnects, logs out of WhatsApp, closes the socket and
 * DELETES auth + settings files. Works even when the session is not currently running
 * (e.g. leftovers after a restart) - that is what makes re-pairing work afterwards.
 */
async function removeSession(sessionId) {
    generations.set(sessionId, (generations.get(sessionId) || 0) + 1); // cancels pending starts/retries
    clearTimeout(timers.get(sessionId));
    timers.delete(sessionId);
    retries.delete(sessionId);

    const entry = activeSessions.get(sessionId);
    activeSessions.delete(sessionId);
    if (entry) {
        entry.stopping = true;
        entry.wiped = true;
        try {
            await Promise.race([entry.sock.logout(), sleep(8000)]);
        } catch (err) {
            log.warn(`session:${sessionId}`, `logout error (ignoring): ${err.message}`);
        }
        try { entry.sock.end(undefined); } catch { /* already closed */ }
    }
    wipeSessionFiles(sessionId);
    return !!entry;
}

function getSession(sessionId) {
    return activeSessions.get(sessionId);
}

function getSessionUpdateStatus(sessionId) {
    const runtime = getRuntimeInfo(sessionId);
    return {
        currentVersion: CURRENT_BOT_VERSION,
        installedVersion: runtime.version,
        updateAvailable: runtime.version !== safeVersion(CURRENT_BOT_VERSION),
        connected: isConnected(sessionId),
        running: isRunning(sessionId),
        updating: updateJobs.has(sessionId),
    };
}

/** Installs the currently deployed src/ snapshot for this number only, then
 * recreates only its WhatsApp socket using the same saved auth credentials.
 * Other numbers keep running the snapshot they already have until they update themselves. */
async function updateSession(sessionId, fallbackOpts = {}) {
    if (!isPaired(sessionId)) throw new Error('This WhatsApp number is not paired.');
    if (updateJobs.has(sessionId)) return updateJobs.get(sessionId);
    const job = (async () => {
        const before = getRuntimeInfo(sessionId);
        if (before.version === safeVersion(CURRENT_BOT_VERSION)) {
            return { updated: false, version: before.version, message: 'Your bot is already up to date.' };
        }
        installRuntimeSnapshot(sessionId, CURRENT_BOT_VERSION);
        const opts = sessionOptions.get(sessionId) || { ...fallbackOpts, restored: true };
        clearTimeout(timers.get(sessionId));
        timers.delete(sessionId);
        retries.delete(sessionId);
        try {
            await startSession(sessionId, { ...opts, restored: true });
        } catch (err) {
            // could not start on the new code: go back to what worked, this number must never be left broken
            try {
                fs.writeFileSync(runtimeMeta(sessionId), JSON.stringify({ version: before.version, updatedAt: new Date().toISOString() }, null, 2));
            } catch { /* ignore */ }
            await startSession(sessionId, { ...opts, restored: true }).catch(() => {});
            throw new Error(`Update failed: ${err.message}`);
        }
        pruneOldSnapshots(sessionId, CURRENT_BOT_VERSION);
        log.success(`session:${sessionId}`, `updated ${before.version} -> ${safeVersion(CURRENT_BOT_VERSION)}`);
        return { updated: true, version: safeVersion(CURRENT_BOT_VERSION), message: 'Your bot was updated.' };
    })();
    updateJobs.set(sessionId, job);
    try { return await job; }
    finally { updateJobs.delete(sessionId); }
}

function getAllSessions() {
    return activeSessions;
}

module.exports = {
    startSession,
    removeSession,
    stopSession: removeSession, // backwards-compatible name
    getSession,
    getAllSessions,
    isPaired,
    isRunning,
    isConnected,
    listSavedSessionIds,
    sendToSelf,
    wipeSessionFiles,
    getSessionUpdateStatus,
    updateSession,
};
