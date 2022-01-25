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
        var args = message.cleanContent.toLowerCase().split(' ')

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
            return message.channel.send("A game of hangman is still ongoing use b!guess to guess!")

        let selectSQL = `SELECT message
        FROM messages 
        WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%"
        ORDER BY random()
        LIMIT 1`

        this.word = ""
        this.visibleWord = ""
        this.tries = 0
        this.alreadyGuessed = []

        database.db.get(selectSQL, [], (err, row) => {
            if (err)
                throw err
            else {
                this.word = row.message.toLowerCase().textOnly().split(' ').pickRandom()
                for (let i = 0; i < this.word.length; i++)
                    this.visibleWord += '―'

                if (this.word.length > 2 && this.word.length <= 12) { 
                    message.channel.send('Starting new hangman game.')
                    logger.debug( `Starting new hangman game the word is ${this.word}`)

                    this.hasEnded = false
                    this.sendEmbed(message)
                } else {
                    this.start(message)
                }
            }
        })
    }

    guess(message, geussedContent) {
        if (this.hasEnded)
            return message.channel.send('This hangman game has ended...')

        if (geussedContent) {
            if (geussedContent.length > 1) {
                if (geussedContent == this.word) {
                    message.channel.send(`You guessed the word ${this.word} after ${this.tries} tries -- You have won!`)
                    this.hasEnded = true
                } else {
                    message.channel.send(`Wrong! The word is not ${geussedContent}`)
                    this.tries++
                }
            } else {
                if (this.alreadyGuessed.includes(geussedContent)) {
                    message.channel.send(`${geussedContent} has already been guessed.`)
                } else {
                    if (this.word.includes(geussedContent)) {
                        for (let i = 0; i < this.word.length; i++) {
                            if (this.word[i] == geussedContent) {
                                this.visibleWord = this.visibleWord.replaceAt(i, geussedContent)
                            }
                        }
                    } else {
                        message.channel.send(`The word does not contain ${geussedContent}!`)
                        this.alreadyGuessed.push(geussedContent)
                        this.tries++
                    }
                }
            }

            if (this.tries == this.maxTries) {
                message.channel.send(`Oh no! You have been hanged! The word was ${this.word}`)
                this.hasEnded = true
            } else if (this.visibleWord == this.word) {
                message.channel.send(`You've won by guessing all the letters!`)
                this.hasEnded = true
            }

            this.sendEmbed(message)
        } else {
            message.channel.send(`Not a valid guess!`)
        }
    }

    help(message) {
        message.channel.send(`Use \`b!hangman start\` to start a round \nUse \`b!hangman guess [letter]\` to guess`)
    }

    sendEmbed(message) {
        const attachment = new discord.MessageAttachment(`${__dirname}/../hangman/${this.tries}.png`, "hangman.png")

        var showVisibleWord = ""
        for (let i = 0; i < this.visibleWord.length; i++)
            showVisibleWord += this.visibleWord[i].toUpperCase() + " "

        const hangmanEmbed = new discord.MessageEmbed()
            .setColor(config.color_hex)
            .setTitle(`Hangman -- ${this.tries}/${this.maxTries} tries`)
            .setImage("attachment://hangman.png")
            .addField('Word', showVisibleWord, false)

        if (this.alreadyGuessed.length > 0) {
            var alreadyGuessedString = ""
            for (let i = 0; i < this.alreadyGuessed.length; i++)
                alreadyGuessedString += this.alreadyGuessed[i].toUpperCase() + " "
            hangmanEmbed.addField('Already guessed letters', alreadyGuessedString, false)
        }

        if (this.hasEnded)
            hangmanEmbed.setFooter(`Use b!hangman start to start a new game!`)
        else
            hangmanEmbed.setFooter(` Use b!hangman guess to guess`)

        message.channel.send({
            files: [attachment],
            embeds: [hangmanEmbed]
        })
    }
}

module.exports = new hangman()