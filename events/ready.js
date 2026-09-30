const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        // Load the bot's own emojis (the pool icons from scripts/upload_pool_emojis.py)
        // into client.application.emojis.cache so commands can look them up by name.
        try {
            const emojis = await client.application.emojis.fetch();
            console.log(`Loaded ${emojis.size} application emojis.`);
        } catch (error) {
            console.error('Could not load application emojis; pool icons will be missing.', error);
        }
    },
};