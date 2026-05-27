import { describe, it, expect, vi, afterEach } from "vitest";
import { queryCache, CACHE_TTL_MS } from "../../systems/queryCache";

afterEach(() => {
    vi.useRealTimers();
});

describe("queryCache", () => {
    describe("cache miss", () => {
        it("calls the factory on the first request", async () => {
            const factory = vi.fn().mockResolvedValue("result");
            await queryCache("miss-1", factory);
            expect(factory).toHaveBeenCalledTimes(1);
        });

        it("returns the value produced by the factory", async () => {
            const result = await queryCache("miss-2", () => Promise.resolve(42));
            expect(result).toBe(42);
        });
    });

    describe("cache hit", () => {
        it("returns the cached promise on a second call without invoking the factory again", async () => {
            const factory = vi.fn().mockResolvedValue("cached");
            await queryCache("hit-1", factory);
            await queryCache("hit-1", factory);
            expect(factory).toHaveBeenCalledTimes(1);
        });

        it("returns the same value on both calls", async () => {
            let counter = 0;
            const factory = () => Promise.resolve(++counter);
            const first = await queryCache("hit-2", factory);
            const second = await queryCache("hit-2", factory);
            expect(first).toBe(1);
            expect(second).toBe(1);
        });
    });

    describe("error eviction", () => {
        it("evicts the entry when the factory rejects", async () => {
            const factory = vi.fn().mockRejectedValue(new Error("boom"));
            await expect(queryCache("evict-1", factory)).rejects.toThrow("boom");
            await expect(queryCache("evict-1", factory)).rejects.toThrow("boom");
            expect(factory).toHaveBeenCalledTimes(2);
        });

        it("allows a successful retry after the factory previously rejected", async () => {
            const factory = vi
                .fn()
                .mockRejectedValueOnce(new Error("first fail"))
                .mockResolvedValueOnce("recovered");
            await expect(queryCache("evict-2", factory)).rejects.toThrow("first fail");
            const result = await queryCache("evict-2", factory);
            expect(result).toBe("recovered");
        });
    });

    describe("TTL expiry", () => {
        it("calls the factory again after the TTL has elapsed", async () => {
            vi.useFakeTimers();
            const factory = vi.fn().mockResolvedValue("fresh");
            await queryCache("ttl-1", factory, 1000);
            vi.advanceTimersByTime(1001);
            await queryCache("ttl-1", factory, 1000);
            expect(factory).toHaveBeenCalledTimes(2);
        });

        it("does not call the factory again before the TTL elapses", async () => {
            vi.useFakeTimers();
            const factory = vi.fn().mockResolvedValue("still-fresh");
            await queryCache("ttl-2", factory, 1000);
            vi.advanceTimersByTime(999);
            await queryCache("ttl-2", factory, 1000);
            expect(factory).toHaveBeenCalledTimes(1);
        });

        it("uses CACHE_TTL_MS as the default TTL", async () => {
            vi.useFakeTimers();
            const factory = vi.fn().mockResolvedValue("default");
            await queryCache("ttl-3", factory);
            vi.advanceTimersByTime(CACHE_TTL_MS - 1);
            await queryCache("ttl-3", factory);
            expect(factory).toHaveBeenCalledTimes(1);
            vi.advanceTimersByTime(1);
            await queryCache("ttl-3", factory);
            expect(factory).toHaveBeenCalledTimes(2);
        });
    });

    describe("key isolation", () => {
        it("treats different keys as independent cache entries", async () => {
            let aCount = 0;
            let bCount = 0;
            await queryCache("iso-a", () => Promise.resolve(++aCount));
            await queryCache("iso-b", () => Promise.resolve(++bCount));
            await queryCache("iso-a", () => Promise.resolve(++aCount));
            await queryCache("iso-b", () => Promise.resolve(++bCount));
            expect(aCount).toBe(1);
            expect(bCount).toBe(1);
        });
    });
});
