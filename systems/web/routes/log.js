const express = require('express');
const router = express.Router();

const logger = require("systems/logger.js")

router.get('/', (req, res) => {
    const options = {
        limit: 10000,
        order: "desc",
        from: new Date(0),
        until: new Date,
    }

    logger.query(options, async function(err, results) {
        if (err)
            logger.warn(`Error in query${ err}`)

        let logs = []
        if (req.query.level) {
            for (let i = 0; i < results.file.length; i++)
                if (results.file[i].level === req.query.level)
                    logs.push(results.file[i])
        } else
            logs = results.file

        res.render("log", {
            list: logs
        })
    })
});

module.exports = router;
