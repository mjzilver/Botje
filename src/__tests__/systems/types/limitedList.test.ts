import { describe, it, expect } from "vitest";
import { LimitedList } from "../../../systems/types/limitedList";
describe("LimitedList", () => {
    it("stores items up to limit", () => {
        const list = new LimitedList<number>(3);
        list.push(1);
        list.push(2);
        list.push(3);
        expect(list.length).toBe(3);
    });
    it("evicts oldest item when over limit", () => {
        const list = new LimitedList<number>(3);
        list.push(1);
        list.push(2);
        list.push(3);
        list.push(4);
        expect(list.length).toBe(3);
        expect(list.toArray()).toEqual([2, 3, 4]);
    });
    it("get returns last inserted item", () => {
        const list = new LimitedList<string>(5);
        list.push("a");
        list.push("b");
        expect(list.get()).toBe("b");
    });
    it("get returns undefined when empty", () => {
        const list = new LimitedList<string>(5);
        expect(list.get()).toBeUndefined();
    });
    it("remove deletes specific item", () => {
        const list = new LimitedList<number>(5);
        list.push(1);
        list.push(2);
        list.push(3);
        list.remove(2);
        expect(list.toArray()).toEqual([1, 3]);
    });
});
