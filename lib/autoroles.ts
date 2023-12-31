import { Guild, GuildMember } from "discord.js";
import api from "./api.ts";
import bot from "./bot.ts";
import logger from "./logger.ts";

export async function syncAutoroles(guild: Guild) {
    const data: { source: string; target: string; role: string }[] = await api(`GET /autoroles/${guild.id}`);
    if (data.length === 0) return;

    const targets = data.map(({ target }) => target);
    const users: Record<string, string[]> = {};

    const members = (await guild.members.fetch()).toJSON();
    const ids = new Set(members.map((x) => x.id));

    const apiUsers = (await api("GET /users")).filter((x: any) => ids.has(x.id));
    for (const { id } of apiUsers) users[id] = [];

    for (const { source, target, role } of data)
        if (source) {
            for (const user of apiUsers) {
                if (user.guilds[source]?.staff && (!role || user.guilds[source].roles.includes(role)) && !users[user.id].includes(target))
                    users[user.id].push(target);
            }
        } else {
            for (const user of apiUsers)
                if (user.roles.includes(role) || (Object.values(user.guilds).some((x: any) => x.roles.includes(role)) && !users[user.id].includes(target)))
                    users[user.id].push(target);
        }

    for (const member of members) {
        const give = users[member.id] ?? [];
        const take = targets.filter((x) => !give.includes(x));

        if (member.roles.cache.hasAll(...give) && !member.roles.cache.hasAny(...take)) continue;

        await member.roles.set([
            ...new Set([
                ...member.roles.cache
                    .toJSON()
                    .map((x) => x.id)
                    .filter((x) => !take.includes(x)),
                ...give,
            ]),
        ]);
    }
}

export async function syncAllAutoroles() {
    const guilds = await api(`GET /guilds`);

    for (const { id } of [...guilds, { id: Bun.env.HQ }, { id: Bun.env.HUB }]) {
        const guild = bot.guilds.cache.get(id);
        if (!guild) continue;

        try {
            await syncAutoroles(guild);
        } catch (error) {
            logger.error(error);
        }
    }
}

export async function syncMemberAutoroles(member: GuildMember) {
    const data: { source: string; target: string; role: string }[] = await api(`GET /autoroles/${member.guild.id}`);
    if (data.length === 0) return;

    const targets = data.map(({ target }) => target);
    const give: string[] = [];

    const user = await api(`GET /users/${member.id}`);

    for (const { source, target, role } of data)
        if (source) {
            if (user.guilds[source]?.staff && (!role || user.guilds[source].roles.includes(role)) && !give.includes(target)) give.push(target);
        } else {
            if (user.roles.includes(role) || (Object.values(user.guilds).some((x: any) => x.roles.includes(role)) && !give.includes(target))) give.push(target);
        }

    const take = targets.filter((x) => !give.includes(x));

    if (member.roles.cache.hasAll(...give) && !member.roles.cache.hasAny(...take)) return;

    await member.roles.set([
        ...new Set([
            ...member.roles.cache
                .toJSON()
                .map((x) => x.id)
                .filter((x) => !take.includes(x)),
            ...give,
        ]),
    ]);
}
