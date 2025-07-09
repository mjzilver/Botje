const createGuildMock = (overrides = {}) => ({
    id: "mock-guild-id",
    name: "mock-guild",
    emojis: {
        cache: {
            find: jest.fn(() => undefined)
        }
    },
    ...overrides
})

module.exports = {
    createGuildMock
}
