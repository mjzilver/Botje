require("./systems/stringUtils")

require("./systems/bot")

if (process.argv.includes("--web"))
    require("./systems/web/web")

require("./systems/commandline")
