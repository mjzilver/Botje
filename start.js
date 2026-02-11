require("./systems/processHandler")

require("./systems/stringUtils")

const axios = require("axios")
axios.defaults.validateStatus = status => status >= 200 && status <= 500;

require("./systems/bot")

require("./systems/commandline")
