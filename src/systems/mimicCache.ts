import fs from "fs";
import path from "path";
import type { IDatabase, ILogger } from "../interfaces";
import { toError } from "./utils";
import { cleanMessage, buildStyleProfile, buildChain, MIN_MESSAGES } from "./mimicBuilder";
import type { CachedProfile } from "./mimicBuilder";

const EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;
const QUEUE_DELAY_MS = 2_000;
const BUILD_MESSAGE_LIMIT = 50_000;

interface QueueItem {
    userId: string;
    db: IDatabase;
    logger: ILogger;
    prefix: string;
}

export class MimicCache {
    private readonly cacheDir: string;
    private readonly queue: QueueItem[] = [];
    private readonly pendingOrQueued = new Set<string>();
    private processing = false;

    constructor(cacheDir: string) {
        this.cacheDir = cacheDir;
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    get(userId: string): CachedProfile | null {
        try {
            const raw = fs.readFileSync(this.cachePath(userId), "utf8");

            return JSON.parse(raw) as CachedProfile;
        } catch {
            return null;
        }
    }

    isExpired(profile: CachedProfile): boolean {
        return Date.now() - profile.builtAt > EXPIRY_MS;
    }

    private async save(userId: string, profile: CachedProfile): Promise<void> {
        await fs.promises.writeFile(this.cachePath(userId), JSON.stringify(profile), "utf8");
    }

    async enqueueWithProfile(
        userId: string,
        profile: CachedProfile,
        db: IDatabase,
        logger: ILogger,
        prefix: string,
    ): Promise<void> {
        await this.save(userId, profile);
        this.enqueue(userId, db, logger, prefix);
    }

    enqueue(userId: string, db: IDatabase, logger: ILogger, prefix: string): void {
        const key = userId;
        if (this.pendingOrQueued.has(key)) return;
        this.pendingOrQueued.add(key);
        const item: QueueItem = { userId, db, logger, prefix };
        this.queue.push(item);
        if (!this.processing) void this.processQueue();
    }

    private itemKey(userId: string): string {
        return userId;
    }

    private cachePath(userId: string): string {
        return path.join(this.cacheDir, `${userId}.json`);
    }

    private async processQueue(): Promise<void> {
        this.processing = true;
        while (this.queue.length > 0) {
            const item = this.queue.shift()!;
            await this.buildAndSave(item);
            this.pendingOrQueued.delete(this.itemKey(item.userId));
            if (this.queue.length > 0) {
                await new Promise<void>((resolve) => setTimeout(resolve, QUEUE_DELAY_MS));
            }
        }

        this.processing = false;
    }

    private async buildAndSave({ userId, db, logger, prefix }: QueueItem): Promise<void> {
        if (userId === "0") return;
        try {
            const nameRows = await db.query<{ user_name: string }>(
                `SELECT user_name FROM usernames WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1`,
                [userId],
            );
            const displayName = nameRows[0]?.user_name ?? userId;
            if (/^deleted.?user/i.test(displayName)) {
                logger.debug(`Mimic cache skipped for ${displayName} — deleted account`);

                return;
            }

            const rows = await db.query<{ message: string }>(
                `SELECT message FROM messages
                 WHERE user_id = $1
                 AND LENGTH(message) > 15
                 ORDER BY datetime DESC
                 LIMIT $2`,
                [userId, BUILD_MESSAGE_LIMIT],
            );
            const cleaned = rows.map((r) => cleanMessage(r.message, prefix)).filter((m): m is string => m !== null);
            if (cleaned.length < MIN_MESSAGES) {
                logger.debug(`Mimic cache skipped for ${displayName} — only ${cleaned.length} usable messages`);

                return;
            }

            const style = buildStyleProfile(cleaned);
            const { chain, starts } = buildChain(cleaned);
            const profile: CachedProfile = { chain, starts, style, builtAt: Date.now(), messageCount: cleaned.length };
            await fs.promises.writeFile(this.cachePath(userId), JSON.stringify(profile), "utf8");
            logger.debug(`Mimic cache built for ${displayName} (${cleaned.length} messages)`);
        } catch (err) {
            logger.error(toError(err));
        }
    }
}

export const mimicCache = new MimicCache(path.join(process.cwd(), "data", "mimic-cache"));
