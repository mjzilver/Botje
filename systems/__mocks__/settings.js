/* eslint-disable camelcase */
module.exports = {
    config: {
        positive_emoji: "👍",
        negative_emoji: "👎",
        prefix: "!",
        scan_on_startup: false,
        db: {
            host: "localhost",
            port: 5432,
            user: "test_user",
            password: "test_password",
            database: "test_db"
        }
    }
}