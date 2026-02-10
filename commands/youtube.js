const axios = require("axios")

const bot = require("../systems/bot.js")
const logger = require("../systems/logger.js")
const { config } = require("../systems/settings")

module.exports = {
    "name": "youtube",
    "description": "searches for a youtube video",
    "format": "youtube [keyword]",
    "options": [
        { type: "string", name: "keyword", description: "Search term", required: true }
    ],
    "function": async function youtube(message) {
        const keyword = message.content.replace(/youtube /g, "")

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=25&q=${keyword}&key=${config.youtube_api_key}`

        logger.debug(`"${message.author.username}" requested youtube video with keyword "${keyword}"`)

        try {
            const response = await axios.get(url)
            const body = response.data

            if (!body.items[0]) {
                bot.messageHandler.reply(message, `Nothing found for "${keyword}"`)
            } else {
                const video = body.items[0]
                bot.messageHandler.reply(message, `https://www.youtube.com/watch?v=${video.id.videoId}`)
            }
        } catch (err) {
            logger.error(err)
        }
    }
}