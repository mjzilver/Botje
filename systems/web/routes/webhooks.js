const express = require("express")
const router = express.Router()

const bot = require("systems/bot.js")
const webhook = require("systems/webhook.js")

router.get("/channels/:guildId", (req, res) => {
    const guildId = req.params.guildId

    const channels = Array.from(bot.client.channels.cache.values())
        .filter(channel => channel.type === "GUILD_TEXT" && channel.guild.id === guildId)
        .map(channel => ({ id: channel.id, name: channel.name, guildId: channel.guild.id }))

    res.json(channels.length > 0 ? channels : ["No channels found for this guild"])
})

router.get("/users/:channelId", (req, res) => {
    const channelId = req.params.channelId

    const channel = bot.client.channels.cache.get(channelId)

    if (!channel)
        return res.status(404).send("Channel not found")

    const users = Array.from(channel.members.values())
        .map(member => ({
            userId: member.id,
            username: member.user.username,
            channelId: channelId
        }))

    res.json(users)
})

router.get("/", (req, res) => {
    const guilds = Object.fromEntries(bot.client.guilds.cache)

    res.render("webhooks", {
        "guilds": guilds,
        "channels": [],
        "users": [],
    })
})

router.post("/", function (req) {
    webhook.sendMessage(req.body.channel, req.body.text, req.body.user)
})

module.exports = router
