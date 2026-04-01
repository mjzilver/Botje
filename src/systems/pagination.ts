import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { IMessageHandler } from "../interfaces";
import type { BotMessage, MessageContent } from "../interfaces/discord";

type PageObject = Exclude<MessageContent, string | EmbedBuilder>;
type Page = MessageContent;

export class Pagination {
    private messageHandler: IMessageHandler;
    constructor(messageHandler: IMessageHandler) {
        this.messageHandler = messageHandler;
    }

    async sendPaginatedEmbed(message: BotMessage, pages: Page[], timeout = 300000): Promise<BotMessage | undefined> {
        if (!pages || pages.length === 0) throw new Error("Pages array cannot be empty");
        if (pages.length === 1) return this.messageHandler.send(message, pages[0]);
        let currentPage = 0;
        const getButtons = (disabled = false) =>
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("prev")
                    .setLabel("◀ Previous")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(disabled || currentPage === 0),
                new ButtonBuilder()
                    .setCustomId("page_info")
                    .setLabel(`Page ${currentPage + 1}/${pages.length}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId("next")
                    .setLabel("Next ▶")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(disabled || currentPage === pages.length - 1),
            );
        const getPageContent = (index: number): MessageContent => {
            const page = pages[index];
            const base: PageObject =
                typeof page === "string"
                    ? { content: page }
                    : page instanceof EmbedBuilder
                      ? { embeds: [page] }
                      : (page as PageObject);

            return { ...base, components: [getButtons()] };
        };

        const sentMessage = await this.messageHandler.send(message, getPageContent(currentPage));
        if (!sentMessage) return undefined;
        const collector = sentMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: timeout,
        });
        collector.on("collect", async (interaction) => {
            if (interaction.user.id !== message.author.id)
                return interaction.reply({
                    content: "These buttons aren't for you!",
                    ephemeral: true,
                } as MessageContent);
            if (interaction.customId === "prev") currentPage = Math.max(0, currentPage - 1);
            else if (interaction.customId === "next") currentPage = Math.min(pages.length - 1, currentPage + 1);
            await interaction.update(getPageContent(currentPage));
        });
        collector.on("end", () => {
            this.messageHandler
                .edit(sentMessage, {
                    components: [getButtons(true)],
                } as MessageContent)
                .catch(() => {});
        });

        return sentMessage;
    }

    async createPages<T>(
        items: T[],
        itemsPerPage: number,
        formatPage: (items: T[], pageNum: number, totalPages: number) => Promise<Page> | Page,
    ): Promise<Page[]> {
        const totalPages = Math.ceil(items.length / itemsPerPage);
        const pages: Page[] = [];
        for (let i = 0; i < totalPages; i++) {
            const slice = items.slice(i * itemsPerPage, (i + 1) * itemsPerPage);
            pages.push(await formatPage(slice, i + 1, totalPages));
        }

        return pages;
    }
}
