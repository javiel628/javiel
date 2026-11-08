/*
╔══════════════════════════════════════╗
║        亗 SHADOW LINK 亗 — PAIRING SERVER
║   Lets the SHADOW LINK website pair numbers
║   and keeps every linked number online 24/7.
╚══════════════════════════════════════╝
*/
require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const config = require('./config');
const {
    startSession,
    removeSession,
    isPaired,
    isRunning,
    isConnected,
    listSavedSessionIds,
    getAllSessions,
} = require('./session');
const log = require('./lib/logger');
const { printBox } = require('./lib/console');

const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.PAIR_API_KEY || '';
const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');
const CUSTOM_CODE = /^[A-Z0-9]{8}$/i.test(config.customPairingCode || '') ? config.customPairingCode.toUpperCase() : '';
const STARTED_AT = Date.now();
// the 亗 SHADOW LINK 亗 website, served by the bot itself (already connected, no setup)
let SITE_HTML = '<h1>亗 SHADOW LINK 亗</h1>';
try {
    SITE_HTML = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
} catch (err) {
    log.warn('http', `website file missing: ${err.message}`);
}

// ── never let one bad message take the whole bot down ─────────────────────────
process.on('uncaughtException', (err) => log.error('process', `uncaught: ${err?.stack || err}`));
process.on('unhandledRejection', (err) => log.error('process', `unhandled: ${err?.stack || err}`));

const pending = new Map(); // number -> { at, promise }
const stoppedOnPurpose = new Set(); // sessions that were replaced elsewhere: don't auto-restart them
const downSince = new Map(); // number -> timestamp first seen offline by the watchdog

const cleanNumber = (n) => String(n || '').replace(/[^0-9]/g, '');
const validNumber = (n) => /^[1-9][0-9]{7,14}$/.test(n);

function baseOpts(number) {
    return {
        onConnected: (first) => {
            stoppedOnPurpose.delete(number);
            downSince.delete(number);
            log.success('pair', `${number} is online${first ? ' (first link)' : ''}`);
        },
        onLoggedOut: () => log.warn('pair', `${number} logged out from the phone - removed`),
        onReplaced: () => {
            stoppedOnPurpose.add(number);
            log.warn('pair', `${number} is running somewhere else - paused here`);
        },
    };
}

function resumeSession(number) {
    stoppedOnPurpose.delete(number);
    return startSession(number, { restored: true, ...baseOpts(number) });
}

/** Starts a fresh pairing for a number and resolves with the 8-character code. */
async function requestCode(number) {
    if (isConnected(number)) return { status: 'already_linked' };
    if (isPaired(number)) {
        if (!isRunning(number)) await resumeSession(number);
        return { status: 'already_linked' };
    }

    const existing = pending.get(number);
    if (existing && Date.now() - existing.at < 60000) return existing.promise;

    // leftovers from an earlier attempt that was never completed (running or only on disk)
    await removeSession(number);

    const promise = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('WhatsApp did not answer in time. Try again.')), 45000);
        startSession(number, {
            pairingNumber: number,
            customPairingCode: CUSTOM_CODE,
            ...baseOpts(number),
            onPairingCode: (code) => {
                clearTimeout(timer);
                resolve({ status: 'code', code: String(code).toUpperCase() });
            },
            onPairingError: (err) => {
                clearTimeout(timer);
                const rate = /429|rate/i.test(err?.message || '');
                reject(new Error(rate ? 'WhatsApp is limiting requests for this number. Wait a few minutes.' : 'WhatsApp refused the request. Check the number and try again.'));
            },
            onPairingFailed: () => log.warn('pair', `${number} did not enter the code in time`),
        }).catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
    }).finally(() => setTimeout(() => pending.delete(number), 60000));

    pending.set(number, { at: Date.now(), promise });
    return promise;
}

// ── tiny per-IP rate limit for the pairing endpoint ───────────────────────────
const hits = new Map();
function limited(ip) {
    const now = Date.now();
    const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
    list.push(now);
    hits.set(ip, list);
    return list.length > 8;
}

function send(res, status, body) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type, x-api-key',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(body));
}

function readBody(req) {
    return new Promise((resolve) => {
        let raw = '';
        req.on('data', (c) => {
            raw += c;
            if (raw.length > 2048) req.destroy();
        });
        req.on('end', () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch {
                resolve({});
            }
        });
        req.on('error', () => resolve({}));
    });
}

