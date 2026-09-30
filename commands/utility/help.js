const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');

// One line per command, e.g. "`/item <name>` - Returns information about a specific item."
// Required options are shown as <name>, optional ones as [name]; each option's
// description goes on its own indented line underneath.
function commandLine(command) {
    const options = command.options ?? [];
    const usage = [`/${command.name}`, ...options.map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`))].join(' ');
    const optionLines = options.map((o) => `  ↳ \`${o.name}\`: ${o.description}`);
    return [`\`${usage}\` - ${command.description}`, ...optionLines].join('\n');
}

module.exports = {
    data: new SlashCommandBuilder().setName('help').setDescription('Shows how to use the bot and lists its commands.'),

    async execute(interaction) {
        // Built from the loaded commands so the list never goes stale. toJSON() gives
        // plain objects with name/description/options/default_member_permissions.
        const commands = interaction.client.commands
            .map((command) => command.data.toJSON())
            // Hide commands the user doesn't have permission to run (e.g. admin-only ones).
            .filter((command) => {
                const required = command.default_member_permissions;
                return !required || interaction.memberPermissions?.has(BigInt(required));
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        const embed = new EmbedBuilder()
            .setTitle('How to use the bot')
            .setDescription(
                [
                    'Type `/` in the chat box and pick a command. `<option>` is required, `[option]` is optional.',
                    '',
                    ...commands.map(commandLine),
                ].join('\n'),
            );

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
};
