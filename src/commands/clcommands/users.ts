import type { IClCommand, IBotContext } from "../../interfaces";

export default {
    name: "users",
    description: "lists all members in all guilds",
    format: "users",
    function(_input: string[], context: IBotContext) {
        type Row = { id: string; username: string; displayName: string; guild: string };
        const rows: Row[] = [];

        for (const [, guild] of context.client.guilds.cache) {
            for (const [, member] of guild.members.cache) {
                rows.push({
                    id: member.user.id,
                    username: member.user.username,
                    displayName: member.displayName,
                    guild: guild.name,
                });
            }
        }

        rows.sort((a, b) => a.guild.localeCompare(b.guild) || a.username.localeCompare(b.username));
        context.logger.printColumns(
            [
                rows.map((r) => r.id),
                rows.map((r) => r.username),
                rows.map((r) => r.displayName),
                rows.map((r) => r.guild),
            ],
            ["User ID", "Username", "Display Name", "Guild"],
        );
    },
} satisfies IClCommand;
