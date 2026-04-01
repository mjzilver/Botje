import type { Bot } from "./bot";
let _bot: Bot | null = null;
export function setBotContext(bot: Bot): void {
    _bot = bot;
}
export function getBotContext(): Bot {
    if (!_bot) throw new Error("BotContext not initialized");
    return _bot;
}
export function resetBotContext(): void {
    _bot = null;
}
