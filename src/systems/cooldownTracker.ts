export class CooldownTracker {
    private lastAttempt = new Map<string, Date>();
    isAllowed(key: string, cooldownMs: number): boolean {
        const now = new Date();
        const last = this.lastAttempt.get(key);
        if (!last || now.getTime() - last.getTime() >= cooldownMs) {
            this.lastAttempt.set(key, now);
            return true;
        }
        return false;
    }
    remainingMs(key: string, cooldownMs: number): number {
        const last = this.lastAttempt.get(key);
        if (!last) return 0;
        const elapsed = Date.now() - last.getTime();
        return Math.max(0, cooldownMs - elapsed);
    }
    reset(key: string): void {
        this.lastAttempt.delete(key);
    }
    resetAll(): void {
        this.lastAttempt.clear();
    }
}
