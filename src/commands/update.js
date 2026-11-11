const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

module.exports = {
  name: 'update',
  alias: ['upgrade', 'pull'],
  category: 'owner',
  ownerOnly: true, // only the bot owner can run it
  desc: 'Pull the latest updates from the GitHub repo and restart',
  async execute(sock, msg, args, ctx) {
    const jid = msg.key.remoteJid;
    const repo = ctx?.config?.UPDATE_REPO || 'https://github.com/javiel628/javiel.git';
    const branch = ctx?.config?.UPDATE_BRANCH || 'main';

    const send = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      await send('🔧 *SMILE PRIME MD · UPDATE*\n\n> Fetching latest changes…');

      // 1. Save any local changes so the pull doesn't fail
      await execAsync('git stash push -u -m "auto-stash-before-update" || true', { cwd: process.cwd() });

      // 2. Ensure remote exists
      await execAsync(`git remote add upstream ${repo} 2>/dev/null || true`, { cwd: process.cwd() });

      // 3. Fetch + pull
      const fetch = await execAsync(`git fetch upstream ${branch}`, { cwd: process.cwd() });
      const pull  = await execAsync(`git merge upstream/${branch} --no-edit`, { cwd: process.cwd() });

      // 4. Check if anything actually changed
      const changed = !/Already up to date/i.test(pull.stdout);

      if (!changed) {
        return send('✅ *Already up to date.*\nNo new commits in the repo.');
      }

      // 5. Install any new dependencies
      await send('📦 *Changes pulled.* Installing dependencies…');
      const npm = await execAsync('npm install --no-audit --no-fund', { cwd: process.cwd() });

      // 6. Summary
      const log = await execAsync('git log -1 --pretty=format:"%h · %s (%an)"', { cwd: process.cwd() });
      const summary =
        `✅ *UPDATE COMPLETE*\n\n` +
        `> *Repo:* ${repo}\n` +
        `> *Branch:* ${branch}\n` +
        `> *Commit:* ${log.stdout}\n\n` +
        `♻️ Restarting bot to apply changes…`;

      await send(summary);

      // 7. Restart the process (works on most Node hosts + Pterodactyl)
      setTimeout(() => process.exit(0), 1500);
    } catch (err) {
      console.error('[update] failed:', err);
      const out = (err.stdout || '') + (err.stderr || '') || err.message;
      await send(`❌ *UPDATE FAILED*\n\n\`\`\`${out.slice(0, 900)}\`\`\``);
    }
  }
};
