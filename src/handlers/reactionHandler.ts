import type { IDatabase } from "../infrastructure/database";
import type { ILogger } from "../infrastructure/logger";
import type { BotConfig } from "../interfaces/config";
import type { BotMessage, BotReaction } from "../interfaces/discord";
import type { CommandHandler } from "./commandHandler";
import type { IMessageHandler } from "./messageHandler";

const DELETE_DELAY_MS = 5000;

export interface IReactionHandler {
    process(reaction: BotReaction, isRemove: boolean, message: BotMessage): Promise<void>;
}

export class ReactionHandler implements IReactionHandler {
    constructor(
        private db: IDatabase,
        private commandHandler: CommandHandler,
        private messageHandler: IMessageHandler,
        private config: BotConfig,
        private logger: ILogger,
        private getBotUserId: () => string | null,
    ) {}

    async process(reaction: BotReaction, isRemove: boolean, message: BotMessage): Promise<void> {
        if (isRemove) {
            return;
        }

        await this.db.insertReaction(reaction);

        if (!message.author || message.author.id !== this.getBotUserId()) {
            return;
        }

        const emojiName = reaction.emoji.name;

        if (emojiName === this.config.negativeEmoji) {
            const positiveReaction = message.reactions.resolve(this.config.positiveEmoji);
            if (
                (reaction.count ?? 0) >= this.config.downvoteThreshold &&
                (reaction.count ?? 0) > (positiveReaction?.count ?? 0)
            ) {
                setTimeout(() => this.messageHandler.delete(message), DELETE_DELAY_MS);
                this.logger.warn(`Post deleted due to downvotes: ${message.content}`);
            }
        } else if (emojiName === this.config.redoEmoji) {
            this.commandHandler.redo(message, (id) => message.channel.messages.fetch(id));
        }
    }
}
