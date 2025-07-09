module.exports = {
    client: {
        channels: {
            cache: {
                filter: jest.fn(() => []),
                get: jest.fn(),
                has: jest.fn()
            }
        }
    },
    commandHandler: {
        commandList: {
            remove: jest.fn()
        },
        handleCommand: jest.fn(),
        handleDM: jest.fn(),
        isUserBanned: jest.fn(() => false),
        redo: jest.fn(),
    },
    emoteInjector: {
        handleMessage: jest.fn(),
    },
    messageHandler: {
        reply: jest.fn(),
        send: jest.fn(),
    },
    backupHandler: {
        saveEmoji: jest.fn(),
    },
    user: {
        id: "mock-bot-id",
        username: "mock-bot",
        bot: true,
    },
    disallowed: {}
}