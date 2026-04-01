import axios from "axios";
axios.defaults.validateStatus = (status: number) => status >= 200 && status <= 500;
import { logger } from "./systems/logger";
import { Settings } from "./systems/settings";
import { Bot } from "./systems/bot";
import { CommandLine } from "./systems/commandline";
import { registerProcessHandlers } from "./systems/processHandler";
import pkg from "../package.json";
const settings = new Settings(logger);
const bot = new Bot(settings.config, logger, pkg.version);
registerProcessHandlers(
    () => bot.commandHandler,
    () => bot.messageHandler,
    logger,
);
setTimeout(() => {
    try {
        const { clcommands } = bot.loadedCommands;
        new CommandLine(clcommands, logger, bot);
    } catch {}
}, 0);
