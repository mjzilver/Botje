jest.mock("../../systems/database")
jest.mock("../../systems/logger")
jest.mock("../../systems/settings")
jest.mock("../../systems/bot")
jest.mock("../../systems/webhook")
jest.mock("messageMocks")
jest.mock("guildMocks")
jest.mock("emojiMocks")

const bot = require("../../systems/bot")
const webhook = require("../../systems/webhook")
const { createCallMock } = require("messageMocks")
const { createGuildMock } = require("guildMocks")
const { createEmojiMock } = require("emojiMocks")

const EmoteInjector = require("../../systems/emoteInjector")

const mockGuildCache = (...guilds) => {
    bot.client.guilds = {
        cache: new Map(guilds.map(g => [g.id, g]))
    }
}

describe("EmoteInjector", () => {
    let injector

    beforeEach(() => {
        jest.clearAllMocks()
        injector = new EmoteInjector(bot)
    })

    test("does nothing if message is from a bot", () => {
        const message = createCallMock()
        message.author.bot = true

        injector.handleMessage(message)

        expect(webhook.sendMessage).not.toHaveBeenCalled()
        expect(message.delete).not.toHaveBeenCalled()
    })

    test("does nothing if there are no emote patterns", () => {
        const message = createCallMock({ content: "Hello world" })

        injector.handleMessage(message)

        expect(webhook.sendMessage).not.toHaveBeenCalled()
        expect(message.delete).not.toHaveBeenCalled()
    })

    test("skips valid emojis already in the same guild", () => {
        const message = createCallMock({ content: "Hello world :smile:" })
        message.guild.emojis.cache.find = jest.fn(() => createEmojiMock({ name: "smile", id: "1" }))

        injector.handleMessage(message)

        expect(webhook.sendMessage).not.toHaveBeenCalled()
        expect(message.delete).not.toHaveBeenCalled()
    })

    test("replaces missing emoji with one found in another guild", () => {
        const emoji = createEmojiMock({ name: "smile", id: "emoji789" })

        const message = createCallMock({ content: "I love :smile:" })
        message.guild.emojis.cache.find = jest.fn(() => undefined)

        const otherGuild = createGuildMock({
            id: "other123",
            emojis: {
                cache: {
                    find: jest.fn(fn => fn(emoji) ? emoji : undefined)
                }
            }
        })

        mockGuildCache(message.guild, otherGuild)

        injector.handleMessage(message)

        expect(webhook.sendMessage).toHaveBeenCalledWith(
            message.channel.id,
            "I love <:smile:emoji789>",
            message.author.id,
            expect.any(Object)
        )
        expect(message.delete).toHaveBeenCalled()
    })

    test("handles multiple missing emojis correctly", () => {
        const emojiA = createEmojiMock({ name: "a", id: "id1" })
        const emojiB = createEmojiMock({ name: "b", id: "id2" })

        const message = createCallMock({ content: "hello :a: and :b:" })
        message.guild.emojis.cache.find = jest.fn(() => undefined)

        const otherGuild = createGuildMock({
            id: "guild2",
            emojis: {
                cache: {
                    find: jest.fn(fn => {
                        if (fn(emojiA)) return emojiA
                        if (fn(emojiB)) return emojiB
                        return undefined
                    })
                }
            }
        })

        mockGuildCache(message.guild, otherGuild)

        injector.handleMessage(message)

        expect(webhook.sendMessage).toHaveBeenCalledWith(
            message.channel.id,
            "hello <:a:id1> and <:b:id2>",
            message.author.id,
            expect.any(Object)
        )
        expect(message.delete).toHaveBeenCalled()
    })

    test("ignores emoji syntax that's already proper (e.g., <:name:id>)", () => {
        const message = createCallMock({ content: "proper <:smile:12345> and :missing:" })
        const existingEmoji = createEmojiMock({ name: "smile", id: "12345" })

        message.guild.emojis.cache.find = jest.fn(fn =>
            fn(existingEmoji) ? existingEmoji : undefined
        )

        const emoji = createEmojiMock({ name: "missing", id: "999" })

        const otherGuild = createGuildMock({
            id: "guild2",
            emojis: {
                cache: {
                    find: jest.fn(fn => fn(emoji) ? emoji : undefined)
                }
            }
        })

        mockGuildCache(message.guild, otherGuild)

        injector.handleMessage(message)

        expect(webhook.sendMessage).toHaveBeenCalledWith(
            message.channel.id,
            "proper <:smile:12345> and <:missing:999>",
            message.author.id,
            expect.any(Object)
        )
        expect(message.delete).toHaveBeenCalled()
    })

    test("does not send if no replacements found", () => {
        const message = createCallMock({ content: "unknown :ghost:" })
        message.guild.emojis.cache.find = jest.fn(() => undefined)

        const otherGuild = createGuildMock({
            id: "guild2",
            emojis: {
                cache: {
                    find: () => undefined
                }
            }
        })

        mockGuildCache(message.guild, otherGuild)

        injector.handleMessage(message)

        expect(webhook.sendMessage).not.toHaveBeenCalled()
        expect(message.delete).not.toHaveBeenCalled()
    })

    test("handles duplicate emoji names only once", () => {
        const emoji = createEmojiMock({ name: "cat", id: "id3" })

        const message = createCallMock({ content: ":cat: :cat:" })
        message.guild.emojis.cache.find = jest.fn(() => undefined)

        const otherGuild = createGuildMock({
            id: "guild2",
            emojis: {
                cache: {
                    find: jest.fn(fn => fn(emoji) ? emoji : undefined)
                }
            }
        })

        mockGuildCache(message.guild, otherGuild)

        injector.handleMessage(message)

        expect(webhook.sendMessage).toHaveBeenCalledWith(
            message.channel.id,
            "<:cat:id3> <:cat:id3>",
            message.author.id,
            bot
        )
        expect(message.delete).toHaveBeenCalled()
    })

    test("ignores correctly formatted external Nitro emoji", () => {
        const message = createCallMock({ content: "Hello <:smile:123456789012345678> world!" })
        message.guild.emojis.cache.find = jest.fn(() => undefined)

        const otherGuild = createGuildMock({
            id: "guild2",
            emojis: {
                cache: {
                    find: () => undefined
                }
            }
        })

        mockGuildCache(message.guild, otherGuild)

        injector.handleMessage(message)

        expect(webhook.sendMessage).not.toHaveBeenCalled()
        expect(message.delete).not.toHaveBeenCalled()
    })
})
