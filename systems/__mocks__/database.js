module.exports = {
    insert: jest.fn(() => Promise.resolve()),
    query: jest.fn(() => Promise.resolve()),
    storeMessage: jest.fn(() => Promise.resolve())
}
