import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import type { IMessageHandler } from "./messageHandler";
import type { ILogger } from "./logger";
import { toError } from "./utils";
import type { BotMessage, MessageContent } from "../interfaces/discord";

export interface IPagination {
    createPages<T>(
        items: T[],
        itemsPerPage: number,
        formatPage: (items: T[], pageNum: number, totalPages: number) => Promise<MessageContent> | MessageContent,
    ): Promise<MessageContent[]>;
    sendPaginatedEmbed(message: BotMessage, pages: MessageContent[], timeout?: number): Promise<BotMessage | undefined>;
}

type PageObject = Exclude<MessageContent, string | EmbedBuilder>;
type Page = MessageContent;

export class Pagination {
    private messageHandler: IMessageHandler;
    private logger: Pick<ILogger, "error">;
    constructor(messageHandler: IMessageHandler, logger: Pick<ILogger, "error">) {
        this.messageHandler = messageHandler;
        this.logger = logger;
    }

    async sendPaginatedEmbed(message: BotMessage, pages: Page[], timeout = 300000): Promise<BotMessage | undefined> {
        if (!pages || pages.length === 0) return this.messageHandler.send(message, "No results found.");
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
        collector.on("end", async () => {
            try {
                await this.messageHandler.edit(sentMessage, {
                    components: [getButtons(true)],
                } as MessageContent);
            } catch (err) {
                this.logger.error(toError(err));
            }
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
