import { Channel, Client, Events, IntentsBitField, TextChannel } from "discord.js";
import logger from "./logger.ts";

const bot = new Client({
    intents: IntentsBitField.Flags.Guilds | IntentsBitField.Flags.GuildMembers | IntentsBitField.Flags.GuildInvites,
    allowedMentions: { parse: [] },
});

logger.debug(`[DI] Logging in...`);
await bot.login(Bun.env.TOKEN!);

logger.debug(`[DI] Waiting for bot to become ready...`);
await new Promise((r) => bot.on(Events.ClientReady, r));

export default bot;

async function get<T extends Channel>(key: string): Promise<T> {
    const id = Bun.env[key];
    if (!id) throw `Missing ${key}.`;

    return (await bot.channels.fetch(id))! as T;
}

export const channels = {
    EXEC_MANAGEMENT: await get<TextChannel>("EXEC_MANAGEMENT"),
    BANSHARE_DASHBOARD: await get<TextChannel>("BANSHARE_DASHBOARD"),
    BANSHARE_LOGS: await get<TextChannel>("BANSHARE_LOGS"),
    BOT_LOGS: await get<TextChannel>("BOT_LOGS"),
    VOTE_HERE: await get<TextChannel>("VOTE_HERE"),
    HUB_PARTNER_LIST: await get<TextChannel>("HUB_PARTNER_LIST"),
};

export const hq = await bot.guilds.fetch(Bun.env.HQ!);
export const hub = await bot.guilds.fetch(Bun.env.HUB!);