function connectedCount() {
    let n = 0;
    for (const entry of getAllSessions().values()) if (entry.connected) n++;
    return n;
}

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://localhost');
        if (req.method === 'OPTIONS') return send(res, 204, {});

        if (url.pathname === '/' || url.pathname === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
            return res.end(SITE_HTML);
        }
        if (url.pathname === '/favicon.ico') {
            res.writeHead(204);
            return res.end();
        }

        if (url.pathname === '/health') {
            return send(res, 200, {
                ok: true,
                bot: config.botName,
                uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
                online: connectedCount(),
                linked: listSavedSessionIds().length,
            });
        }

        const protectedRoute = url.pathname === '/pair' || url.pathname === '/status';
        // the built-in website (same address) needs no key; other websites must send PAIR_API_KEY
        const sameSite = req.headers['sec-fetch-site'] === 'same-origin';
        if (protectedRoute && API_KEY && !sameSite && req.headers['x-api-key'] !== API_KEY) {
            return send(res, 401, { error: 'Not allowed' });
        }

        if (url.pathname === '/status') {
            const number = cleanNumber(url.searchParams.get('number'));
            if (!validNumber(number)) return send(res, 400, { error: 'Invalid number' });
            return send(res, 200, { linked: isPaired(number), connected: isConnected(number) });
        }

        if (url.pathname === '/pair') {
            const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
            if (limited(ip)) return send(res, 429, { error: 'Too many requests. Wait a few minutes.' });
            const body = req.method === 'POST' ? await readBody(req) : {};
            const number = cleanNumber(body.number || url.searchParams.get('number'));
            if (!validNumber(number)) return send(res, 400, { error: 'Enter the full number with country code.' });
            try {
                const result = await requestCode(number);
                return send(res, 200, result);
            } catch (err) {
                log.warn('pair', `${number}: ${err.message}`);
                return send(res, 502, { error: err.message });
            }
        }

        return send(res, 404, { error: 'Not found' });
    } catch (err) {
        log.error('http', err.stack || err.message);
        return send(res, 500, { error: 'Server error' });
    }
});

// ── 24/7: bring back every linked number on boot, and keep watching ───────────
async function restoreAll() {
    const ids = listSavedSessionIds();
    if (!ids.length) return log.info('boot', 'no linked numbers yet - waiting for the website');
    for (const id of ids) {
        try {
            await resumeSession(id);
            log.info('boot', `restored ${id}`);
        } catch (err) {
            log.error('boot', `could not restore ${id}: ${err.message}`);
        }
        await new Promise((r) => setTimeout(r, 2500));
    }
}

function watchdog() {
    const now = Date.now();
    for (const id of listSavedSessionIds()) {
        if (isConnected(id) || stoppedOnPurpose.has(id) || pending.has(id)) {
            downSince.delete(id);
            continue;
        }
        if (!downSince.has(id)) {
            downSince.set(id, now);
            continue;
        }
        // the built-in reconnect waits at most 60s; 3 minutes offline means it got stuck
        if (now - downSince.get(id) > 3 * 60 * 1000) {
            downSince.set(id, now);
            log.warn('watchdog', `${id} stuck offline - restarting it`);
            resumeSession(id).catch((e) => log.error('watchdog', `${id}: ${e.message}`));
        }
    }
}

function keepAwake() {
    if (!PUBLIC_URL || typeof fetch !== 'function') return;
    fetch(`${PUBLIC_URL}/health`).catch(() => {});
}

server.listen(PORT, () => {
    printBox([
        `${config.botName}`,
        `亗 SHADOW LINK 亗 website + pairing on port ${PORT}`,
        API_KEY ? 'Website key: required' : 'Website key: NOT SET (anyone can pair)',
        PUBLIC_URL ? `Keep-awake: ${PUBLIC_URL}/health` : 'Keep-awake: set PUBLIC_URL to enable',
    ]);
    restoreAll();
    setInterval(watchdog, 60 * 1000);
    setInterval(keepAwake, 4 * 60 * 1000);
});

function shutdown() {
    log.warn('process', 'shutting down');
    server.close();
    setTimeout(() => process.exit(0), 1500);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
