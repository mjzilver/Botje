import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Client } from "discord.js";
import { ReminderScheduler } from "../../features/reminders/reminderScheduler";
import type { IDatabase, ReminderRow } from "../../interfaces";
import type { ILogger } from "../../interfaces";

function makeDb(overrides: Partial<IDatabase> = {}): IDatabase {
    return {
        getPendingReminders: vi.fn().mockResolvedValue([]),
        insertReminder: vi.fn().mockResolvedValue(1),
        deleteReminder: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        queryRandomMessage: vi.fn(),
        getDisallowed: vi.fn(),
        getUserSettings: vi.fn(),
        setUserSettings: vi.fn(),
        ...overrides,
    } as unknown as IDatabase;
}

function makeLogger(): ILogger {
    return {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        startup: vi.fn(),
        console: vi.fn(),
        repeat: vi.fn(),
        printColumns: vi.fn(),
        printRows: vi.fn(),
    };
}

function makeRow(overrides: Partial<ReminderRow> = {}): ReminderRow {
    return {
        id: 1,
        user_id: "user-1",
        channel_id: "chan-1",
        reminder_message: "test reminder",
        trigger_at: Date.now() + 60_000,
        ...overrides,
    };
}

function makeClient(channelPayload: unknown = null, userPayload: unknown = null): Client {
    return {
        channels: {
            fetch: vi.fn().mockResolvedValue(channelPayload),
        },
        users: {
            fetch: vi.fn().mockResolvedValue(userPayload),
        },
    } as unknown as Client;
}

