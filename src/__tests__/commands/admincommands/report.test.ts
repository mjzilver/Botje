import { describe, it, expect, vi } from "vitest";
import reportCommand from "../../../commands/admincommands/report";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("report (admin)", () => {
    it("sends process stats when db query succeeds", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValue([{ size: "10 MB", count: "500" }]);

        await reportCommand.function(makeMessage("!report", { isAdmin: true }), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("Process ID"),
        );
    });
});
