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
        // Register the loaded slash commands with the guild on every start, so a deploy
        // that adds or changes a command shows up in Discord without running
        // deploy-commands.js. set() replaces the whole list, so removed commands disappear too.
        try {
            const body = client.commands.map((command) => command.data.toJSON());
            const registered = await client.application.commands.set(body, process.env.GUILD_ID);
            console.log(`Registered ${registered.size} slash commands.`);
        } catch (error) {
            console.error('Could not register slash commands; Discord may show an outdated list.', error);
        }
    },
};