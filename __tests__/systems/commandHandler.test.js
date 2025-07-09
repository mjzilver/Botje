jest.mock("../../systems/database")
jest.mock("../../systems/logger")
jest.mock("../../systems/settings")
jest.mock("../../systems/commandLoader")
jest.mock("../../systems/bot")
jest.mock("messageMocks")

const { createCallMock } = require("messageMocks")

const bot = require("../../systems/bot")
const CommandHandler = require("../../systems/commandHandler")
const { config } = require("../../systems/settings")
require("../../systems/stringUtils") // side-effects needed for command handler

describe("CommandHandler", () => {
    let handler

    beforeEach(() => {
        jest.clearAllMocks()
        handler = new CommandHandler(bot)

        handler.commandList.push = jest.fn()
        handler.commands.test = { function: jest.fn() }
        handler.admincommands = { admincommand: jest.fn() }
        handler.isUserBanned = jest.fn(() => false)
    })

    describe("handleCommand", () => {
        it("handles a valid command", () => {
            const call = createCallMock({ content: `${config.prefix}test arg1 arg2` })

            handler.handleCommand(call)

            expect(handler.commandList.push).toHaveBeenCalledWith(call)
            expect(handler.commands.test.function).toHaveBeenCalledWith(call)
        })

        it("ignores commands from bots", () => {
            const call = createCallMock({
                content: `${config.prefix}test`,
                author: { bot: true, equals: jest.fn(() => true) }
            })
            handler.handleCommand(call)

            expect(handler.commandList.push).not.toHaveBeenCalled()
        })

        it("replies with an error for unknown commands", () => {
            const call = createCallMock({ content: `${config.prefix}unknown` })
            handler.handleCommand(call)

            expect(bot.messageHandler.reply).toHaveBeenCalledWith(call, "Unknown is not a command, please try again.")
        })

        it("handles admin commands for admins", () => {
            const call = createCallMock({ content: `${config.prefix}admincommand` })
            handler.handleCommand(call)

            expect(handler.admincommands.admincommand).toHaveBeenCalledWith(call)
        })

        it("denies admin commands for non-admins", () => {
            const call = createCallMock({
                content: `${config.prefix}admincommand`,
                member: { permissions: { has: jest.fn(() => false) } }
            })
            handler.handleCommand(call)

            expect(bot.messageHandler.reply).toHaveBeenCalledWith(call, "Admincommand is an admin command, and you are not allowed to use it.")
        })
    })
})