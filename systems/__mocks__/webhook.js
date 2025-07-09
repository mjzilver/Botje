module.exports = {
    fetch: jest.fn().mockResolvedValue({
        send: jest.fn()
    }),

    sendMessage: jest.fn()
}
