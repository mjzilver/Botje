const database = require("systems/database.js")

class MockDatabase extends database {
    constructor() {
        super()
        this.mockData = {}
    }

    // eslint-disable-next-line no-unused-vars
    query(selectSQL, parameters = [], callback) {
        // Implement mock query behavior
        const result = {
            rows: this.mockData[selectSQL] || [],
        }
        callback(result)
    }

    async insert(selectSQL, parameters = [], callback = null) {
        // Implement mock insert behavior
        if (!this.mockData[selectSQL]) {
            this.mockData[selectSQL] = []
        }
        this.mockData[selectSQL].push(parameters)
        if (callback) {
            callback()
        }
    }
}
exports = module.exports = new MockDatabase()