var helpMessage = `:robot: Current commands: :robot:  
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
\`delete \`:deletes the last message from you
\`ping\`: prints the current ping of the bot and the API
\`Current Version\`: ` + global.package.versionname + '-' + global.package.version;

module.exports = function(message) {
    message.author.send(helpMessage)
}