const express = require('express');
const router = express.Router();

const featureFlags = require("../featureFlags");

router.get('/', (req, res) => {
    res.render("index", { flags: featureFlags });
});

module.exports = router;
