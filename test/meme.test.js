let bot
let config = require("config.json")
config.discord_api_key = config.discord_api_key_beta
let database = require("systems/database")
sqlite3 = require("sqlite3").verbose()
database.db = new sqlite3.Database("discord_test.db")

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
    test("should be fully loaded - and eventlistener and message systems are to be disabled", (done) => {
        bot.client.on("ready", () => {
            expect(bot).toBeDefined()
            expect(bot.eventlistener).toBeUndefined()
            expect(bot.message).toBeUndefined()
            done()
        })
    })
})

afterAll(() => {
    bot.client.destroy()
})