import type { BotConfig } from "../interfaces/config";
import type { BotMessage } from "../interfaces/discord";

export function makeStringHelpers(config: Pick<BotConfig, "prefix">) {
    function removePrefix(str: string): string {
        return str.replace(new RegExp(config.prefix, "i"), "");
    }

    function removeCommand(str: string): string {
        return str.replace(new RegExp(`^${config.prefix}[a-zA-Z]+\\s*`, "i"), "");
    }

    function removeCommands(str: string): string {
        return str.replace(new RegExp(`${config.prefix}[a-zA-Z]+\\s*`, "ig"), "");
    }

    return { removePrefix, removeCommand, removeCommands };
}
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
export function isImage(str: string): boolean {
    return /\.(jpe?g|gif|png)$/i.test(str);
}
export function isLink(str: string): boolean {
    return /(https?:\/\/|www\.)/gi.test(str);
}
export function normalizeSpaces(str: string): string {
    return str.replace(/  +/g, " ").trim();
}
export function countVowelGroups(str: string): number {
    return str.match(/(?:[aeiouy]{1,2})/gi)?.length ?? 0;
}
export function textOnly(str: string): string {
    return str.replace(/[^a-zA-Z ]/gi, "");
}
export function removeQuotes(str: string): string {
    return str.replace(/"/gi, "");
}
export function replaceFancyQuotes(str: string): string {
    return str.replace(/[\u201c\u201d\u201e]/g, '"').replace(/[\u2018\u2019\u201a\u201b]/g, "'");
}
export function sanitizeFilename(str: string): string {
    return str.replace(/[/:*?"<>|\\]/g, "_");
}
export function replaceAt(str: string, index: number, replacement: string): string {
    return str.substring(0, index) + replacement + str.substring(index + replacement.length);
}
export function getAttachmentUrl(message: BotMessage): string {
    if ((message.attachments?.size ?? 0) >= 1) return message.attachments?.first()?.url ?? "";
    if ((message.embeds?.length ?? 0) >= 1) return message.embeds?.[0]?.url ?? "";

    return "";
}
