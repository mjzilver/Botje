export const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, { promise: Promise<unknown>; expiry: number }>();

export function queryCache<T>(key: string, factory: () => Promise<T>, ttl = CACHE_TTL_MS): Promise<T> {
    const entry = cache.get(key);
    if (entry && entry.expiry > Date.now()) return entry.promise as Promise<T>;

    const promise = factory().catch((err: unknown) => {
        cache.delete(key);
        throw err;
    });
    cache.set(key, { promise, expiry: Date.now() + ttl });

    return promise as Promise<T>;
}

export const CacheKey = {
    msgRowsUser: (serverId: string, userId: string) => `msg-rows-user:${serverId}:${userId}`,
    msgRowsServer: (serverId: string) => `msg-rows-server:${serverId}`,
    qualityUser: (serverId: string, userId: string) => `quality-user:${serverId}:${userId}`,
    qualityServer: (serverId: string) => `quality-server:${serverId}`,
    reactionsServer: (serverId: string) => `reactions-server:${serverId}`,
    reactionsMentionUser: (serverId: string, userId: string) => `reactions-mention:${serverId}:${userId}`,
    reactionsPerPerson: (serverId: string) => `reactions-per-person:${serverId}`,
    statsUser: (serverId: string, userId: string) => `stats-user:${serverId}:${userId}`,
};
