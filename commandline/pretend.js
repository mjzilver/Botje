module.exports = function pretend(input) {
    var channel = bot.bot.channels.cache.get(input[0])

    channel.guild.members.fetch(input[1]).then(
        async (user) => {
                input.splice(0, 2)
                let member = channel.guild.member(user.user)
                var botWebhook

                var webhooks = await channel.fetchWebhooks()
                for (const [id, webhook] of webhooks) {
                    if (webhook.name == package.name) {
                        console.log('Found webhook')
                        botWebhook = webhook
                    }
                }
                if (!botWebhook) {
                    console.log('making new webhook')
                    botWebhook = await channel.createWebhook(package.name)
                }

                botWebhook.send(input.join(' '), {
                    username: member.nickname ? member.nickname : user.user.username,
                    avatarURL: user.user.displayAvatarURL()
                })
            },
            (error) => {})
}