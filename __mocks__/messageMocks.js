const createCallMock = (overrides = {}) => ({
    id: "mock-call-id",
    content: "b!test argument",
    author: {
        id: "mock-user-id",
        username: "mock-user",
        bot: false,
        equals: jest.fn((user) => user.id === "mock-user-id")
    },
    channel: {
        name: "mock-channel",
        id: "mock-channel-id",
        send: jest.fn(),
        guild : {
            name: "mock-guild",
            id: "mock-guild-id",
        },
    },
    member: {
        permissions: {
            has: jest.fn(() => true)
        }
    },
    guild: {
        emojis: {
            cache: {
                find: jest.fn()
            }
        }
    },
    reply: jest.fn(),
    createdAt: new Date(),
    delete: jest.fn(),
    ...overrides
})

const createReplyMock = (overrides = {}) => ({
    id: "mock-reply-id",
    react: jest.fn(),
    delete: jest.fn(),
    createdAt: new Date(),
    channel: {
        messages: {
            fetch: jest.fn(() => ({
                then: jest.fn()
            }))
        }
    },
    ...overrides
})

module.exports = {
    createCallMock,
    createReplyMock
}
