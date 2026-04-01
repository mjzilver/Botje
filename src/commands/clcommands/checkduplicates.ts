import type { IClCommand, IBotContext } from "../../interfaces";

export default {
    name: "checkdupes",
    description: "checks the database for duplicate entries",
    format: "checkdupes",
    async function(_input: string[], context: IBotContext) {
        context.logger.info("Checking for duplicate entries in the database...");
        try {
            const sql = `SELECT message, datetime, COUNT(message) AS count
                FROM messages
                GROUP BY message, datetime
                HAVING COUNT(message) >= 2
                ORDER BY COUNT(message) DESC;`;
            const rows = await context.database.query<{
                message: string;
                datetime: number;
                count: string;
            }>(sql, []);
            context.logger.console(`Found ${rows.length} duplicates`);
            rows.forEach((row) => {
                context.logger.console(`Duplicate: ${row.message} (${row.datetime}) - ${row.count} times`);
            });
        } catch (error) {
            context.logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    },
} satisfies IClCommand;
