const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const sharp = require('sharp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync-emojis')
        .setDescription('Uploads any missing item pool icon emojis')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // API + Discord calls take a moment

        const pools = await (await fetch(`${process.env.API_URL}/api/pools`)).json()
        const existing = new Set((await interaction.client.application.emojis.fetch()).map((e) => e.name));

        const missing = pools.filter((pool) => pool.icon_url && !existing.has(`pool_${pool.id}`));

        let created = 0;
        for (const pool of missing) {
            const icon = await fetch(pool.icon_url);
            const upscaled = await sharp(Buffer.from(await icon.arrayBuffer()))
                .resize(13 * 8, 13 * 8, { kernel: 'nearest' })
                .png()
                .toBuffer()
            await interaction.client.application.emojis.create({
                attachment: upscaled,
                name: `pool_${pool.id}`
            });
            created++;
        }
        await interaction.editReply(`${created} emoji(s) created, ${pools.length - created} pool(s) already had one or no icon.`);
    },
};