describe("ReminderScheduler", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("schedule", () => {
        it("calls insertReminder with the correct arguments", async () => {
            const db = makeDb();
            const scheduler = new ReminderScheduler(makeClient(), db, makeLogger());
            await scheduler.schedule("user-1", "chan-1", "wash dishes", 5000);
            const [userId, channelId, message] = vi.mocked(db.insertReminder).mock.calls[0];
            expect(userId).toBe("user-1");
            expect(channelId).toBe("chan-1");
            expect(message).toBe("wash dishes");
        });

        it("fires the reminder after the delay elapses", async () => {
            const channel = { isTextBased: () => true, send: vi.fn().mockResolvedValue(undefined) };
            const db = makeDb({ insertReminder: vi.fn().mockResolvedValue(42) });
            const client = makeClient(channel);
            const scheduler = new ReminderScheduler(client, db, makeLogger());

            await scheduler.schedule("user-1", "chan-1", "take meds", 3000);
            vi.advanceTimersByTime(3000);
            await vi.runAllTimersAsync();

            expect(channel.send).toHaveBeenCalledWith(expect.stringContaining("take meds"));
        });

        it("does not fire before the delay elapses", async () => {
            const channel = { isTextBased: () => true, send: vi.fn().mockResolvedValue(undefined) };
            const db = makeDb({ insertReminder: vi.fn().mockResolvedValue(5) });
            const scheduler = new ReminderScheduler(makeClient(channel), db, makeLogger());

            await scheduler.schedule("user-1", "chan-1", "reminder", 5000);
            vi.advanceTimersByTime(4999);

            expect(channel.send).not.toHaveBeenCalled();
        });
    });

    describe("loadPending", () => {
        it("schedules a reminder with a future trigger_at within MAX_REMINDER_MS", async () => {
            const row = makeRow({ trigger_at: Date.now() + 30_000 });
            const db = makeDb({ getPendingReminders: vi.fn().mockResolvedValue([row]) });
            const channel = { isTextBased: () => true, send: vi.fn().mockResolvedValue(undefined) };
            const scheduler = new ReminderScheduler(makeClient(channel), db, makeLogger());

            await scheduler.loadPending();
            vi.advanceTimersByTime(30_000);
            await vi.runAllTimersAsync();

            expect(channel.send).toHaveBeenCalledWith(expect.stringContaining("test reminder"));
        });

        it("deletes a reminder whose trigger_at is in the past", async () => {
            const row = makeRow({ id: 7, trigger_at: Date.now() - 1000 });
            const db = makeDb({ getPendingReminders: vi.fn().mockResolvedValue([row]) });
            const scheduler = new ReminderScheduler(makeClient(), db, makeLogger());

            await scheduler.loadPending();

            expect(db.deleteReminder).toHaveBeenCalledWith(7);
        });

        it("deletes a reminder whose delay exceeds MAX_REMINDER_MS", async () => {
            const overLimit = 25 * 60 * 60 * 1000;
            const row = makeRow({ id: 8, trigger_at: Date.now() + overLimit });
            const db = makeDb({ getPendingReminders: vi.fn().mockResolvedValue([row]) });
            const scheduler = new ReminderScheduler(makeClient(), db, makeLogger());

            await scheduler.loadPending();

            expect(db.deleteReminder).toHaveBeenCalledWith(8);
        });

        it("logs the error and does not throw when getPendingReminders rejects", async () => {
            const logger = makeLogger();
            const db = makeDb({ getPendingReminders: vi.fn().mockRejectedValue(new Error("db down")) });
            const scheduler = new ReminderScheduler(makeClient(), db, logger);

            await expect(scheduler.loadPending()).resolves.toBeUndefined();
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe("fire — channel send", () => {
        it("sends to the channel when it is text-based and has send", async () => {
            const channel = { isTextBased: () => true, send: vi.fn().mockResolvedValue(undefined) };
            const db = makeDb({ insertReminder: vi.fn().mockResolvedValue(10) });
            const scheduler = new ReminderScheduler(makeClient(channel), db, makeLogger());

            await scheduler.schedule("user-1", "chan-1", "hello channel", 100);
            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            expect(channel.send).toHaveBeenCalledWith(expect.stringContaining("hello channel"));
        });

        it("includes the user mention in the channel message", async () => {
            const channel = { isTextBased: () => true, send: vi.fn().mockResolvedValue(undefined) };
            const db = makeDb({ insertReminder: vi.fn().mockResolvedValue(11) });
            const scheduler = new ReminderScheduler(makeClient(channel), db, makeLogger());

            await scheduler.schedule("user-42", "chan-1", "dentist", 100);
            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            expect(channel.send).toHaveBeenCalledWith(expect.stringContaining("<@user-42>"));
        });

        it("always calls deleteReminder after firing regardless of channel success", async () => {
            const channel = { isTextBased: () => true, send: vi.fn().mockResolvedValue(undefined) };
            const db = makeDb({ insertReminder: vi.fn().mockResolvedValue(12) });
            const scheduler = new ReminderScheduler(makeClient(channel), db, makeLogger());

            await scheduler.schedule("user-1", "chan-1", "msg", 100);
            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            expect(db.deleteReminder).toHaveBeenCalledWith(12);
        });
    });

    describe("fire — DM fallback", () => {
        it("sends a DM when channel fetch returns null", async () => {
            const user = { send: vi.fn().mockResolvedValue(undefined) };
            const db = makeDb({ insertReminder: vi.fn().mockResolvedValue(20) });
            const scheduler = new ReminderScheduler(makeClient(null, user), db, makeLogger());

            await scheduler.schedule("user-1", "chan-1", "dm reminder", 100);
            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            expect(user.send).toHaveBeenCalledWith(expect.stringContaining("dm reminder"));
        });

        it("sends a DM when channel is not text-based", async () => {
            const channel = { isTextBased: () => false };
            const user = { send: vi.fn().mockResolvedValue(undefined) };
            const db = makeDb({ insertReminder: vi.fn().mockResolvedValue(21) });
            const scheduler = new ReminderScheduler(makeClient(channel, user), db, makeLogger());

            await scheduler.schedule("user-1", "chan-1", "voice fallback", 100);
            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            expect(user.send).toHaveBeenCalledWith(expect.stringContaining("voice fallback"));
        });

        it("calls deleteReminder after DM fallback as well", async () => {
            const user = { send: vi.fn().mockResolvedValue(undefined) };
            const db = makeDb({ insertReminder: vi.fn().mockResolvedValue(22) });
            const scheduler = new ReminderScheduler(makeClient(null, user), db, makeLogger());

            await scheduler.schedule("user-1", "chan-1", "msg", 100);
            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            expect(db.deleteReminder).toHaveBeenCalledWith(22);
        });
    });

    describe("fire — error handling", () => {
        it("logs and does not throw when channel.send rejects", async () => {
            const logger = makeLogger();
            const channel = { isTextBased: () => true, send: vi.fn().mockRejectedValue(new Error("send failed")) };
            const db = makeDb({ insertReminder: vi.fn().mockResolvedValue(30) });
            const scheduler = new ReminderScheduler(makeClient(channel), db, logger);

            await scheduler.schedule("user-1", "chan-1", "msg", 100);
            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            expect(logger.error).toHaveBeenCalled();
        });

        it("still calls deleteReminder even when send throws", async () => {
            const channel = { isTextBased: () => true, send: vi.fn().mockRejectedValue(new Error("boom")) };
            const db = makeDb({ insertReminder: vi.fn().mockResolvedValue(31) });
            const scheduler = new ReminderScheduler(makeClient(channel), db, makeLogger());

            await scheduler.schedule("user-1", "chan-1", "msg", 100);
            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            expect(db.deleteReminder).toHaveBeenCalledWith(31);
        });

        it("logs a deleteReminder failure without throwing", async () => {
            const logger = makeLogger();
            const channel = { isTextBased: () => true, send: vi.fn().mockResolvedValue(undefined) };
            const db = makeDb({
                insertReminder: vi.fn().mockResolvedValue(32),
                deleteReminder: vi.fn().mockRejectedValue(new Error("delete failed")),
            });
            const scheduler = new ReminderScheduler(makeClient(channel), db, logger);

            await scheduler.schedule("user-1", "chan-1", "msg", 100);
            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            expect(logger.error).toHaveBeenCalled();
        });
    });
});
