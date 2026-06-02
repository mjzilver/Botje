import { describe, it, expect, vi } from "vitest";
import checkdupesCommand from "../../../commands/clcommands/checkduplicates";
import { makeMockContext } from "@test/helpers";

describe("checkduplicates (cl)", () => {
    it("logs duplicate count from database", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValue([{ message: "hello", datetime: 123, count: "2" }]);

        await checkdupesCommand.function([], context);

        expect(context.logger.console).toHaveBeenCalledWith("Found 1 duplicates");
    });
});
