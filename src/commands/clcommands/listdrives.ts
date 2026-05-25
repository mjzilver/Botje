import { execSync } from "child_process";
import type { IClCommand, IBotContext } from "../../interfaces";

export default {
    name: "listdrives",
    description: "lists mounted drives and their available space",
    format: "listdrives",
    function(_input: string[], context: IBotContext) {
        try {
            const output = execSync("df -h --output=target,fstype,size,used,avail,pcent", {
                encoding: "utf8",
                stdio: "pipe",
            });
            output
                .trim()
                .split("\n")
                .forEach((line) => context.logger.console(line));
        } catch (err) {
            context.logger.console(`Could not list drives: ${err instanceof Error ? err.message : String(err)}`);
        }
    },
} satisfies IClCommand;
