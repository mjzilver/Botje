var helpMessage = `
\`reddit [subreddit]\`: gets a random link from the given subreddit 
\`emoji\`: turns your message into emojis 
\`word [word]\`: shows how many times a word is used in the current channel
\`word [word] ? \`: shows how many times a word is used in the current channel per user
\`word @user [word]\`: shows how many times a word is used in the current channel by the mentioned user
\`score\`: shows the top quality posters in the channel
\`score @user\`: shows the quality of posts in this channel by the mentioned user
\`count\`: counts messages in the current channel
\`count @user\`: counts messages in the current channel from the mentioned user
\`top\`: shows the top 10 messages in the current channel
\`top @user\`: shows the top 10 messages in the current channel from the mentioned user
\`emotes\`: shows the top 10 emotes in the current channel
\`emotes @user\`: shows the top 10 emotes in the current channel from the mentioned user
\`speak \`: makes the bot speak via recycled messages
\`talk \`: makes the bot talk via predictive text 
\`talk @user \`: makes the bot talk as if it is the mentioned user via predictive text
\`delete \`:deletes the last message from you
\`ping\`: prints the current ping of the bot and the API`;

module.exports = function help(message) {
    const help = new discord.MessageEmbed()
        .setColor(config.color_hex)
        .setTitle(`:robot: Current commands: :robot:`)
        .setDescription(helpMessage)
        .setFooter(`Current Version: ${package.versionname} - ${package.version}`)

    message.author.send(help)
}