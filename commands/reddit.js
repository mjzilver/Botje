const axios = require("axios")

const bot = require("../systems/bot")
const database = require("../systems/database")
const logger = require("../systems/logger")
const { config } = require("../systems/settings")

const botHeader = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1" // This is required by reddit
}

const axiosInstance = axios.create({
    headers: botHeader,
    maxRedirects: 10
})

module.exports = {
    "name": "reddit",
    "description": "gets a random link from the given subreddit",
    "format": "reddit [subreddit] (top|hot|new) (hour|day|week|month|year|all)",
    "function": getRedditImage
}

async function getRedditImage(message, last = "") {
    const args = message.content.split(" ")
    const sub = args[1]
    let sort = "hot"
    let time = "month"

    if (["top", "hot", "new"].includes(args[2]))
        sort = args[2]
    if (["hour", "day", "week", "month", "year", "all"].includes(args[3]))
        time = args[3]

    const url = `https://www.reddit.com/r/${sub}/${sort}.json?sort=${sort}&t=${time}&limit=100&after=${last}`

    try {
        const response = await axiosInstance.get(url)
        const body = response.data

        if (body?.data?.children)
            handleRedditImages(message, sub, body.data.children)
        else
            bot.messageHandler.send(message, "No images were found")
    } catch (err) {
        logger.error(err)
    }
}

function handleRedditImages(message, sub, children) {
    const selectSQL = "SELECT * FROM images WHERE sub = $1"
    const foundImages = {}

    database.query(selectSQL, [sub], rows => {
        for (let i = 0; i < rows.length; i++)
            foundImages[rows[i].link] = true

        const filteredImages = []

        for (let i = 0; i < children.length; i++)
            if (!(children[i].data.url in foundImages) && children[i].data.url.isLink())
                filteredImages.push(children[i])

        if (filteredImages.length > 0) {
            const chosen = Math.floor(Math.random() * filteredImages.length)
            const post = filteredImages[chosen].data

            // if post is imgur check redirects if it is removed.png
            if (post.url.match(/imgur\.com/gi))
                handleImgur(message, post, sub)
            else
                embedImage(message, post, sub)

            insertPost(post, sub)
        } else {
            if (children.length >= 100) {
                logger.debug(`Finding posts before post ${ children[children.length - 1].data.title}`)
                getRedditImage(message, children[children.length - 1].data.name)
            } else {
                bot.messageHandler.send(message, "I have ran out of images to show you")
            }
        }
    })
}

function embedImage(message, post, sub) {
    if (post.url.isImage()) {
        const image = {
            color: config.color_hex,
            title: post.title,
            fields: [
                { name: "Updoots", value: `${post.score}`, inline: true },
                { name: "Posted by", value: `${post.author}`, inline: true }
            ],
            image: { url: post.url },
            url: `https://reddit.com${post.permalink}`,
            footer: { text: `From: reddit/r/${sub}` }
        }
        bot.messageHandler.send(message, { embeds: [image] })
    } else if (post.url.match(/v\.redd\.it/gi)) {
        handleRedirect(message, post)
    } else if (post.url) {
        bot.messageHandler.send(message, `${post.title} \n${post.url} \n<https://reddit.com${post.permalink}>`)
    }
}

function handleImgur(message, post, sub) {
    axiosInstance.get(post.url)
        .then(res => {
            if (res.request.res.responseUrl.includes("removed.png")) {
                logger.debug("Found removed.png, finding new image")
                getRedditImage(message)
            } else {
                post.url = res.request.res.responseUrl
                embedImage(message, post, sub)
            }
        })
        .catch(err => {
            logger.error(err)
        })
}

function handleRedirect(message, post) {
    axiosInstance.get(post.url)
        .then(async res => {
            const redirectUrl = res.request.res.responseUrl
            logger.console(`Redirected to ${redirectUrl}`)
            let url = decodeURIComponent(redirectUrl)

            if (redirectUrl.includes("over18"))
                url = url.substring(url.indexOf("https://www.reddit.com/over18?dest=") + "https://www.reddit.com/over18?dest=".length)

            try {
                const response = await axiosInstance.get(`${url}.json`)
                const body = response.data

                const videoLink = body?.[0]?.data?.children?.[0]?.data?.secure_media?.reddit_video?.fallback_url
                if (videoLink)
                    bot.messageHandler.send(message, `${post.title} \n${videoLink} \n<https://reddit.com${post.permalink}>`)
                else
                    getRedditImage(message)
            } catch (err) {
                logger.error(err)
            }
        })
        .catch(err => {
            logger.error(err)
        })
}

function insertPost(post, sub) {
    const insertSQL = "INSERT INTO images (link, sub) VALUES ($1, $2) ON CONFLICT (link) DO UPDATE SET sub = EXCLUDED.sub;"
    database.insert(insertSQL, [post.url, sub], () => {
        logger.debug(`inserted: ${post.url} - ${sub}`)
    })
}