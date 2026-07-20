import axios from "axios";
import pkg from "../package.json";
import { CommandLine } from "./cli/commandline";
import { registerProcessHandlers } from "./handlers/processHandler";
import { Bot } from "./infrastructure/bot";
import { logger } from "./infrastructure/logger";
import { Settings } from "./infrastructure/settings";
import { toError } from "./utils";

axios.defaults.validateStatus = (status: number) => status >= 200 && status <= 500;

const settings = new Settings(logger);
const bot = new Bot(settings, logger, pkg.version);
registerProcessHandlers(
    () => bot.registry?.commandHandler,
    () => bot.registry?.messageHandler,
    logger,
);
const clInterval = setInterval(() => {
    if (!bot.registry) {
        return;
    }

    clearInterval(clInterval);
    try {
        const { clcommands } = bot.registry.loadedCommands;
        new CommandLine(clcommands, logger, bot.registry);
    } catch (err) {
        logger.error(toError(err));
    }
}, 100);
