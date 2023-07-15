let request = require("request")
let discord = require("discord.js")
let config = require("config.json")
let database = require("systems/database.js")
let bot = require("systems/bot.js")
let logger = require("systems/logger.js")

const bot_header = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"  // This is required by reddit
}

const default_options = {
    json: true,
    followAllRedirects: true,
    headers: bot_header
}

module.exports = {
    "name": "reddit",
    "description": "gets a random link from the given subreddit use top|hot|new to sort and the timeframe (only for top)",
    "format": "reddit [subreddit] (top|hot|new) (hour|day|week|month|year|all)",
    "function": getRedditImage
}

async function getRedditImage(message, last = "") {
    const args = message.content.split(" ")
    let sub = args[1]
    let sort = "hot"
    let time = "month"

    if (["top", "hot", "new"].includes(args[2]))
        sort = args[2]
    if (["hour", "day", "week", "month", "year", "all"].includes(args[3]))
        time = args[3]

    const options = {
        url: `https://www.reddit.com/r/${sub}/${sort}.json?sort=${sort}&t=${time}&limit=100&after=${last}`,
        ...default_options
    }

    request(options, (err, res, body) => {
        if (err) {
            return logger.error(err)
        }

        if (typeof (body) !== "undefined" && typeof (body.data) !== "undefined" && typeof (body.data.children) !== "undefined") {
            handleRedditImages(message, sub, body.data.children)
        } else
            bot.message.send(message, "No images were found")
    })
}

function handleRedditImages(message, sub, children) {
    let selectSQL = "SELECT * FROM images WHERE sub = $1"
    let foundImages = {}

    database.query(selectSQL, [sub], (rows) => {
        for (let i = 0; i < rows.length; i++)
            foundImages[rows[i].link] = true

        let filteredImages = []

        for (let i = 0; i < children.length; i++)
            if (!(children[i].data.url in foundImages) && children[i].data.url.isLink())
                filteredImages.push(children[i])

        if (filteredImages.length > 0) {
            let chosen = Math.floor(Math.random() * filteredImages.length)
            let post = filteredImages[chosen].data

            // if post is imgur check redirects if it is removed.png
            if (post.url.match(/imgur\.com/gi)) {
                handleImgur(message, post, sub)
            } else {
                embedImage(message, post, sub)
            }

            insertPost(post, sub)
        } else {
            if (children.length >= 100) {
                logger.debug("Finding posts before post " + children[children.length - 1].data.title)
                getRedditImage(message, children[children.length - 1].data.name)
            } else
                bot.message.send(message, "I have ran out of images to show you")
        }
    })
}

function embedImage(message, post, sub) {
    if (post.url.isImage()) {
        const image = new discord.MessageEmbed()
            .setColor(`${config.color_hex}`)
            .setTitle(`${post.title}`)
            .addField("Updoots", `${post.score}`, true)
            .addField("Posted by", `${post.author}`, true)
            .setImage(`${post.url}`)
            .setURL(`https://reddit.com${post.permalink}`)
            .setFooter(`From: reddit/r/${sub}`)
        bot.message.send(message, { embeds: [image] })
    } else if (post.url.match(/v\.redd\.it/gi)) {
        handleRedirect(message, post)
    } else if (post.url) {
        bot.message.send(message, `${post.title} \n${post.url} \n<https://reddit.com${post.permalink}>`)
    }
}

function handleImgur(message, post, sub) {
    const options = {
        url: post.url,
        ...default_options
    }

    request(options, (err, res) => {
        if (err)
            throw err

        if (res.request.uri.href.includes("removed.png")) {
            logger.debug("Found removed.png, finding new image")
            getRedditImage(message)
        } else {
            post.url = res.request.uri.href
            embedImage(message, post, sub)
        }
    })
}

function handleRedirect(message, post) {
    const options = {
        url: post.url,
        ...default_options
    }

    request(options, (err, res) => {
        if (err)
            throw err

        logger.console(`Redirected to ${res.request.uri.href}`)
        let url = decodeURIComponent(res.request.uri.href)

        if (res.request.uri.href.includes("over18")) {
            url = url.substring(url.indexOf("https://www.reddit.com/over18?dest=") + "https://www.reddit.com/over18?dest=".length)
        } 

        const options = {
            url: url + ".json", 
            ...default_options
        }

        request(options, (err, res, body) => {
            let videolink = body[0].data.children[0].data.secure_media.reddit_video.fallback_url
            bot.message.send(message, `${post.title} \n${videolink} \n<https://reddit.com${post.permalink}>`)
        })
    })
}

function insertPost(post, sub) {
    let insertSQL = "INSERT INTO images (link, sub) VALUES ($1, $2) ON CONFLICT (link) DO UPDATE SET sub = EXCLUDED.sub;"
    database.insert(insertSQL, [post.url, sub], () => {
        logger.debug(`inserted: ${post.url} - ${sub}`)
    })
}