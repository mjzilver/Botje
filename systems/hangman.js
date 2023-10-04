const discord = require("discord.js")
const { config } = require("./settings")
const bot = require("systems/bot.js")
const logger = require("systems/logger.js")

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
            return bot.message.send(message, "A game of hangman is still ongoing")

        this.word = ""
        this.visibleWord = ""
        this.tries = 0
        this.alreadyGuessed = []
        const words = require("json/words.json")

        let chosenword = ""

        while (this.word === "") {
            chosenword = words.pickRandom()
            chosenword[0] = chosenword[0].textOnly()
            chosenword[0] = chosenword[0].replace(bot.dictionary.getNonSelectorsRegex(), "").trim()
            if (chosenword[1] > 10 && chosenword[0].length >= 5 && chosenword[0].length <= 20 && chosenword[0].match(/[a-z]+/i)) {
                this.word = chosenword[0]
            }
        }

        for (let i = 0; i < this.word.length; i++)
            this.visibleWord += "―"

        bot.message.send(message, "Starting new hangman game.")
        logger.debug(`Starting new hangman game the word is ${this.word}`)

        this.hasEnded = false
        this.sendEmbed(message)
    }


    guess(message, geussedContent) {
        if (this.hasEnded)
            return bot.message.send(message, "This hangman game has ended...")

        if (geussedContent) {
            if (geussedContent.length > 1) {
                if (geussedContent === this.word) {
                    bot.message.send(message, `You guessed the word ${this.word} after ${this.tries} tries -- You have won!`)
                    this.hasEnded = true
                } else {
                    bot.message.send(message, `Wrong! The word is not ${geussedContent}`)
                    this.tries++
                }
            } else {
                if (this.alreadyGuessed.includes(geussedContent)) {
                    bot.message.send(message, `${geussedContent} has already been guessed.`)
                } else {
                    if (this.word.includes(geussedContent)) {
                        for (let i = 0; i < this.word.length; i++) {
                            if (this.word[i] === geussedContent) {
                                this.visibleWord = this.visibleWord.replaceAt(i, geussedContent)
                            }
                        }
                    } else {
                        bot.message.send(message, `The word does not contain ${geussedContent}!`)
                        this.alreadyGuessed.push(geussedContent)
                        this.tries++
                    }
                }
            }

            if (this.tries === this.maxTries) {
                bot.message.send(message, `Oh no! You have been hanged! The word was ${this.word}`)
                this.hasEnded = true
            } else if (this.visibleWord === this.word) {
                bot.message.send(message, "You've won by guessing all the letters!")
                this.hasEnded = true
            }

            this.sendEmbed(message)
        } else {
            bot.message.send(message, "Not a valid guess!")
        }
    }

    help(message) {
        if (this.hasEnded) {
            this.start(message)
        } else {
            this.sendEmbed(message)
        }
    }

    sendEmbed(message) {
        const attachment = new discord.MessageAttachment(`${__dirname}/assets/hangman/${this.tries}.png`, "hangman.png")

        let showVisibleWord = ""
        for (let i = 0; i < this.visibleWord.length; i++)
            showVisibleWord += `${this.visibleWord[i].toUpperCase() } `

        const hangmanEmbed = new discord.MessageEmbed()
            .setColor(config.color_hex)
            .setTitle(`Hangman -- ${this.tries}/${this.maxTries} tries`)
            .setImage("attachment://hangman.png")
            .addField("Word", showVisibleWord, false)

        if (this.alreadyGuessed.length > 0) {
            let alreadyGuessedString = ""
            for (let i = 0; i < this.alreadyGuessed.length; i++)
                alreadyGuessedString += `${this.alreadyGuessed[i].toUpperCase() } `
            hangmanEmbed.addField("Already guessed letters", alreadyGuessedString, false)
        }

        if (this.hasEnded)
            hangmanEmbed.setFooter("Use b!hangman start to start a new game!")
        else
            hangmanEmbed.setFooter("Use b!hangman guess to guess")

        bot.message.send(message, {
            files: [attachment],
            embeds: [hangmanEmbed]
        })
    }
}

module.exports = new hangman()