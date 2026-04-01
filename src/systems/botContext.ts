import type { SystemRegistry } from "./systemRegistry";

let _registry: SystemRegistry | null = null;

export function setBotContext(registry: SystemRegistry): void {
    _registry = registry;
}
export function getBotContext(): SystemRegistry {
    if (!_registry) throw new Error("BotContext not initialized");

    return _registry;
}
export function resetBotContext(): void {
    _registry = null;
}
