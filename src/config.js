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
require('dotenv').config();

// NOTE: owners are no longer read from here — each session (paired number)
// tracks its own owner list in its own settings.json (see lib/settings.js).
// This file only holds bot-wide defaults that every new session starts with.
module.exports = {
    botName: process.env.BOT_NAME || ' 么 𝐒𝚳𝚰𝐋𝚵 𝐏𝐑𝐈𝐌𝐄 𝚳𝐃 么',
    prefix: process.env.PREFIX || '.',
    pairingNumber: process.env.PAIRING_NUMBER || '', // used only by standalone single-session mode
    customPairingCode: process.env.CUSTOM_PAIRING_CODE || 'SMILEMOD',
  // ...your existing config
  UPDATE_REPO:   process.env.UPDATE_REPO   || 'https://github.com/javiel628/javiel.git',
  UPDATE_BRANCH: process.env.UPDATE_BRANCH || 'main',
};
