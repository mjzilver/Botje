import readline from "readline";
import type { IBotContext, ILogger, IClCommand } from "../interfaces";

export class CommandLine {
    private commands: Record<string, IClCommand>;
    private logger: ILogger;
    private context: IBotContext;
    constructor(commands: Record<string, IClCommand>, logger: ILogger, context: IBotContext) {
        this.commands = commands;
        this.logger = logger;
        this.context = context;
        this.start();
    }

    private start(): void {
        const names = Object.keys(this.commands);
        const completer = (line: string): [string[], string] => {
            const rawParts = line.split(/\s+/);
            const cmdName = rawParts[0].toLowerCase();
            const isArgCompletion = rawParts.length > 1 || line.endsWith(" ");

            if (!isArgCompletion) {
                const matches = names.filter((n) => n.startsWith(cmdName));

                return [matches.length > 0 ? matches : names, cmdName];
            }

            const cmd = this.commands[cmdName];
            if (cmd?.completer) {
                const argParts = rawParts.slice(1).filter((s) => s.length > 0);
                const argIndex = line.endsWith(" ") ? argParts.length : argParts.length - 1;
                const prefix = line.endsWith(" ") ? "" : (argParts[argParts.length - 1] ?? "");
                const completions = cmd.completer(argIndex, this.context);
                const matches = completions.filter((c) => c.toLowerCase().startsWith(prefix.toLowerCase()));

                return [matches.length > 0 ? matches : completions, prefix];
            }

            return [names, rawParts[0]];
        };

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, completer });
        rl.on("line", async (line: string) => {
            const parts = line.trim().split(/\s+/);
            const name = parts[0].toLowerCase();
            const args = parts.slice(1);
            if (name in this.commands) await this.commands[name].function(args, this.context);
            else this.logger.info(`"${name}" is not a command`);
        });
    }
}
