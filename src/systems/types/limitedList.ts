export class LimitedList<T> {
    private limit: number;
    private items: T[];
    constructor(limit: number) {
        this.limit = limit;
        this.items = [];
    }

    push(item: T): void {
        if (this.items.length >= this.limit) this.items.shift();
        this.items.push(item);
    }

    get(): T | undefined {
        return this.items[this.items.length - 1];
    }

    remove(item: T): void {
        const idx = this.items.indexOf(item);
        if (idx !== -1) this.items.splice(idx, 1);
    }

    get length(): number {
        return this.items.length;
    }

    toArray(): T[] {
        return [...this.items];
    }
}
