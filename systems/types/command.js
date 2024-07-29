const CommandType = {
    DEFAULT: "default",
    ADMIN: "admin",
    DM: "dm",
    CL: "cl"
}

class Command {
    constructor(bot) {
        this.name = "Default"
        this.description = "No description provided"
        this.type = CommandType.DEFAULT
        this.usage = "No usage provided"
        this.enabled = true
        this.aliases = []

        this.function = (message) => {
            bot.messageHandler.send(message, "No function provided")
        }

        this.bot = bot
    }
}

module.exports = {
    Command,
    CommandType
}