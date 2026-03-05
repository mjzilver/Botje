const database = require("../../systems/database")
const logger = require("../../systems/logger")

module.exports = {
    name: "index",
    description: "indexes all messages",
    format: "index",
    function: async () => {
        const batchSize = 5000
        let lastId = 0
        let processed = 0

        logger.info("Starting message indexing...")

        while (true) {
            const batch = await database.query(`SELECT id, message
                FROM messages
                WHERE id > $1
                ORDER BY id
                LIMIT $2 `,
            [lastId, batchSize]
            )

            if (batch.length === 0) break

            await database.bulkInsertWords(batch)

            processed += batch.length
            lastId = batch[batch.length - 1].id

            logger.info(`Indexed ${processed} messages`)
        }

        logger.info(`Finished indexing ${processed} messages`)
    }
}