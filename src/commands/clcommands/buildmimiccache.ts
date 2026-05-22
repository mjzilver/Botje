import type { IClCommand, IBotContext } from "../../interfaces";
import { mimicCache } from "../../systems/mimicCache";

export default {
    name: "buildmimiccache",
    description: "pre-builds the mimic profile cache for every user in every server",
    format: "buildmimiccache",
    async function(_input: string[], context: IBotContext) {
        const rows = await context.database.query<{ user_id: string; server_id: string }>(
            `SELECT DISTINCT user_id::text, server_id::text
             FROM messages
             WHERE LENGTH(message) > 15
             AND server_id != '0'`,
            [],
        );

        if (rows.length === 0) {
            context.logger.console("No users found to build mimic cache for.");

            return;
        }

        context.logger.console(`Queueing mimic cache builds for ${rows.length} user/server pairs...`);

        for (const row of rows) {
            const userName = context.client.users.cache.get(row.user_id)?.username ?? row.user_id;
            const serverName = context.client.guilds.cache.get(row.server_id)?.name ?? row.server_id;
            context.logger.console(`  Queuing ${userName} in ${serverName}`);
            mimicCache.enqueue(row.user_id, row.server_id, context.database, context.logger, context.config.prefix);
        }

        context.logger.console(`Queued. Builds will process in the background.`);
    },
} satisfies IClCommand;
