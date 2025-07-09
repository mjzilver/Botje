module.exports = {
    commands: {
        test: { function: jest.fn() },
        speak: { function: jest.fn() }
    },
    admincommands: {
        admincmd: jest.fn()
    },
    dmcommands: {
        dmtest: { function: jest.fn() }
    }
}