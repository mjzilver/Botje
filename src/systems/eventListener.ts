import * as discord from "discord.js";
import { ChannelType, Events } from "discord.js";
import type { IDatabase, ILogger } from "../interfaces";
import type { BotConfig } from "../interfaces/config";
import type { CommandHandler } from "./commandHandler";
import type { EmoteInjector } from "./emoteInjector";
import type { MessageHandler } from "./messageHandler";
import type { SlashHandler } from "./slashHandler";
import type { BackupHandler } from "./backupHandler";
import { toBotMessage, toBotReaction } from "./messageAdapter";

type EmojiLike = {
    id: string;
    name: string;
    guild: { name: string };
};

export class EventListener {
    constructor(
        client: discord.Client,
        db: IDatabase,
        commandHandler: CommandHandler,
        messageHandler: MessageHandler,
        emoteInjector: EmoteInjector,
        slashHandler: SlashHandler,
        backupHandler: BackupHandler,
        config: BotConfig,
        logger: ILogger,
        disallowed: Record<string, boolean>,
    ) {
        this.attachErrorHandlers(client, logger);
        this.attachMessageHandlers(client, db, commandHandler, emoteInjector, disallowed);
        this.attachReactionHandlers(client, db, commandHandler, messageHandler, config, logger);
        this.attachEmojiHandlers(client, backupHandler);
        this.attachInteractionHandler(client, slashHandler);
    }

    private attachErrorHandlers(client: discord.Client, logger: ILogger): void {
        client.on(Events.ShardError, (err: Error) => {
            logger.error(`Shard error: ${err.message}`);
        });
        client.on(Events.Error, (err: Error) => {
            logger.error(`Client error: ${err.message}`);
        });
    }

    private attachInteractionHandler(client: discord.Client, slashHandler: SlashHandler): void {
        client.on(Events.InteractionCreate, (interaction: discord.Interaction) => {
            if (interaction.isChatInputCommand()) slashHandler.handleInteraction(interaction);
        });
    }

    private attachMessageHandlers(
        client: discord.Client,
        db: IDatabase,
        commandHandler: CommandHandler,
        emoteInjector: EmoteInjector,
        disallowed: Record<string, boolean>,
    ): void {
        client.on(Events.MessageCreate, async (message: discord.Message) => {
            const botMessage = toBotMessage(message);
            if (botMessage.author.id in disallowed) return;
            if (message.channel.type === ChannelType.DM) {
                commandHandler.handleDM(botMessage);
            } else {
                await db.storeMessage(botMessage);
                commandHandler.handleCommand(botMessage);
                emoteInjector.handleMessage(botMessage);
            }
        });
        client.on(
            Events.MessageUpdate,
            async (
                _old: discord.Message | discord.PartialMessage,
                newMessage: discord.Message | discord.PartialMessage,
            ) => {
                if (!newMessage.author || newMessage.author.id in disallowed) return;
                if (newMessage.channel.type !== ChannelType.DM && newMessage.content !== null) {
                    const botMsg = toBotMessage(newMessage as discord.Message);
                    await db.updateMessage(botMsg);
                    emoteInjector.handleMessage(botMsg);
                }
            },
        );
    }

    private attachReactionHandlers(
        client: discord.Client,
        db: IDatabase,
        commandHandler: CommandHandler,
        messageHandler: MessageHandler,
        config: BotConfig,
        logger: ILogger,
    ): void {
        client.on(
            Events.MessageReactionAdd,
            async (reaction: discord.MessageReaction | discord.PartialMessageReaction) => {
                const botReaction = toBotReaction(reaction);
                await db.insertReaction(botReaction);
                const botMessage = toBotMessage(reaction.message as discord.Message);
                if (!botMessage.author || botMessage.author.id !== client.user?.id) return;
                const emojiName = reaction.emoji.name;
                if (emojiName === config.negative_emoji) {
                    const positiveReaction = botMessage.reactions.resolve(config.positive_emoji);
                    if ((reaction.count ?? 0) >= 3 && (reaction.count ?? 0) > (positiveReaction?.count ?? 0)) {
                        setTimeout(() => messageHandler.delete(botMessage), 5000);
                        logger.warn(`Post deleted due to downvotes: ${botMessage.content}`);
                    }
                } else if (emojiName === config.redo_emoji) {
                    commandHandler.redo(botMessage, (id) => botMessage.channel.messages.fetch(id));
                }
            },
        );
    }

    private attachEmojiHandlers(client: discord.Client, backupHandler: BackupHandler): void {
        client.on(Events.GuildEmojiCreate, (emoji: EmojiLike) => {
            backupHandler.saveEmoji(emoji, emoji.guild.name);
        });
        client.on(Events.GuildEmojiDelete, (emoji: EmojiLike) => {
            backupHandler.saveEmoji(emoji, emoji.guild.name, "_deleted");
        });
        client.on(Events.GuildEmojiUpdate, (oldEmoji: EmojiLike, newEmoji: EmojiLike) => {
            backupHandler.saveEmoji(oldEmoji, oldEmoji.guild.name, "_old");
            backupHandler.saveEmoji(newEmoji, newEmoji.guild.name);
        });
    }
}
