import { describe, it, expect, vi, beforeEach } from "vitest";
import weatherCommand from "../../commands/weather";
import { makeMockContext, makeMessage } from "@test/helpers";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

describe("weather command – metadata", () => {
    it("has name 'weather'", () => expect(weatherCommand.name).toBe("weather"));
});

describe("weather command – execution", () => {
    beforeEach(() => vi.clearAllMocks());

    it("sends error when no city argument is given", async () => {
        const context = makeMockContext();
        await weatherCommand.function(makeMessage("!weather"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("enter a city"),
        );
    });

    it("sends an embed on a successful API response", async () => {
        const axios = await import("axios");
        vi.mocked(axios.default.get).mockResolvedValueOnce({
            data: {
                cod: 200,
                name: "Amsterdam",
                sys: { country: "NL", sunrise: 1000, sunset: 2000 },
                timezone: 3600,
                weather: [{ description: "clear sky", icon: "01d" }],
                main: { temp: 18, feels_like: 16, humidity: 60, pressure: 1013 },
                wind: { speed: 3 },
                clouds: { all: 10 },
            },
        });

        const context = makeMockContext();
        await weatherCommand.function(makeMessage("!weather Amsterdam"), context);

        expect(context.messageHandler.send).toHaveBeenCalledOnce();
        const payload = (context.messageHandler.send as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(payload).toHaveProperty("embeds");
    });

    it("sends the API error message when cod is not 200", async () => {
        const axios = await import("axios");
        vi.mocked(axios.default.get).mockResolvedValueOnce({
            data: { cod: 404, message: "city not found" },
        });

        const context = makeMockContext();
        await weatherCommand.function(makeMessage("!weather Atlantis"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringMatching(/city not found/i),
        );
    });

    it("sends failure message and logs error when request throws", async () => {
        const axios = await import("axios");
        vi.mocked(axios.default.get).mockRejectedValueOnce(new Error("network error"));

        const context = makeMockContext();
        await weatherCommand.function(makeMessage("!weather Amsterdam"), context);

        expect(context.logger.error).toHaveBeenCalled();
        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("Couldn't get"),
        );
    });
});
