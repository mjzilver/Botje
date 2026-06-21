import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CooldownTracker } from "../../utils/support/cooldownTracker";

describe("CooldownTracker", () => {
    let tracker: CooldownTracker;
    beforeEach(() => {
        tracker = new CooldownTracker();
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it("allows first attempt for any key", () => {
        expect(tracker.isAllowed("user1", 5000)).toBe(true);
    });
    it("blocks a second attempt within the cooldown window", () => {
        tracker.isAllowed("user1", 5000);
        vi.advanceTimersByTime(3000);
        expect(tracker.isAllowed("user1", 5000)).toBe(false);
    });
    it("allows an attempt after the cooldown window has elapsed", () => {
        tracker.isAllowed("user1", 5000);
        vi.advanceTimersByTime(5001);
        expect(tracker.isAllowed("user1", 5000)).toBe(true);
    });
    it("tracks different keys independently", () => {
        tracker.isAllowed("user1", 5000);
        expect(tracker.isAllowed("user2", 5000)).toBe(true);
    });
    it("blocks user1 while user2 is still free", () => {
        tracker.isAllowed("user1", 5000);
        vi.advanceTimersByTime(1000);
        expect(tracker.isAllowed("user1", 5000)).toBe(false);
        expect(tracker.isAllowed("user2", 5000)).toBe(true);
    });
    describe("remainingMs", () => {
        it("returns 0 for an unknown key", () => {
            expect(tracker.remainingMs("unknown", 5000)).toBe(0);
        });
        it("returns remaining time within cooldown window", () => {
            tracker.isAllowed("user1", 5000);
            vi.advanceTimersByTime(2000);
            const remaining = tracker.remainingMs("user1", 5000);
            expect(remaining).toBeGreaterThan(0);
            expect(remaining).toBeLessThanOrEqual(3000);
        });
        it("returns 0 after the cooldown window has elapsed", () => {
            tracker.isAllowed("user1", 5000);
            vi.advanceTimersByTime(6000);
            expect(tracker.remainingMs("user1", 5000)).toBe(0);
        });
    });
    describe("reset", () => {
        it("allows the key again immediately after reset", () => {
            tracker.isAllowed("user1", 5000);
            vi.advanceTimersByTime(1000);
            tracker.reset("user1");
            expect(tracker.isAllowed("user1", 5000)).toBe(true);
        });
        it("reset of one key does not affect other keys", () => {
            tracker.isAllowed("user1", 5000);
            tracker.isAllowed("user2", 5000);
            tracker.reset("user1");
            vi.advanceTimersByTime(1000);
            expect(tracker.isAllowed("user1", 5000)).toBe(true);
            expect(tracker.isAllowed("user2", 5000)).toBe(false);
        });
    });
    describe("resetAll", () => {
        it("allows all keys again after resetAll", () => {
            tracker.isAllowed("user1", 5000);
            tracker.isAllowed("user2", 5000);
            vi.advanceTimersByTime(1000);
            tracker.resetAll();
            expect(tracker.isAllowed("user1", 5000)).toBe(true);
            expect(tracker.isAllowed("user2", 5000)).toBe(true);
        });
    });
});
