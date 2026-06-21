import type { IClCommand, IBotContext } from "../../interfaces";
import { mimicCache } from "../../features/mimic/mimicCache";
import { DELETED_USER_RE } from "../../features/mimic/mimicBuilder";

export default {
    name: "buildmimiccache",
    description: "pre-builds the mimic profile cache for every user in every server",
    format: "buildmimiccache",
    async function(_input: string[], context: IBotContext) {
        const rows = await context.database.query<{ user_id: string }>(
            `SELECT DISTINCT user_id::text
             FROM messages
             WHERE LENGTH(message) > 15`,
            [],
        );

        if (rows.length === 0) {
            context.logger.console("No users found to build mimic cache for.");

            return;
        }

        context.logger.console(`Queueing mimic cache builds for ${rows.length} users...`);

        for (const row of rows) {
            const discordUser = context.client.users.cache.get(row.user_id);
            const userName = discordUser?.username ?? row.user_id;

            if (discordUser?.bot) {
                context.logger.console(`  Skipping bot: ${userName}`);
                continue;
            }

            if (discordUser && DELETED_USER_RE.test(discordUser.username)) {
                context.logger.console(`  Skipping deleted account: ${userName}`);
                continue;
            }

            const inAnyGuild = context.client.guilds.cache.some((g) => g.members.cache.has(row.user_id));
            if (!inAnyGuild) {
                context.logger.console(`  Skipping ${userName} — not in any server`);
                continue;
            }

            context.logger.console(`  Queuing ${userName}`);
            mimicCache.enqueue(row.user_id, context.database, context.logger, context.config.prefix);
        }

        context.logger.console(`Queued. Builds will process in the background.`);
    },
} satisfies IClCommand;
