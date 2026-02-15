const database = require("./database")

module.exports = class UserHandler {
    constructor(bot) {
        this.bot = bot

        // per-server user cache: { serverId: { userId: displayName } }
        this.userCache = {}
    }

    async getDisplayName(userId, serverId) {
        if (!userId || !serverId) return "Unknown User"

        if (!this.userCache[serverId]) this.userCache[serverId] = {}

        const serverCache = this.userCache[serverId]

        if (serverCache[userId]) return serverCache[userId]

        let displayName = await database.getCurrentUsername(userId, serverId)
        if (displayName) {
            serverCache[userId] = displayName
            return displayName
        }

        try {
            const guild = await this.bot.client.guilds.fetch(serverId)
            const member = await guild.members.fetch(userId)
            displayName = member.displayName
            await database.ensureUserExists(member.user, serverId, displayName)
        } catch {
            try {
                const user = await this.bot.client.users.fetch(userId)
                displayName = user.username
                await database.ensureUserExists(user, serverId, displayName)
            } catch {
                displayName = "Unknown User"
            }
        }

        serverCache[userId] = displayName
        return displayName
    }
}
