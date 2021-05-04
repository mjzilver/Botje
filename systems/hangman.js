class hangman {
    constructor() {
        this.word = ""
        this.visibleWord = ""
        this.maxTries = 10
        this.tries = 0
        this.alreadyGuessed = []
        this.hasEnded = true
    }

    start(message) {
        if(!this.hasEnded) 
            return message.channel.send("A game of hangman is still ongoing use b!guess to guess!")
        
        let selectSQL = `SELECT message
		FROM messages 
		ORDER BY random()
        LIMIT 1`

        this.word = ""
        this.visibleWord = ""
        this.maxTries = 10
        this.tries = 0
        this.alreadyGuessed = []
        this.hasEnded = false

        database.db.get(selectSQL, [], (err, row) => {
            if (err)
                throw err;
            else {
                this.word = row.message.toLowerCase().textOnly().split(' ').pickRandom();
                for (let i = 0; i < this.word.length; i++) 
                    this.visibleWord += '―'

                message.channel.send('Starting new hangman game. \nUse b!guess to guess')
                this.sendEmbed(message)
            }
        })
    }

    guess(message) {
        if (this.hasEnded) 
            return message.channel.send('This hangman game has ended... \nUse b!hangman to restart')

        var geussedContent = message.cleanContent.toLowerCase().split(' ')[1];

        if (geussedContent) {
            if (geussedContent.length > 1) {
                if (geussedContent == this.word) {
                    message.channel.send(`You guessed the word ${this.word} after ${this.tries} tries -- You have won!`)
                    this.hasEnded = true;
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
                this.hasEnded = true;
            } else if (this.visibleWord == this.word) {
                message.channel.send(`You've won by guessing all the letters!`)
                this.hasEnded = true;
            }

            this.sendEmbed(message)
        } else {
            message.channel.send(`Not a valid guess!`)
        }
    }

    sendEmbed(message) {
        const attachment = new discord.MessageAttachment(`${__dirname}/../hangman/${this.tries}.png`, "hangman.png");

        var showVisibleWord = "";
        for (let i = 0; i < this.visibleWord.length; i++)
            showVisibleWord += this.visibleWord[i].toUpperCase() + " "

        const hangmanEmbed = new discord.MessageEmbed()
            .setColor(config.color_hex)
            .setTitle("Hangman -- " + this.word)
            .setImage("attachment://hangman.png")
            .addField('Word', showVisibleWord, false)

        if (this.alreadyGuessed.length > 0) {
            var alreadyGuessedString = "";
            for (let i = 0; i < this.alreadyGuessed.length; i++)
                alreadyGuessedString += this.alreadyGuessed[i].toUpperCase() + " ";
            hangmanEmbed.addField('Already guessed letters', alreadyGuessedString, false)
        }

        if(this.hasEnded)
            hangmanEmbed.setFooter(`Use b!hangman to start a new game!`)
        else
            hangmanEmbed.setFooter(`${this.tries}/${this.maxTries} tries`)

        message.channel.send({
            files: [attachment],
            embed: hangmanEmbed
        });
    }
}

module.exports = new hangman();