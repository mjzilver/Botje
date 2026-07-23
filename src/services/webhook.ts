import type * as discord from "discord.js";
import type { ILogger } from "../interfaces";
import type { BotConfig } from "../interfaces/config";
import { toError } from "../utils";

export class WebhookService {
    private logger: ILogger;
    private client: discord.Client;
    private config: BotConfig;
    constructor(logger: ILogger, client: discord.Client, config: BotConfig) {
        this.logger = logger;
        this.client = client;
        this.config = config;
    }

    async fetch(channel: discord.TextChannel): Promise<discord.Webhook | null> {
        if (!channel?.isTextBased?.() || !channel.guild) {
            return null;
        }

        const webhooks = await channel.fetchWebhooks();
        for (const [, webhook] of webhooks) {
            if (webhook.name === this.config.botName) {
                return webhook;
            }
        }

        return await channel.createWebhook({ name: this.config.botName });
    }

    async sendMessage(channelId: string, text: string, userId: string): Promise<boolean> {
        const channel = this.client.channels.cache.get(channelId);
        if (!channel?.isTextBased()) {
            return false;
        }

        const textChannel = channel as discord.TextChannel;
        try {
            const webhook = await this.fetch(textChannel);
            if (!webhook) {
                return false;
            }

            const member = await textChannel.guild.members.fetch(userId);
            await webhook.send({
                content: text,
                username: member.displayName ?? member.user.username,
                avatarURL: member.user.displayAvatarURL(),
            });

            return true;
        } catch (err) {
            this.logger.error(`Failed to send webhook message: ${toError(err).message}`);

            return false;
        }
    }
}
