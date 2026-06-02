import { describe, it, expect, vi } from "vitest";
import reportCommand from "../../../commands/clcommands/report";
import { makeMockContext } from "@test/helpers";

describe("report (cl)", () => {
    it("calls printRows with system stats when db query succeeds", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValue([{ size: "10 MB", count: "500" }]);

        await reportCommand.function([], context);

        expect(context.logger.printRows).toHaveBeenCalledWith(
            expect.arrayContaining([expect.arrayContaining(["Process ID"])]),
        );
    });
});
