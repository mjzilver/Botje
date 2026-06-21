import * as discord from "discord.js";
import { ChannelType, Events } from "discord.js";
import type { IDatabase, ILogger } from "../interfaces";
import type { CommandHandler } from "./commandHandler";
import type { EmoteInjector } from "../features/emoji/emoteInjector";
import type { SlashHandler } from "./slashHandler";
import type { BackupHandler } from "../features/backup/backupHandler";
import type { ReactionHandler } from "./reactionHandler";
import { toBotMessage, toBotReaction } from "../adapters/messageAdapter";
import { toError } from "../utils";

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
        emoteInjector: EmoteInjector,
        slashHandler: SlashHandler,
        backupHandler: BackupHandler,
        logger: ILogger,
        disallowed: Record<string, boolean>,
        reactionHandler: ReactionHandler,
    ) {
        this.attachErrorHandlers(client, logger);
        this.attachMessageHandlers(client, db, commandHandler, emoteInjector, disallowed, logger);
        this.attachReactionHandlers(client, reactionHandler, logger);
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
        logger: ILogger,
    ): void {
        client.on(Events.MessageCreate, async (message: discord.Message) => {
            try {
                const botMessage = toBotMessage(message);
                if (botMessage.author.id in disallowed) return;
                if (message.channel.type === ChannelType.DM) {
                    commandHandler.handleDM(botMessage);
                } else {
                    await db.storeMessage(botMessage);
                    commandHandler.handleCommand(botMessage);
                    emoteInjector.handleMessage(botMessage);
                }
            } catch (err) {
                logger.error(toError(err));
            }
        });
        client.on(
            Events.MessageUpdate,
            async (
                _old: discord.Message | discord.PartialMessage,
                newMessage: discord.Message | discord.PartialMessage,
            ) => {
                try {
                    if (!newMessage.author || newMessage.author.id in disallowed) return;
                    if (newMessage.channel.type !== ChannelType.DM && newMessage.content !== null) {
                        const botMsg = toBotMessage(newMessage as discord.Message);
                        await db.updateMessage(botMsg);
                        emoteInjector.handleMessage(botMsg);
                    }
                } catch (err) {
                    logger.error(toError(err));
                }
            },
        );
    }

    private attachReactionHandlers(client: discord.Client, reactionHandler: ReactionHandler, logger: ILogger): void {
        client.on(
            Events.MessageReactionAdd,
            async (reaction: discord.MessageReaction | discord.PartialMessageReaction) => {
                try {
                    const botReaction = toBotReaction(reaction);
                    const botMessage = toBotMessage(reaction.message as discord.Message);
                    await reactionHandler.process(botReaction, false, botMessage);
                } catch (err) {
                    logger.error(toError(err));
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
