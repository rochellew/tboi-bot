const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Deletes recent messages in this channel')
        .addIntegerOption((option) =>
            option
                .setName('amount')
                .setDescription('How many messages to delete (default: all from the last 14 days)')
                .setMinValue(1),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Ephermeral, so the reply itself isn't in the channel being purged
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const amount = interaction.options.getInteger('amount') ?? Infinity;

        // bulkDelete caps at 100 per API call, so loop in batches. The `true` skips messages
        // older than 14 days (Discord can't bulk-delete those) instead of throwing
        let deleted = 0;
        while (deleted < amount) {
            const batch = await interaction.channel.bulkDelete(Math.min(amount - deleted, 100), true);
            deleted += batch.size;
            if (batch.size === 0) break; // nothing left that's able to be deleted
        }

        await interaction.editReply(`${deleted} message(s) deleted.`);
    },
};