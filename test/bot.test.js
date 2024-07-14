let bot
const { config } = require("systems/settings")

// eslint-disable-next-line camelcase
config.discord_api_key = config.discord_api_key_beta

beforeAll(() => {
    bot = require("systems/bot")
    bot.loadSystems = () => {
        this.command = require("systems/command.js")
        this.logic = require("systems/logic.js")
        this.backup = require("systems/backup.js")
        this.reply = require("systems/reply.js")
        this.dictionary = require("systems/dictionary.js")
    }
})

describe("bot", () => {
    test("should be fully loaded - and eventListener and message systems are to be disabled", (done) => {
        bot.client.on("ready", () => {
            expect(bot).toBeDefined()
            expect(bot.eventListener).toBeUndefined()
            expect(bot.message).toBeUndefined()
            done()
        })
    })
})

afterAll(() => {
    bot.client.destroy()
})