import type { ICommand } from "../../interfaces";
import { getReportRows } from "../../utils/support/report";
import { toError } from "../../utils";

function toDiscordReport(rows: [string, string | number][]): string {
    const widestLabel = rows.reduce((max, [label]) => Math.max(max, label.length), 0);
    const lines = rows.map(([label, value]) => `${label.padEnd(widestLabel)} : ${String(value)}`);

    return `\`\`\`\n${lines.join("\n")}\n\`\`\``;
}

export default {
    name: "report",
    description: "reports information about bot's process",
    format: "report",
    async function(message, context) {
        try {
            const rows = await getReportRows(context);
            if (rows === null) {
                await context.messageHandler.send(message, "No data found in the database.");

                return;
            }

            await context.messageHandler.send(message, toDiscordReport(rows));
        } catch (error) {
            context.logger.error(toError(error));
            await context.messageHandler.reply(message, "Something went wrong while creating the report.");
        }
    },
} satisfies ICommand;
