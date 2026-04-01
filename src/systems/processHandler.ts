import type { CommandHandler } from "./commandHandler";
import type { ILogger } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";

export function registerProcessHandlers(
    getCommandHandler: () => CommandHandler | undefined,
    getMessageHandler: () =>
        | {
              reply(msg: BotMessage, content: string): void;
          }
        | undefined,
    logger: ILogger,
): void {
    process.on("uncaughtException", (error: Error) => {
        const commandHandler = getCommandHandler();
        const messageHandler = getMessageHandler();
        const last = commandHandler?.commandList.get();
        if (last && messageHandler) messageHandler.reply(last, "An error occured, this is probably your fault!");
        logger.error(error);
    });
    process.on("unhandledRejection", (error: unknown) => {
        const commandHandler = getCommandHandler();
        const messageHandler = getMessageHandler();
        const last = commandHandler?.commandList.get();
        if (last && messageHandler)
            messageHandler.reply(last, "An error occured, this is probably your fault, do not @me!");
        logger.error(error instanceof Error ? error : String(error));
    });
}
