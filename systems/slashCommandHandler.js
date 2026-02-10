const { SlashCommandBuilder } = require("discord.js")
const discord = require("discord.js")

const logger = require("./logger")

module.exports = class SlashCommandRegistry {
    constructor(bot) {
        this.bot = bot
        this.slashCommands = []
    }

    buildSlashCommand(command) {
        if (command.slashCommand)
            return command.slashCommand

        const builder = new SlashCommandBuilder()
            .setName(command.name)
            .setDescription(command.description || "No description available")

        if (command.options && Array.isArray(command.options) && !command.subcommands)
            this.addOptionsToBuilder(builder, command.options)

        if (command.subcommands && Array.isArray(command.subcommands))
            for (const sub of command.subcommands)
                builder.addSubcommand(subcommand => {
                    subcommand
                        .setName(sub.name)
                        .setDescription(sub.description || "No description")

                    if (sub.options && Array.isArray(sub.options))
                        this.addOptionsToBuilder(subcommand, sub.options)

                    return subcommand
                })

        return builder
    }

    addOptionsToBuilder(builder, options) {
        for (const opt of options)
            if (opt.type === "user")
                builder.addUserOption(option => {
                    option
                        .setName(opt.name)
                        .setDescription(opt.description || "No description")
                    if (opt.required) option.setRequired(true)
                    return option
                })
            else if (opt.type === "string")
                builder.addStringOption(option => {
                    option
                        .setName(opt.name)
                        .setDescription(opt.description || "No description")
                    if (opt.required) option.setRequired(true)
                    if (opt.choices)
                        for (const choice of opt.choices)
                            option.addChoices(choice)

                    return option
                })
            else if (opt.type === "integer")
                builder.addIntegerOption(option => {
                    option
                        .setName(opt.name)
                        .setDescription(opt.description || "No description")
                    if (opt.required) option.setRequired(true)
                    return option
                })
            else
                logger.warn(`[SlashCommands] Unsupported option type "${opt.type}" for option "${opt.name}" in command "${builder.name}"`)
    }

    interactionToMessage(interaction, commandName) {
        const pseudoMessage = {
            id: interaction.id,
            content: commandName,
            cleanContent: commandName,
            author: interaction.user,
            channel: interaction.channel,
            guild: interaction.guild,
            mentions: { users: new discord.Collection() },
            createdTimestamp: interaction.createdTimestamp,
            createdAt: new Date(interaction.createdTimestamp),
            attachments: new discord.Collection(),
            embeds: [],
            reply: content => {
                if (typeof content === "object" && content.ephemeral) {
                    const flags = content.flags || 0
                    content.flags = flags | discord.MessageFlags.Ephemeral
                    delete content.ephemeral
                }
                return interaction.reply(content)
            },
            interaction: interaction,
            isSlashCommand: true
        }

        const options = interaction.options
        const args = []

        const subcommand = options.getSubcommand(false)
        if (subcommand)
            args.push(subcommand)

        // Get all options, handling both direct options and subcommand options
        const optionData = subcommand ? options.data[0]?.options || [] : options.data

        for (const option of optionData)
            if (option.type === discord.ApplicationCommandOptionType.User) {
                const user = option.user
                args.push(`<@${user.id}>`)
                pseudoMessage.mentions.users.set(user.id, user)
            } else if (option.type === discord.ApplicationCommandOptionType.String
                       || option.type === discord.ApplicationCommandOptionType.Integer) {
                args.push(option.value)
            } else {
                logger.warn(`[SlashCommands] Unsupported option type "${option.type}" in command "${commandName}"`)
            }

        if (args.length > 0) {
            pseudoMessage.content = `${commandName} ${args.join(" ")}`
            pseudoMessage.cleanContent = pseudoMessage.content
        }

        return pseudoMessage
    }

    async registerCommands(commands) {
        const slashCommands = []
        this.slashCommands = []

        for (const [name, command] of Object.entries(commands)) {
            if (command.aliases?.split(",").includes(name)) continue
            if (!command.function) continue

            try {
                const slashCommand = this.buildSlashCommand(command)
                slashCommands.push(slashCommand.toJSON())
                this.slashCommands.push({ name: command.name, command })
            } catch (err) {
                logger.warn(`[SlashCommands] Failed to build /${name}: ${err.message}`)
            }
        }

        try {
            logger.startup("[SlashCommands] Clearing global commands...")
            await this.bot.client.application.commands.set([])

            const guilds = this.bot.client.guilds.cache
            logger.startup(`[SlashCommands] Registering ${slashCommands.length} slash commands to ${guilds.size} guild(s)...`)

            for (const [guildId, guild] of guilds)
                try {
                    await guild.commands.set(slashCommands)
                    logger.startup(`[SlashCommands] Successfully registered to guild: ${guild.name} (${guildId})`)
                } catch (err) {
                    logger.error(`[SlashCommands] Failed to register to guild ${guildId}: ${err.message}`)
                }
        } catch (err) {
            logger.error(`[SlashCommands] Failed to register commands: ${err.message}`)
        }
    }

    async handleInteraction(interaction) {
        if (!interaction.isChatInputCommand()) return

        const commandDef = this.slashCommands.find(c => c.name === interaction.commandName)

        if (!commandDef)
            return interaction.reply({ content: "Unknown command", ephemeral: true })

        try {
            const pseudoMessage = this.interactionToMessage(interaction, commandDef.command.name)
            await commandDef.command.function(pseudoMessage)
        } catch (err) {
            logger.error(`[SlashCommands] Error executing /${interaction.commandName}: ${err.message}`)

            if (!interaction.replied && !interaction.deferred)
                await interaction.reply({ content: "An error occurred executing this command", ephemeral: true })
        }
    }
}
