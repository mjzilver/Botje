const request = require("request")
const { config } = require("../systems/settings")
const bot = require("../systems/bot.js")
const logger = require("../systems/logger.js")

module.exports = {
    "name": "youtube",
    "description": "searches for a youtube video",
    "format": "youtube [keyword]",
    "function": function youtube(message) {
        const keyword = message.content.replace(/youtube /g, "")

        const options = {
            url: `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=25&q=${keyword}&key=${config.youtube_api_key}`,
            json: true
        }

        logger.debug(`"${message.author.username}" requested youtube video with keyword "${keyword}"`)

        request(options, (err, res, body) => {
            if (err) {
                logger.error(err)
            } else if (!body.items[0]) {
                bot.messageHandler.reply(message, `Nothing found for "${keyword}"`)
            } else {
                const video = body.items[0]
                bot.messageHandler.reply(message, `https://www.youtube.com/watch?v=${video.id.videoId}`)
            }
        })
    }
}