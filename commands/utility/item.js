const {
    AttachmentBuilder,
    ContainerBuilder,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    SlashCommandBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
} = require('discord.js');

const API_URL = process.env.API_URL;
// Color of the bar down the card's left edge, indexed by item quality (0-4).
const QUALITY_COLORS = [
    0x95a5a6, // 0: grey
    0x3498db, // 1: blue
    0x2ecc71, // 2: green
    0x9b59b6, // 3: purple
    0xf1c40f, // 4: yellow
];

// GET a JSON endpoint on our API. Returns null for 404 (no such item) and 400
// (a search that's empty once normalized, like "!!!") so callers can fall back.
async function getJson(path) {
    const res = await fetch(`${API_URL}${path}`);
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
    return res.json();
}

async function searchItems(text, limit) {
    // encodeURIComponent escapes spaces and "?" (as in "Options?") so the URL stays valid.
    // `?? []` means "use [] if the left side is null or undefined".
    return (await getJson(`/api/items?q=${encodeURIComponent(text)}&limit=${limit}`)) ?? [];
}

// The option holds an item id if the user picked an autocomplete suggestion,
// or whatever they typed if they didn't. Try it as an id, then fall back to search.
async function findItem(value) {
    const item = await getJson(`/api/items/${encodeURIComponent(value)}`);
    if (item) return item;
    const [first] = await searchItems(value, 1); // array destructuring: first element or undefined
    return first ? getJson(`/api/items/${first.id}`) : null;
}

// Download the icon bytes so they can be attached to the message. Discord can't
// reach our localhost URL itself, but it can show an attached file.
async function fetchIcon(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Icon ${url} returned ${res.status}`);
    const name = res.headers.get('content-type') === 'image/gif' ? 'icon.gif' : 'icon.png';
    return new AttachmentBuilder(Buffer.from(await res.arrayBuffer()), { name });
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function text(content) {
    return new TextDisplayBuilder().setContent(content);
}

// A pool's line: its emoji (uploaded as `pool_<id>`) if there is one, else a bullet.
// Putting an emoji object in a template string gives Discord's <:name:id> syntax.
function poolLine(pool, emojis) {
    const emoji = emojis.cache.find((e) => e.name === `pool_${pool.id}`);
    return `${emoji ?? '•'} ${pool.name}`;
}

// The reply is a Components V2 "container": a card with a header section (text
// plus the icon beside it), then one text block per category, split by dividers.
// filter(Boolean) drops the parts that are null/false, e.g. an item with no unlock.
function buildCard(item, iconName, emojis) {
    const details = [
        item.type && `${capitalize(item.type)} item`,
        item.quality != null && `Quality ${item.quality}`,
        item.number,
    ].filter(Boolean);
    const heading = [
        `# ${item.name}`,
        item.pickup_quote && `*${item.pickup_quote}*`,
        details.length && `-# ${details.join(' · ')}`, // "-#" is Discord's small grey text
    ].filter(Boolean);

    const effect = item.description?.replaceAll('\r', '') || 'No description.';
    const pools = item.pools.map((pool) => poolLine(pool, emojis)).join('\n') || 'Not in any item pool.';
    const links = [`[isaacguru](${item.links.guru})`, item.links.wiki && `[Wiki](${item.links.wiki})`].filter(Boolean);

    const header = new SectionBuilder()
        .addTextDisplayComponents(text(heading.join('\n')))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${iconName}`));
    // An item with no quality gets the quality-0 grey.
    const accent = QUALITY_COLORS[item.quality] ?? QUALITY_COLORS[0];
    const card = new ContainerBuilder().setAccentColor(accent).addSectionComponents(header);

    const sections = [
        `### Effect\n${effect}`,
        item.unlock && `### Unlock\n${item.unlock}`,
        `### Item Pools\n${pools}`,
        // `-# ${links.join(' · ')}`,
    ].filter(Boolean);
    for (const content of sections) {
        card.addSeparatorComponents(new SeparatorBuilder()).addTextDisplayComponents(text(content));
    }
    return card;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('item')
        .setDescription('Returns information about a specific item.')
        // The callback configures the option and returns it; setRequired/setAutocomplete belong here.
        .addStringOption((option) =>
            option.setName('name').setDescription('The item to look up').setRequired(true).setAutocomplete(true),
        ),

    async autocomplete(interaction) {
        const text = interaction.options.getFocused();
        // Errors are caught here: interactionCreate's catch would try interaction.reply(),
        // which isn't allowed on an autocomplete interaction.
        try {
            const results = text ? await searchItems(text, 25) : [];
            await interaction.respond(results.map((item) => ({ name: item.name, value: item.id })));
        } catch (error) {
            console.error(error);
        }
    },

    async execute(interaction) {
        const value = interaction.options.getString('name');
        const item = await findItem(value);
        if (!item) {
            await interaction.reply({ content: `No item found for "${value}".`, flags: MessageFlags.Ephemeral });
            return;
        }
        const icon = await fetchIcon(item.image_url);
        const card = buildCard(item, icon.name, interaction.client.application.emojis);
        // IsComponentsV2 switches the message to the component layout (no content/embeds allowed).
        await interaction.reply({ components: [card], files: [icon], flags: MessageFlags.IsComponentsV2 });
    },
};
