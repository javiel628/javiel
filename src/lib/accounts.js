// Website accounts: one account = one WhatsApp number = one bot.
// Stored in session/_accounts/ so the MongoDB store (if enabled) keeps it across redeploys.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

const DIR = path.join(process.cwd(), 'session', '_accounts');
const FILE = path.join(DIR, 'accounts.json');
const MAX_AGE = 30 * 24 * 3600; // login lasts 30 days

let db = null;
function save() {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(db));
    fs.renameSync(FILE + '.tmp', FILE);
}
function data() {
    if (db) return db;
    try {
        db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } catch {
        db = {};
    }
    db.users = db.users || {};
    if (!db.secret) {
        db.secret = crypto.randomBytes(32).toString('hex');
        save();
    }
    return db;
}

const exists = (number) => !!data().users[number];

async function create(number, password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = (await scrypt(password, salt, 32)).toString('hex');
    data().users[number] = { salt, hash, createdAt: Date.now() };
    save();
}

async function verify(number, password) {
    const u = data().users[number];
    const salt = u ? u.salt : 'x'.repeat(32); // same work either way
    const got = await scrypt(password, salt, 32);
    return !!u && crypto.timingSafeEqual(got, Buffer.from(u.hash, 'hex'));
}

const sign = (body) => crypto.createHmac('sha256', data().secret).update(body).digest('hex');
function token(number) {
    const body = `${number}.${Math.floor(Date.now() / 1000) + MAX_AGE}`;
    return `${body}.${sign(body)}`;
}
/** Returns the account number for a valid login cookie, otherwise null. */
function fromToken(tok) {
    const [number, exp, sig] = String(tok || '').split('.');
    if (!number || !exp || !sig) return null;
    const want = Buffer.from(sign(`${number}.${exp}`));
    const have = Buffer.from(sig);
    if (want.length !== have.length || !crypto.timingSafeEqual(want, have)) return null;
    if (Number(exp) < Date.now() / 1000 || !exists(number)) return null;
    return number;
}

module.exports = { exists, create, verify, token, fromToken, MAX_AGE };

