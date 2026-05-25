import type { CommandHandler } from "./commandHandler";
import type { ILogger } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { toError } from "./utils";

export function registerProcessHandlers(
    getCommandHandler: () => CommandHandler | undefined,
    getMessageHandler: () =>
        | {
              reply(msg: BotMessage, content: string): void;
          }
        | undefined,
    logger: ILogger,
): void {
    function handleError(error: unknown, replyText: string): void {
        const commandHandler = getCommandHandler();
        const messageHandler = getMessageHandler();
        const last = commandHandler?.commandList.get();
        if (last && messageHandler) messageHandler.reply(last, replyText);
        logger.error(toError(error));
    }

    process.on("uncaughtException", (error: Error) => {
        handleError(error, "An error occured, this is probably your fault!");
    });
    process.on("unhandledRejection", (error: unknown) => {
        handleError(error, "An error occured, this is probably your fault, do not @me!");
    });
}
