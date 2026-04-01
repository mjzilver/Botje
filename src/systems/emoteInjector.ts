import * as discord from "discord.js";
import type { BotMessage } from "../interfaces/discord";
import type { IMessageHandler } from "../interfaces";
import type { WebhookService } from "./webhook";

const UNMATCHED_EMOTE_PATTERN = /(?<!<a?):([a-zA-Z0-9_]+):(?!\d+>)/g;

export class EmoteInjector {
    private webhook: WebhookService;
    private messageHandler: IMessageHandler;
    private client: discord.Client;
    constructor(webhook: WebhookService, messageHandler: IMessageHandler, client: discord.Client) {
        this.webhook = webhook;
        this.messageHandler = messageHandler;
        this.client = client;
    }

    async handleMessage(message: BotMessage): Promise<void> {
        if (message.author.bot) return;
        const guild = message.guild as discord.Guild | null;
        if (!guild) return;
        const matches = Array.from(new Set([...message.content.matchAll(UNMATCHED_EMOTE_PATTERN)].map((m) => m[1])));
        let correctedMessage = message.content;
        let hasCorrections = false;
        const client = this.client;
        for (const match of matches) {
            const localEmoji = [...guild.emojis.cache.values()].find((e) => e.name === match);
            if (localEmoji) continue;
            for (const [guildId, otherGuild] of client.guilds.cache) {
                if (guildId === guild.id) continue;
                const found = [...otherGuild.emojis.cache.values()].find((e) => e.name === match);
                if (found) {
                    const regex = new RegExp(`(?<!<):${match}:(?!\\d+>)`, "g");
                    correctedMessage = correctedMessage.replace(regex, `<:${found.name}:${found.id}>`);
                    hasCorrections = true;
                    break;
                }
            }
        }
        if (hasCorrections) {
            const success = await this.webhook.sendMessage(message.channel.id, correctedMessage, message.author.id);
            if (success) this.messageHandler.delete(message);
        }
    }
}
