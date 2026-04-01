import type { IClCommand, IBotContext } from "../../interfaces";
export default {
    name: "backupdb",
    description: "exports the database to an SQL file",
    format: "backupdb",
    async function(_input: string[], context: IBotContext) {
        context.logger.console("Backing up database...");
        await context.backupHandler.backupDatabase();
    },
} satisfies IClCommand;
