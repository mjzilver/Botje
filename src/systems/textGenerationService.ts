import type { IBotContext } from "../interfaces";
import {
    cleanMessage,
    buildStyleProfile,
    buildChain,
    generate,
    isVerbatimRepeat,
    MIN_MESSAGES,
    MAX_RETRIES,
} from "./mimicBuilder";
import type { CachedProfile } from "./mimicBuilder";
import { mimicCache } from "./mimicCache";

function generateFromProfile(profile: CachedProfile): string {
    return generate(profile.chain, profile.starts, profile.style.targetWordCount, profile.style);
}

export async function generateMimicMessage(targetId: string, context: IBotContext): Promise<string | null> {
    const cached = mimicCache.get(targetId);
    if (cached !== null) {
        const result = generateFromProfile(cached);
        if (mimicCache.isExpired(cached))
            mimicCache.enqueue(targetId, context.database, context.logger, context.config.prefix);

        return result;
    }

    const rows = await context.database.query<{ message: string }>(
        `SELECT message FROM messages
         WHERE user_id = $1
         AND LENGTH(message) > 15
         ORDER BY RANDOM()
         LIMIT 5000`,
        [targetId],
    );

    const cleaned = rows
        .map((r) => cleanMessage(r.message, context.config.prefix))
        .filter((m): m is string => m !== null);

    if (cleaned.length < MIN_MESSAGES) return null;

    const style = buildStyleProfile(cleaned);
    const { chain, starts } = buildChain(cleaned);

    if (starts.length === 0) return null;

    let generated = generate(chain, starts, style.targetWordCount, style);
    for (let attempt = 1; attempt < MAX_RETRIES && isVerbatimRepeat(generated, cleaned); attempt++) {
        context.logger.debug(`Mimic verbatim repeat detected (attempt ${attempt}), regenerating`);
        generated = generate(chain, starts, style.targetWordCount, style);
    }

    const profile: CachedProfile = { chain, starts, style, builtAt: Date.now(), messageCount: cleaned.length };
    await mimicCache.enqueueWithProfile(targetId, profile, context.database, context.logger, context.config.prefix);

    return generated;
}

export async function generateTalkMessage(context: IBotContext, userId?: string): Promise<string | null> {
    const sql = userId
        ? `SELECT message FROM messages WHERE message NOT LIKE '%<%' AND user_id = $1 ORDER BY RANDOM() LIMIT 5000`
        : `SELECT message FROM messages WHERE message NOT LIKE '%<%' ORDER BY RANDOM() LIMIT 5000`;

    const rows = await context.database.query<{ message: string }>(sql, userId ? [userId] : []);

    const cleaned = rows
        .map((r) => cleanMessage(r.message, context.config.prefix))
        .filter((m): m is string => m !== null);

    if (cleaned.length === 0) return null;

    const style = buildStyleProfile(cleaned);
    const { chain, starts } = buildChain(cleaned);

    if (starts.length === 0) return null;

    return generate(chain, starts, style.targetWordCount, style);
}
