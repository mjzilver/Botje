module.exports = {
    'name': 'youtube',
    'description': 'searches for a youtube video',
    'format': 'youtube [keyword]',
    'function': function youtube(message) {
        var keyword = message.content.replace(/youtube /g, '')

        const options = {
			url: `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${keyword}&key=${config.youtube_api_key}`,
			json: true
		}

        logger.debug(`"${message.author.username}" requested youtube video with keyword "${keyword}"`)

		request(options, (err, res, body) => {
			if (err) {
				return logger.error(err)
			}

            var video = body.items[0]

            message.reply(`https://www.youtube.com/watch?v=${video.id.videoId}`)
        })
    }
}