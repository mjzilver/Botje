const emojiValues = require("json/emoji.json")
const bot = require("systems/bot.js")

module.exports = {
    "name": "emoji",
    "description": "turns your message into emojis",
    "format": "emoji [string]",
    "function": function emoji(message) {
        if (message.type === "REPLY") {
            message.channel.messages.fetch(message.reference.messageId)
                .then(replyMessage => {
                    let sentence = message.content.split(" ").slice(1)
                    sentence = sentence.join(" ")
                    sentence = sentence.toLowerCase()

                    for (let i = 0; i < sentence.length; i++)
                        if (sentence.charAt(i) >= "a" && sentence.charAt(i) <= "z")
                            replyMessage.react(emojiValues[`letter_${ sentence.charAt(i)}`])

                    message.delete({
                        timeout: 1000
                    })
                })
        } else {
            let sentence = message.content.split(" ").slice(1)

            sentence = sentence.join(" ")
            sentence = sentence.toLowerCase()
            let result = ""
            if (sentence.length > 0)
                for (let i = 0; i < sentence.length; i++) {
                    if (sentence.charAt(i) >= "a" && sentence.charAt(i) <= "z")
                        result += emojiValues[`letter_${ sentence.charAt(i)}`]
                    result += " "
                }

            bot.messageHandler.send(message, result)
        }
    }
}