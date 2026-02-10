const discord = require("discord.js")

const bot = require("./bot")
const logger = require("./logger")

/**
 * @param {discord.Message} message - The original message object
 * @param {Array<discord.EmbedBuilder|Object>} pages - Array of embeds or content objects to paginate
 * @param {Number} timeout - Time in milliseconds before buttons expire (default: 5 minutes)
 * @returns {Promise<discord.Message>}
 */
async function newPaginatedEmbed(message, pages, timeout = 300000) {
    if (!pages || pages.length === 0)
        throw new Error("Pages array cannot be empty")

    if (pages.length === 1) {
        const page = pages[0]
        let content

        if (typeof page === "object" && (page.embeds || page.content || page.files))
            content = page

        else
            content = { embeds: Array.isArray(page) ? page : [page] }

        return bot.messageHandler.send(message, content)
    }

    let currentPage = 0

    const getButtons = (disabled = false) => {
        const row = new discord.ActionRowBuilder()
            .addComponents(
                new discord.ButtonBuilder()
                    .setCustomId("prev")
                    .setLabel("◀ Previous")
                    .setStyle(discord.ButtonStyle.Primary)
                    .setDisabled(disabled || currentPage === 0),
                new discord.ButtonBuilder()
                    .setCustomId("page_info")
                    .setLabel(`Page ${currentPage + 1}/${pages.length}`)
                    .setStyle(discord.ButtonStyle.Secondary)
                    .setDisabled(true),
                new discord.ButtonBuilder()
                    .setCustomId("next")
                    .setLabel("Next ▶")
                    .setStyle(discord.ButtonStyle.Primary)
                    .setDisabled(disabled || currentPage === pages.length - 1)
            )
        return row
    }

    const getPageContent = pageIndex => {
        const page = pages[pageIndex]
        if (typeof page === "object" && (page.embeds || page.content || page.files))
            return {
                ...page,
                components: [getButtons()]
            }

        return {
            embeds: Array.isArray(page) ? page : [page],
            components: [getButtons()]
        }
    }
    const sentMessage = await bot.messageHandler.send(message, getPageContent(currentPage))

    const collector = sentMessage.createMessageComponentCollector({
        componentType: discord.ComponentType.Button,
        time: timeout
    })

    collector.on("collect", async interaction => {
        if (interaction.user.id !== message.author.id)
            return interaction.reply({
                content: "These buttons aren't for you!",
                ephemeral: true
            })

        if (interaction.customId === "prev")
            currentPage = Math.max(0, currentPage - 1)
        else if (interaction.customId === "next")
            currentPage = Math.min(pages.length - 1, currentPage + 1)

        await interaction.update(getPageContent(currentPage))
    })

    collector.on("end", () => {
        sentMessage.edit({
            components: [getButtons(true)]
        }).catch(err => logger.debug("Could not disable pagination buttons:", err.message))
    })

    return sentMessage
}

/**
 * @param {Array} items
 * @param {Number} itemsPerPage
 * @param {Function} formatPage
 * @returns {Array}
 */
function createPages(items, itemsPerPage, formatPage) {
    const pages = []
    const totalPages = Math.ceil(items.length / itemsPerPage)

    for (let i = 0; i < totalPages; i++) {
        const start = i * itemsPerPage
        const end = start + itemsPerPage
        const pageItems = items.slice(start, end)
        pages.push(formatPage(pageItems, i + 1, totalPages))
    }

    return pages
}

module.exports = {
    newPaginatedEmbed,
    createPages
}
