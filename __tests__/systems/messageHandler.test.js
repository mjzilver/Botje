jest.mock("../../systems/database")
jest.mock("../../systems/logger")
jest.mock("../../systems/settings")
jest.mock("../../systems/bot")
jest.mock("messageMocks")

const database = require("../../systems/database")
const { config } = require("../../systems/settings")
const bot = require("../../systems/bot")
const logger = require("../../systems/logger")
const { createCallMock, createReplyMock } = require("messageMocks")

const MessageHandler = require("../../systems/messageHandler")

describe("MessageHandler", () => {
    let handler

    beforeEach(() => {
        jest.clearAllMocks()
        handler = new MessageHandler(bot)
    })

    describe("send", () => {
        it("sends a message, reacts, and tracks command", async () => {
            const call = createCallMock()
            const reply = createReplyMock()
            call.channel.send.mockResolvedValue(reply)

            await handler.send(call, "Hello")

            expect(call.channel.send).toHaveBeenCalledWith("Hello")
            expect(reply.react).toHaveBeenCalledWith(config.positive_emoji)
            expect(reply.react).toHaveBeenCalledWith(config.negative_emoji)
        })

        it("does not send if content is empty and completes command", () => {
            const call = createCallMock()

            handler.send(call, "")

            expect(call.channel.send).not.toHaveBeenCalled()
            expect(logger.error).toHaveBeenCalled()
            expect(database.insert).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO command_calls"),
                [call.id, null, call.createdAt.getTime()]
            )
            expect(bot.commandHandler.commandList.remove).toHaveBeenCalledWith(call)
        })
    })

    describe("reply", () => {
        it("replies to a message, reacts, and tracks command", async () => {
            const call = createCallMock()
            const reply = createReplyMock()
            call.reply.mockResolvedValue(reply)

            await handler.reply(call, "Hello back")

            expect(call.reply).toHaveBeenCalledWith("Hello back")
            expect(reply.react).toHaveBeenCalledWith(config.positive_emoji)
            expect(reply.react).toHaveBeenCalledWith(config.negative_emoji)
        })

        it("does not reply if content is empty and completes command", () => {
            const call = createCallMock()

            handler.reply(call, "")

            expect(call.reply).not.toHaveBeenCalled()
            expect(logger.error).toHaveBeenCalled()
            expect(bot.commandHandler.commandList.remove).toHaveBeenCalledWith(call)
        })
    })

    describe("findFromReply", () => {
        it("returns matching call ID from reply", () => {
            handler.commandCalls["call1"] = "reply1"
            const result = handler.findFromReply({ id: "reply1" })
            expect(result).toBe("call1")
        })

        it("returns undefined when reply ID not found", () => {
            handler.commandCalls["call2"] = "reply2"
            const result = handler.findFromReply({ id: "notfound" })
            expect(result).toBeUndefined()
        })
    })

    describe("markComplete", () => {
        it("inserts command call into database and removes from command list", () => {
            const call = createCallMock()
            handler.markComplete(call)

            expect(database.insert).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO command_calls"),
                [call.id, null, call.createdAt.getTime()]
            )
            expect(bot.commandHandler.commandList.remove).toHaveBeenCalledWith(call)
        })
    })

    describe("addCommandCall", () => {
        it("adds command call and inserts into database", () => {
            const call = createCallMock()
            const reply = createReplyMock()
            handler.addCommandCall(call, reply)

            expect(handler.commandCalls[call.id]).toBe(reply.id)
            expect(database.insert).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO command_calls"),
                [call.id, reply.id, reply.createdAt.getTime()]
            )
            expect(bot.commandHandler.commandList.remove).toHaveBeenCalledWith(call)
        })
    })
})
