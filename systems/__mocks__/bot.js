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
        isUserBanned: jest.fn(() => false)
    },
    messageHandler: {
        reply: jest.fn(),
        send: jest.fn(),
    },
    user: {
        id: "mock-bot-id",
        username: "mock-bot",
        bot: true,
    },
}