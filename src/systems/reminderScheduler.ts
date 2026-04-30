import type * as discord from "discord.js";
import type { IDatabase, ReminderRow } from "../interfaces";
import type { ILogger } from "../interfaces";
import { toError } from "./utils";

const MAX_REMINDER_MS = 24 * 60 * 60 * 1000;

export class ReminderScheduler {
    private client: discord.Client;
    private db: IDatabase;
    private logger: ILogger;
    private timers: Map<number, ReturnType<typeof setTimeout>> = new Map();

    constructor(client: discord.Client, db: IDatabase, logger: ILogger) {
        this.client = client;
        this.db = db;
        this.logger = logger;
    }

    async loadPending(): Promise<void> {
        try {
            const rows = await this.db.getPendingReminders();

            for (const row of rows) {
                const delay = row.trigger_at - Date.now();

                if (delay > 0 && delay <= MAX_REMINDER_MS) {
                    this.scheduleTimer(row, delay);
                } else {
                    await this.db.deleteReminder(row.id);
                }
            }
        } catch (err) {
            this.logger.error(toError(err));
        }
    }

    async schedule(userId: string, channelId: string, reminderMessage: string, delayMs: number): Promise<void> {
        const triggerAt = Date.now() + delayMs;
        const id = await this.db.insertReminder(userId, channelId, reminderMessage, triggerAt);
        const row: ReminderRow = {
            id,
            user_id: userId,
            channel_id: channelId,
            reminder_message: reminderMessage,
            trigger_at: triggerAt,
        };
        this.scheduleTimer(row, delayMs);
    }

    private scheduleTimer(row: ReminderRow, delayMs: number): void {
        const timer = setTimeout(() => {
            this.fire(row).catch((err: unknown) => this.logger.error(toError(err)));
        }, delayMs);
        this.timers.set(row.id, timer);
    }

    private async fire(row: ReminderRow): Promise<void> {
        this.timers.delete(row.id);

        try {
            const channel = await this.client.channels.fetch(row.channel_id);

            if (channel && channel.isTextBased() && "send" in channel) {
                await (channel as discord.TextChannel).send(`<@${row.user_id}> ⏰ Reminder: ${row.reminder_message}`);
            } else {
                const user = await this.client.users.fetch(row.user_id);
                await user.send(`⏰ Reminder: ${row.reminder_message}`);
            }
        } catch (err) {
            this.logger.error(toError(err));
        } finally {
            await this.db.deleteReminder(row.id).catch((err: unknown) => this.logger.error(toError(err)));
        }
    }
}
