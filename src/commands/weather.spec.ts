import { describe, it, expect } from "vitest";
import weatherCommand from "./weather";
import { makeMockContext , makeMessage } from "@test/helpers";

describe("weather", () => {
    it("has name 'weather'", () => expect(weatherCommand.name).toBe("weather"));

    it("sends error when no city argument is given", async () => {
        const context = makeMockContext();

        await weatherCommand.function(makeMessage("!weather"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("enter a city"),
        );
    });
});
