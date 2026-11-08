const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const sharp = require('sharp');
const WebP = require('node-webpmux');

const MAX_OUTPUT_BYTES = 12 * 1024 * 1024;

function runFfmpeg(input, args, maxOutputBytes = MAX_OUTPUT_BYTES) {
    if (!ffmpegPath) return Promise.reject(new Error('FFmpeg is unavailable for this platform.'));

    return new Promise((resolve, reject) => {
        const child = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'pipe:0', ...args], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        const output = [];
        let outputBytes = 0;
        let stderr = '';
        let settled = false;
        const fail = (error) => {
            if (settled) return;
            settled = true;
            child.kill('SIGKILL');
            reject(error);
        };
        const timeout = setTimeout(() => fail(new Error('Media conversion timed out.')), 90000);

        child.stdout.on('data', (chunk) => {
            outputBytes += chunk.length;
            if (outputBytes > maxOutputBytes) return fail(new Error('Converted media is too large.'));
            output.push(chunk);
        });
        child.stderr.on('data', (chunk) => {
            stderr = (stderr + chunk.toString()).slice(-8000);
        });
        child.on('error', fail);
        child.on('close', (code) => {
            clearTimeout(timeout);
            if (settled) return;
            settled = true;
            if (code !== 0) return reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}.`));
            resolve(Buffer.concat(output));
        });
        child.stdin.on('error', () => {});
        child.stdin.end(input);
    });
}

function stickerArgs(isVideo) {
    const filters = isVideo
        ? 'fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=yuva420p'
        : 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=yuva420p';
    const args = ['-vf', filters, '-an', '-c:v', 'libwebp', '-lossless', '0', '-q:v', '65', '-f', 'webp', 'pipe:1'];
    if (isVideo) args.splice(0, 0, '-t', '10', '-loop', '0');
    else args.splice(0, 0, '-frames:v', '1');
    return args;
}

async function convertMediaToWebp(buffer, isVideo = false) {
    return runFfmpeg(buffer, stickerArgs(isVideo));
}

function metadataExif(packname, author) {
    const json = Buffer.from(JSON.stringify({
        'sticker-pack-id': 'shadow-md',
        'sticker-pack-name': String(packname || 'Shadow MD').slice(0, 80),
        'sticker-pack-publisher': String(author || 'Shadow MD').slice(0, 80),
        emojis: [],
    }), 'utf8');
    const header = Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);
    header.writeUIntLE(json.length, 14, 4);
    return Buffer.concat([header, json]);
}

async function writeExifWebp(buffer, { packname, author } = {}) {
    const image = new WebP.Image();
    await image.load(buffer);
    image.exif = metadataExif(packname, author);
    return image.save(null);
}

async function convertStickerToImage(buffer) {
    return sharp(buffer, { animated: false }).png().toBuffer();
}

async function createCircularSticker(buffer) {
    const circleMask = Buffer.from('<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><circle cx="256" cy="256" r="256" fill="white"/></svg>');
    return sharp(buffer, { animated: false })
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .composite([{ input: circleMask, blend: 'dest-in' }])
        .webp({ quality: 80 })
        .toBuffer();
}

function escapeXml(text) {
    return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}

function wrapText(text, maxLength = 18) {
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (next.length > maxLength && line) {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    if (line) lines.push(line);
    return lines.slice(0, 5);
}

async function generateTextSticker(text, isAnimated = false) {
    const lines = wrapText(text);
    const fontSize = Math.max(40, Math.min(86, Math.floor(440 / Math.max(1, ...lines.map((line) => line.length)) * 1.5)));
    const lineHeight = Math.round(fontSize * 1.12);
    const firstY = Math.round(256 - ((lines.length - 1) * lineHeight) / 2);
    const lineMarkup = lines.map((line, index) =>
        `<text x="256" y="${firstY + index * lineHeight}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="900" textLength="440" lengthAdjust="spacingAndGlyphs" paint-order="stroke fill" stroke="#171717" stroke-width="18" stroke-linejoin="round" fill="#ffffff">${escapeXml(line)}</text>`
    ).join('');
    const svg = Buffer.from(`<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">${lineMarkup}</svg>`);
    const png = await sharp(svg).png().toBuffer();
    if (!isAnimated) return convertMediaToWebp(png, false);

    const filter = "zoompan=z='1+0.05*sin(2*PI*on/30)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=30:s=512x512:fps=15,format=yuva420p";
    return runFfmpeg(png, ['-vf', filter, '-t', '2', '-an', '-c:v', 'libwebp', '-lossless', '0', '-q:v', '65', '-loop', '0', '-f', 'webp', 'pipe:1']);
}

async function convertToVoiceNote(buffer) {
    return runFfmpeg(buffer, ['-vn', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '64k', '-f', 'ogg', 'pipe:1']);
}

async function applyAudioEffect(buffer, effect) {
    const filters = {
        bass: 'bass=g=10:f=100',
        slow: 'atempo=0.75',
        nightcore: 'asetrate=60000,aresample=48000,atempo=1.1',
        robot: 'aecho=0.8:0.88:30:0.4,highpass=f=180,lowpass=f=3400',
        reverse: 'areverse',
    };
    const filter = filters[effect];
    if (!filter) throw new Error(`Unsupported audio effect: ${effect}`);
    return runFfmpeg(buffer, ['-vn', '-af', filter, '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', 'pipe:1']);
}

module.exports = {
    convertMediaToWebp,
    writeExifWebp,
    convertStickerToImage,
    createCircularSticker,
    generateTextSticker,
    convertToVoiceNote,
    applyAudioEffect,
};
