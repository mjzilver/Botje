import type { IClCommand, IBotContext } from "../../interfaces";
import { toError } from "../../utils";
import { getReportRows } from "../../utils/support/report";

export default {
    name: "report",
    description: "reports information about bot's process",
    format: "report",
    async function(_input: string[], context: IBotContext) {
        try {
            const printRows = await getReportRows(context);
            if (printRows === null) {
                context.logger.error("No data found in the database.");

                return;
            }

            context.logger.printRows(printRows);
        } catch (error) {
            context.logger.error(toError(error));
        }
    },
} satisfies IClCommand;
