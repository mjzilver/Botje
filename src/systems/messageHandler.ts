import * as discord from "discord.js";
import type { IDatabase } from "./database";
import type { ILogger } from "./logger";
import type { BotConfig } from "../interfaces/config";
import type { BotMessage, MessageContent } from "../interfaces/discord";
import { toBotMessage } from "./messageAdapter";
import { toError } from "./utils";

export interface IMessageHandler {
    send(call: BotMessage, content: MessageContent): Promise<BotMessage | undefined>;
    reply(call: BotMessage, content: MessageContent): Promise<BotMessage | undefined>;
    edit(replyObj: BotMessage, newContent: MessageContent): Promise<BotMessage>;
    delete(message: BotMessage): Promise<void>;
    react(message: BotMessage, emoji: string): Promise<void>;
    addCommandCall(call: BotMessage, reply: BotMessage): void;
    markComplete(call: BotMessage): void;
    findFromReply(replyMessage: BotMessage): string | undefined;
}

const COMMAND_CALL_SQL = `INSERT INTO command_calls (call_id, reply_id, timestamp)
        VALUES ($1::bigint, $2::bigint, $3::bigint)
        ON CONFLICT (call_id) DO UPDATE SET reply_id = EXCLUDED.reply_id;`;

export class MessageHandler implements IMessageHandler {
    private db: IDatabase;
    private logger: ILogger;
    private config: BotConfig;
    private commandCalls: Record<string, string> = {};
    private removeFromCommandList?: (msg: BotMessage) => void;
    constructor(db: IDatabase, logger: ILogger, config: BotConfig) {
        this.db = db;
        this.logger = logger;
        this.config = config;
    }

    setCommandListRemover(fn: (msg: BotMessage) => void): void {
        this.removeFromCommandList = fn;
    }

    private async _sendMessage(
        call: BotMessage,
        content: MessageContent,
        useReply: boolean,
    ): Promise<BotMessage | undefined> {
        if (!content) {
            this.logger.error(`Content empty, could not send. Call: "${call.id}"`);
            this.markComplete(call);

            return undefined;
        }

        let reply: BotMessage;
        try {
            if (call.isSlashCommand && call.slashInteraction) {
                const interaction = call.slashInteraction;
                if (interaction.deferred || interaction.replied) {
                    reply = toBotMessage(
                        (await interaction.followUp(content as discord.InteractionReplyOptions)) as discord.Message,
                    );
                } else {
                    await interaction.reply(content as discord.InteractionReplyOptions);
                    reply = call;
                }
            } else if (useReply) {
                try {
                    reply = await call.reply(content);
                } catch (err) {
                    this.logger.error(`Failed to reply (likely deleted): ${toError(err).message}`);
                    throw err;
                }
            } else {
                reply = await call.channel.send(content);
            }
        } catch {
            return undefined;
        }

        this.addCommandCall(call, reply);
        if (reply.reactions) {
            this.react(reply, this.config.positive_emoji);
            this.react(reply, this.config.negative_emoji);
        }

        return reply;
    }

    send(call: BotMessage, content: MessageContent): Promise<BotMessage | undefined> {
        return this._sendMessage(call, content, false);
    }

    reply(call: BotMessage, content: MessageContent): Promise<BotMessage | undefined> {
        return this._sendMessage(call, content, true);
    }

    react(message: BotMessage, emoji: string): Promise<void> {
        message.react(emoji).catch((err) => {
            this.logger.debug(`Failed to react (likely deleted): ${toError(err).message}`);
        });

        return Promise.resolve();
    }

    async edit(replyObj: BotMessage, newContent: MessageContent): Promise<BotMessage> {
        if (!replyObj) throw new Error("No reply object");
        try {
            return await replyObj.edit(newContent);
        } catch (err) {
            this.logger.debug(`Failed to edit (likely deleted): ${toError(err).message}`);
            throw err;
        }
    }

    delete(message: BotMessage): Promise<void> {
        message.delete().catch((err) => {
            this.logger.debug(`Failed to delete (likely already deleted): ${toError(err).message}`);
        });

        return Promise.resolve();
    }

    findFromReply(replyMessage: BotMessage): string | undefined {
        for (const [callId, replyId] of Object.entries(this.commandCalls))
            if (replyId === replyMessage.id) return callId;
    }

    markComplete(call: BotMessage): void {
        this.db.insert(COMMAND_CALL_SQL, [call.id, null, call.createdAt.getTime()]);
        this.removeFromCommandList?.(call);
    }

    addCommandCall(call: BotMessage, reply: BotMessage): void {
        this.commandCalls[call.id] = reply.id;
        this.db.insert(COMMAND_CALL_SQL, [call.id, reply.id, call.createdAt.getTime()]);
        this.removeFromCommandList?.(call);
    }

    async loadCommandCalls(): Promise<void> {
        const since = Date.now() - 24 * 60 * 60 * 1000;
        const sql = `SELECT call_id, reply_id FROM command_calls
        WHERE timestamp > $1
        ORDER BY timestamp DESC`;
        try {
            const rows = await this.db.query<{
                call_id: string;
                reply_id: string;
            }>(sql, [since]);
            for (const row of rows) this.commandCalls[row.call_id] = row.reply_id;
        } catch (err) {
            this.logger.error(toError(err));
        }
    }

    getCommandCalls(): Record<string, string> {
        return { ...this.commandCalls };
    }
}
