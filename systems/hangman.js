const discord = require("discord.js")

const bot = require("./bot")
const logger = require("./logger")
const { config } = require("./settings")
const { pickRandomItem } = require("./utils")
const { textOnly, replaceAt } = require("./stringHelpers")

class hangman {
    constructor() {
        this.word = ""
        this.visibleWord = ""
        this.maxTries = 10
        this.tries = 0
        this.alreadyGuessed = []
        this.hasEnded = true
    }

    run(message) {
        const args = message.cleanContent.toLowerCase().split(" ")

        switch (args[1]) {
        case "start":
            this.start(message)
            break
        case "guess":
            this.guess(message, args[2])
            break
        case "help":
            this.help(message)
            break
        default:
            this.help(message)
            break
        }
    }

    start(message) {
        if (!this.hasEnded)
            return bot.messageHandler.send(message, "A game of hangman is still ongoing")

        this.word = ""
        this.visibleWord = ""
        this.tries = 0
        this.alreadyGuessed = []
        const words = require("../json/words.json")

        let chosenword = ""

        while (this.word === "") {
            chosenword = pickRandomItem(words)
            chosenword[0] = textOnly(chosenword[0])
            chosenword[0] = chosenword[0].replace(bot.dictionary.getNonSelectorsRegex(), "").trim()
            if (chosenword[1] > 10 && chosenword[0].length >= 5 && chosenword[0].length <= 20 && chosenword[0].match(/[a-z]+/i))
                this.word = chosenword[0]
        }

        for (let i = 0; i < this.word.length; i++)
            this.visibleWord += "―"

        bot.messageHandler.send(message, "Starting new hangman game.")
        logger.debug(`Starting new hangman game the word is ${this.word}`)

        this.hasEnded = false
        this.sendEmbed(message)
    }

    guess(message, geussedContent) {
        if (this.hasEnded)
            return bot.messageHandler.send(message, "This hangman game has ended...")

        let content = ""

        if (geussedContent) {
            if (geussedContent.length > 1) {
                if (geussedContent === this.word) {
                    content = `You guessed the word ${this.word} after ${this.tries} tries -- You have won!`
                    this.hasEnded = true
                } else {
                    content = `Wrong! The word is not ${geussedContent}`
                    this.tries++
                }
            } else
                if (this.alreadyGuessed.includes(geussedContent)) {
                    content = `${geussedContent} has already been guessed.`
                } else
                    if (this.word.includes(geussedContent)) {
                        for (let i = 0; i < this.word.length; i++)
                            if (this.word[i] === geussedContent)
                                this.visibleWord = replaceAt(this.visibleWord, i, geussedContent)

                        content = `Good guess! The word contains ${geussedContent}`
                    } else {
                        content = `The word does not contain ${geussedContent}!`
                        this.alreadyGuessed.push(geussedContent)
                        this.tries++
                    }

            if (this.tries === this.maxTries) {
                content = `Oh no! You have been hanged! The word was ${this.word}`
                this.hasEnded = true
            } else if (this.visibleWord === this.word) {
                content = "You've won by guessing all the letters!"
                this.hasEnded = true
            }

            this.sendEmbed(message, content)
        } else {
            bot.messageHandler.send(message, "Not a valid guess!")
        }
    }

    help(message) {
        if (this.hasEnded)
            this.start(message)
        else
            this.sendEmbed(message)
    }

    sendEmbed(message, content = "") {
        const attachment = new discord.AttachmentBuilder(`${__dirname}/../assets/hangman/${this.tries}.png`, { name: "hangman.png" })

        let showVisibleWord = ""
        for (let i = 0; i < this.visibleWord.length; i++)
            showVisibleWord += `${this.visibleWord[i].toUpperCase() } `

        const hangmanEmbed = new discord.EmbedBuilder()
            .setColor(config.color_hex)
            .setTitle(`Hangman -- ${this.tries}/${this.maxTries} tries`)
            .setDescription(content)
            .setImage("attachment://hangman.png")
            .addFields(
                { name: "Word", value: showVisibleWord, inline: false }
            )

        if (this.alreadyGuessed.length > 0) {
            let alreadyGuessedString = ""
            for (let i = 0; i < this.alreadyGuessed.length; i++)
                alreadyGuessedString += `${this.alreadyGuessed[i].toUpperCase() } `
            hangmanEmbed.addFields(
                { name: "Already guessed letters", value: alreadyGuessedString, inline: false }
            )
        }

        if (this.hasEnded)
            hangmanEmbed.setFooter({ text:"Use b!hangman start to start a new game!" })
        else
            hangmanEmbed.setFooter({ text:"Use b!hangman guess to guess" })

        bot.messageHandler.send(message, {
            files: [attachment],
            embeds: [hangmanEmbed]
        })
    }
}

module.exports = new hangman()