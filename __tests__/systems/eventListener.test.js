jest.mock("../../systems/logger.js")
jest.mock("../../systems/database.js")
jest.mock("../../systems/bot.js")

const EventEmitter = require("events")

const bot = require("../../systems/bot.js")
const database = require("../../systems/database.js")
const EventListener = require("../../systems/eventListener.js")
const logger = require("../../systems/logger.js")
const { config } = require("../../systems/settings")

describe("EventListener", () => {
    let client

    beforeEach(() => {
        jest.clearAllMocks()
        client = new EventEmitter()
        client.user = { username: "testUser", id: "123456789" }

        bot.client = client
        new EventListener(bot)
    })

    test("handles messageCreate for DM message", () => {
        const message = {
            author: { id: "123" },
            channel: { type: "DM" }
        }

        client.emit("messageCreate", message)

        expect(bot.commandHandler.handleDM).toHaveBeenCalledWith(message)
        expect(database.storeMessage).not.toHaveBeenCalled()
        expect(bot.emoteInjector.handleMessage).not.toHaveBeenCalled()
    })

    test("handles messageCreate for guild message", () => {
        const message = {
            author: { id: "123" },
            channel: { type: "GUILD_TEXT" }
        }

        client.emit("messageCreate", message)

        expect(database.storeMessage).toHaveBeenCalledWith(message)
        expect(bot.commandHandler.handleCommand).toHaveBeenCalledWith(message)
        expect(bot.emoteInjector.handleMessage).toHaveBeenCalledWith(message)
    })

    test("handles shardError", () => {
        const error = new Error("Shard failure")
        client.emit("shardError", error)

        expect(logger.error).toHaveBeenCalledWith("Shard error: Shard failure")
    })

    test("handles error", () => {
        const error = new Error("Client crash")
        client.emit("error", error)

        expect(logger.error).toHaveBeenCalledWith("Client error: Client crash")
    })

    test("handles messageReactionAdd - negative emoji deletes message", () => {
        const deleteMock = jest.fn()
        const message = {
            author: client.user,
            content: "bad post",
            delete: deleteMock,
            reactions: {
                resolve: jest.fn().mockReturnValue({ count: 1 })
            }
        }

        message.author.equals = jest.fn(() => true)

        const reaction = {
            message,
            emoji: { name: config.negative_emoji },
            count: 3
        }

        client.emit("messageReactionAdd", reaction)

        expect(deleteMock).toHaveBeenCalledWith({ timeout: 5000 })
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Post gets deleted"))
    })

    test("handles messageReactionAdd - redo emoji (calls redo)", () => {
        const message = { author: client.user }
        message.author.equals = jest.fn(() => true)

        const reaction = {
            message,
            emoji: { name: config.redo_emoji }
        }

        client.emit("messageReactionAdd", reaction)

        expect(bot.commandHandler.redo).toHaveBeenCalledWith(message)
    })

    test("handles emojiCreate", () => {
        const emoji = { name: "created" }
        client.emit("emojiCreate", emoji)

        expect(bot.backupHandler.saveEmoji).toHaveBeenCalledWith(emoji)
    })

    test("handles emojiDelete", () => {
        const emoji = { name: "deleted" }
        client.emit("emojiDelete", emoji)

        expect(bot.backupHandler.saveEmoji).toHaveBeenCalledWith(emoji, "_deleted")
    })

    test("handles emojiUpdate", () => {
        const oldEmoji = { name: "old" }
        const newEmoji = { name: "new" }

        client.emit("emojiUpdate", oldEmoji, newEmoji)

        expect(bot.backupHandler.saveEmoji).toHaveBeenCalledWith(oldEmoji, "_old")
        expect(bot.backupHandler.saveEmoji).toHaveBeenCalledWith(newEmoji)
    })
})