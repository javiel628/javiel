'use strict';
/*
 * MongoDB persistence for the `session/` folder.
 *
 * Why: hosts like Render wipe the disk on every redeploy, which deletes the WhatsApp login and forces
 * everybody to pair again. This module mirrors everything in `session/` (WhatsApp login, encryption keys,
 * per-number bot settings, custom menu image) into MongoDB and restores it before the bot starts.
 *
 * It is OFF unless MONGODB_URI is set, so local / panel hosting keeps working exactly as before.
 *
 * Flow on boot:   connect -> wait for the "leader" lease -> restore files to disk -> start sessions
 * While running:  every few seconds changed files are uploaded, deleted files are removed from MongoDB
 * On shutdown:    final upload, release the lease so the next copy can start immediately
 *
 * The lease matters during a redeploy: the old and the new copy briefly run together, and two copies of the
 * same WhatsApp login fight each other. Only the lease holder is allowed to run sessions.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('./logger');

const URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'shadowbot';
const ROOT = path.join(process.cwd(), 'session');

const INSTANCE = crypto.randomBytes(8).toString('hex');
const LEASE_MS = 30000; // a lease not renewed for this long is considered dead
const HEARTBEAT_MS = 10000;
const SYNC_MS = 5000;
const SETTLE_MS = 1500; // ignore files modified in the last moment (may be half-written)
const MAX_FILE = 10 * 1024 * 1024; // MongoDB documents are limited to 16 MB (base64 adds ~33%)

const enabled = !!URI;
let client = null;
let files = null; // collection: one document per file, _id = "<number>/<relative path>"
let locks = null; // collection: the single leader lease
let ready = false;
let syncing = false;
let timers = [];
const known = new Map(); // relative path -> "mtimeMs:size" of what MongoDB already has

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sigOf = (st) => `${st.mtimeMs}:${st.size}`;

function listFiles(dir = ROOT, base = '') {
    const out = [];
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const e of entries) {
        const rel = base ? `${base}/${e.name}` : e.name;
        if (e.isDirectory()) out.push(...listFiles(path.join(dir, e.name), rel));
        else if (e.isFile() && e.name !== '.lock') out.push(rel); // .lock is a per-process pid file, never share it
    }
    return out;
}

function diskPath(rel) {
    const full = path.resolve(ROOT, rel);
    if (full !== ROOT && !full.startsWith(ROOT + path.sep)) throw new Error(`unsafe path: ${rel}`);
    return full;
}

// ── connection ───────────────────────────────────────────────────────────────
async function connect() {
    const { MongoClient } = require('mongodb');
    client = new MongoClient(URI, { serverSelectionTimeoutMS: 15000, maxPoolSize: 5 });
    await client.connect();
    const db = client.db(DB_NAME);
    files = db.collection('session_files');
    locks = db.collection('locks');
    await files.createIndex({ sessionId: 1 });
}

// ── leader lease ─────────────────────────────────────────────────────────────
async function tryAcquire() {
    const now = Date.now();
    try {
        await locks.findOneAndUpdate(
            { _id: 'leader', $or: [{ owner: INSTANCE }, { ts: { $lt: now - LEASE_MS } }] },
            { $set: { owner: INSTANCE, ts: now } },
            { upsert: true }
        );
        return true;
    } catch (err) {
        if (err && err.code === 11000) return false; // somebody else holds a fresh lease
        throw err;
    }
}

async function acquireLeader() {
    let announced = false;
    while (!(await tryAcquire())) {
        if (!announced) {
            log.info('mongo', 'another copy of the bot is still running - waiting for it to stop (normal during a redeploy)');
            announced = true;
        }
        await sleep(3000);
    }
    log.success('mongo', 'this copy now owns the bot sessions');
}

function startHeartbeat() {
    timers.push(
        setInterval(async () => {
            try {
                const r = await locks.updateOne({ _id: 'leader', owner: INSTANCE }, { $set: { ts: Date.now() } });
                if (!r.matchedCount) {
                    log.error('mongo', 'lost the leader lease to another copy - exiting so it cannot fight over the WhatsApp login');
                    process.exit(1);
                }
            } catch (err) {
                log.warn('mongo', `heartbeat failed (will retry): ${err.message}`);
            }
        }, HEARTBEAT_MS)
    );
}

// ── restore: MongoDB -> disk ─────────────────────────────────────────────────
async function restore() {
    fs.mkdirSync(ROOT, { recursive: true });
    let count = 0;
    for await (const doc of files.find({})) {
        try {
            const dest = diskPath(doc.path);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, Buffer.from(doc.b64 || '', 'base64'));
            known.set(doc.path, sigOf(fs.statSync(dest)));
            count++;
        } catch (err) {
            log.warn('mongo', `could not restore ${doc.path}: ${err.message}`);
        }
    }
    log.success('mongo', `restored ${count} session file(s) from MongoDB`);
}

// ── sync: disk -> MongoDB ────────────────────────────────────────────────────
async function syncOnce() {
    if (!ready || syncing) return;
    syncing = true;
    try {
        const ops = [];
        const uploaded = new Map();
        const removed = [];
        const seen = new Set();
        const now = Date.now();

        for (const rel of listFiles()) {
            let st;
            try {
                st = fs.statSync(diskPath(rel));
            } catch {
                continue;
            }
            seen.add(rel);
            const sig = sigOf(st);
            if (known.get(rel) === sig) continue;
            if (now - st.mtimeMs < SETTLE_MS) continue; // still being written, next round
            if (st.size > MAX_FILE) {
                log.warn('mongo', `${rel} is too large to store (${st.size} bytes) - skipped`);
                continue;
            }
            let buf;
            try {
                buf = fs.readFileSync(diskPath(rel));
            } catch {
                continue;
            }
            ops.push({
                updateOne: {
                    filter: { _id: rel },
                    update: { $set: { sessionId: rel.split('/')[0], path: rel, b64: buf.toString('base64'), updatedAt: new Date() } },
                    upsert: true,
                },
            });
            uploaded.set(rel, sig);
        }

        for (const rel of known.keys()) {
            if (!seen.has(rel)) {
                ops.push({ deleteOne: { filter: { _id: rel } } });
                removed.push(rel);
            }
        }

        if (ops.length) {
            await files.bulkWrite(ops, { ordered: false });
            for (const [rel, sig] of uploaded) known.set(rel, sig);
            for (const rel of removed) known.delete(rel);
        }
    } catch (err) {
        log.warn('mongo', `sync failed (will retry): ${err.message}`);
    } finally {
        syncing = false;
    }
}

/** Called when a session is wiped (logged out / pairing failed / removed): drop its files from MongoDB right away. */
function forget(sessionId) {
    if (!enabled || !ready) return;
    const id = String(sessionId);
    for (const rel of [...known.keys()]) if (rel.split('/')[0] === id) known.delete(rel);
    files.deleteMany({ sessionId: id }).catch((err) => log.warn('mongo', `could not delete ${id} from MongoDB: ${err.message}`));
}

