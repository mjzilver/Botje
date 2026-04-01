import * as discord from "discord.js";
import type { IDatabase, IMessageHandler, ILogger } from "../interfaces";
import type { BotConfig } from "../interfaces/config";
import type { BotMessage, MessageContent } from "../interfaces/discord";
import { toBotMessage } from "./messageAdapter";
import { toError } from "./utils";
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
        let promise: Promise<BotMessage>;
        if (call.isSlashCommand && call.interaction) {
            const interaction = call.interaction;
            promise =
                interaction.deferred || interaction.replied
                    ? interaction
                          .followUp(content as Parameters<typeof interaction.followUp>[0])
                          .then((m) => toBotMessage(m as discord.Message))
                    : interaction.reply(content as Parameters<typeof interaction.reply>[0]).then(() => call);
        } else if (useReply) {
            promise = call.reply(content).catch((err) => {
                this.logger.error(`Failed to reply (likely deleted): ${(err as Error).message}`);
                throw err;
            });
        } else {
            promise = call.channel.send(content);
        }
        return promise
            .then((reply) => {
                this.addCommandCall(call, reply);
                if (reply.reactions) {
                    this.react(reply, this.config.positive_emoji);
                    this.react(reply, this.config.negative_emoji);
                }
                return reply;
            })
            .catch(() => undefined);
    }
    send(call: BotMessage, content: MessageContent): Promise<BotMessage | undefined> {
        return this._sendMessage(call, content, false);
    }
    reply(call: BotMessage, content: MessageContent): Promise<BotMessage | undefined> {
        return this._sendMessage(call, content, true);
    }
    react(message: BotMessage, emoji: string): Promise<void> {
        return message.react(emoji).catch((err) => {
            this.logger.debug(`Failed to react (likely deleted): ${(err as Error).message}`);
        });
    }
    edit(replyObj: BotMessage, newContent: MessageContent): Promise<BotMessage> {
        return new Promise((resolve, reject) => {
            if (!replyObj) return reject(new Error("No reply object"));
            replyObj
                .edit(newContent)
                .then(resolve)
                .catch((err) => {
                    this.logger.debug(`Failed to edit (likely deleted): ${(err as Error).message}`);
                    reject(err);
                });
        });
    }
    delete(message: BotMessage): Promise<void> {
        return message.delete().catch((err) => {
            this.logger.debug(`Failed to delete (likely already deleted): ${(err as Error).message}`);
        });
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
