import type { SystemRegistry } from "./systemRegistry";

let registry: SystemRegistry | null = null;

export function setBotContext(value: SystemRegistry): void {
    registry = value;
}
export function getBotContext(): SystemRegistry {
    if (!registry) throw new Error("BotContext not initialized");

    return registry;
}
export function resetBotContext(): void {
    registry = null;
}
