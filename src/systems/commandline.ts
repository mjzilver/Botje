import readline from "readline";
import type { IBotContext, ILogger } from "../interfaces";

interface ClCommand {
    function(args: string[], context: IBotContext): void | Promise<void>;
}

export class CommandLine {
    private commands: Record<string, ClCommand>;
    private logger: ILogger;
    private context: IBotContext;
    constructor(commands: Record<string, ClCommand>, logger: ILogger, context: IBotContext) {
        this.commands = commands;
        this.logger = logger;
        this.context = context;
        this.start();
    }

    private start(): void {
        const names = Object.keys(this.commands);
        const completer = (line: string): [string[], string] => {
            const matches = names.filter((n) => n.startsWith(line.toLowerCase()));
            return [matches.length > 0 ? matches : names, line];
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
