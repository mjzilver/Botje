import { describe, it, expect } from "vitest";
import weatherCommand from "./weather";
import { makeMockContext } from "../__tests__/helpers/mockContext";
import { makeMessage } from "../__tests__/helpers/mockMessage";

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