// ── lifecycle ────────────────────────────────────────────────────────────────
async function init() {
    if (!enabled) {
        log.warn('mongo', 'MONGODB_URI not set - sessions are stored on local disk only (lost if the host wipes its disk)');
        ready = true;
        return false;
    }
    let attempt = 0;
    for (;;) {
        try {
            await connect();
            break;
        } catch (err) {
            attempt++;
            log.error('mongo', `cannot connect to MongoDB (attempt ${attempt}): ${err.message}`);
            if (attempt >= 5) throw new Error('MongoDB unreachable. Check MONGODB_URI and the Atlas network access list (allow 0.0.0.0/0).');
            await sleep(5000);
        }
    }
    await acquireLeader();
    startHeartbeat();
    await restore();
    ready = true;
    timers.push(setInterval(syncOnce, SYNC_MS));
    return true;
}

/** Final upload + release the lease, so a new copy can take over immediately. */
async function shutdown() {
    for (const t of timers) clearInterval(t);
    timers = [];
    if (!enabled || !client) return;
    try {
        syncing = false;
        await syncOnce();
        await locks.deleteOne({ _id: 'leader', owner: INSTANCE });
        await client.close();
    } catch (err) {
        log.warn('mongo', `shutdown cleanup failed: ${err.message}`);
    }
}

// test hook: lets the logic be exercised without a real database
function _inject(fakeFiles, fakeLocks) {
    files = fakeFiles;
    locks = fakeLocks;
    ready = true;
}

module.exports = { enabled, init, shutdown, forget, syncOnce, isReady: () => ready, _inject, _restore: restore };
