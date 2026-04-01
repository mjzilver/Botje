import * as discord from "discord.js";
import { toError } from "./utils";
import {
    SlashCommandBuilder,
    SlashCommandUserOption,
    SlashCommandStringOption,
    SlashCommandIntegerOption,
    ApplicationCommandOptionType,
    Collection,
} from "discord.js";
import type { ICommand, ILogger, CommandOption, IBotContext } from "../interfaces";
import type { BotMessage, BotUser, BotReaction, MessageContent, ComponentCollector } from "../interfaces/discord";
import { toBotChannel } from "./messageAdapter";

export class SlashHandler {
    private logger: ILogger;
    private client: discord.Client;
    private slashCommands: Array<{ name: string; command: ICommand }> = [];
    private context: IBotContext;
    constructor(logger: ILogger, client: discord.Client, context: IBotContext) {
        this.logger = logger;
        this.client = client;
        this.context = context;
    }

    buildSlashCommand(command: ICommand): SlashCommandBuilder {
        if (command.slashCommand) return command.slashCommand;
        const builder = new SlashCommandBuilder()
            .setName(command.name)
            .setDescription(command.description || "No description available");
        if (command.options && !command.subcommands) this.addOptionsToBuilder(builder, command.options);
        if (command.subcommands)
            for (const sub of command.subcommands)
                builder.addSubcommand((subcommand) => {
                    subcommand.setName(sub.name).setDescription(sub.description ?? "No description");
                    if (sub.options) this.addOptionsToBuilder(subcommand, sub.options);

                    return subcommand;
                });

        return builder;
    }

    private addOptionsToBuilder(
        builder: {
            addUserOption(fn: (o: SlashCommandUserOption) => SlashCommandUserOption): void;
            addStringOption(fn: (o: SlashCommandStringOption) => SlashCommandStringOption): void;
            addIntegerOption(fn: (o: SlashCommandIntegerOption) => SlashCommandIntegerOption): void;
        },
        options: CommandOption[],
    ): void {
        for (const opt of options) {
            if (opt.type === "user")
                builder.addUserOption((o) => {
                    o.setName(opt.name).setDescription(opt.description ?? "No description");
                    if (opt.required) o.setRequired(true);

                    return o;
                });
            else if (opt.type === "string")
                builder.addStringOption((o) => {
                    o.setName(opt.name).setDescription(opt.description ?? "No description");
                    if (opt.required) o.setRequired(true);
                    if (opt.choices) for (const c of opt.choices) o.addChoices(c);

                    return o;
                });
            else if (opt.type === "integer")
                builder.addIntegerOption((o) => {
                    o.setName(opt.name).setDescription(opt.description ?? "No description");
                    if (opt.required) o.setRequired(true);

                    return o;
                });
            else this.logger.warn(`[SlashCommands] Unsupported option type "${opt.type}" for "${opt.name}"`);
        }
    }

    interactionToMessage(interaction: discord.ChatInputCommandInteraction, commandName: string): BotMessage {
        const args: string[] = [];
        const subcommand = interaction.options.getSubcommand(false);
        if (subcommand) args.push(subcommand);
        const optionData = subcommand ? (interaction.options.data[0]?.options ?? []) : interaction.options.data;
        const mentionMap = new Map<string, BotUser>();
        for (const option of optionData) {
            if (option.type === ApplicationCommandOptionType.User && option.user) {
                args.push(`<@${option.user.id}>`);
                mentionMap.set(option.user.id, option.user as BotUser);
            } else if (
                option.type === ApplicationCommandOptionType.String ||
                option.type === ApplicationCommandOptionType.Integer
            ) {
                args.push(String(option.value));
            }
        }

        const fullContent = args.length > 0 ? `${commandName} ${args.join(" ")}` : commandName;
        const pseudoMessage: BotMessage = {
            id: interaction.id,
            content: fullContent,
            cleanContent: fullContent,
            author: interaction.user as BotUser,
            channel: toBotChannel(interaction.channel),
            guild: interaction.guild as BotMessage["guild"],
            member: null,
            mentions: {
                users: new Collection<string, BotUser>(mentionMap) as Map<string, BotUser> & {
                    first(): BotUser | undefined;
                },
            },
            createdTimestamp: interaction.createdTimestamp,
            createdAt: new Date(interaction.createdTimestamp),
            reactions: { cache: new Map<string, BotReaction>(), resolve: () => null },
            reference: null,
            isSlashCommand: true,
            slashInteraction: interaction,
            reply: (_content: MessageContent) => Promise.resolve(pseudoMessage),
            react: (_emoji: string) => Promise.resolve(),
            edit: (_content: MessageContent) => Promise.resolve(pseudoMessage),
            delete: () => Promise.resolve(),
            createMessageComponentCollector: (_options: {
                componentType: number;
                time: number;
            }): ComponentCollector => ({ on: () => {} }),
        };

        return pseudoMessage;
    }

    async handleInteraction(interaction: discord.ChatInputCommandInteraction): Promise<void> {
        const commandName = interaction.commandName;
        const found = this.slashCommands.find((sc) => sc.name === commandName);
        if (!found) return;
        try {
            await interaction.deferReply();
        } catch {}

        const pseudoMessage = this.interactionToMessage(interaction, commandName);
        found.command.function(pseudoMessage, this.context);
    }

    async registerCommands(commands: Record<string, ICommand>): Promise<void> {
        const builders: ReturnType<SlashCommandBuilder["toJSON"]>[] = [];
        this.slashCommands = [];
        for (const [name, command] of Object.entries(commands)) {
            if (
                command.aliases
                    ?.split(",")
                    .map((a) => a.trim())
                    .includes(name)
            )
                continue;
            if (!command.function) continue;
            try {
                const builder = this.buildSlashCommand(command);
                builders.push(builder.toJSON());
                this.slashCommands.push({ name: command.name, command });
            } catch (err) {
                this.logger.warn(`[SlashCommands] Failed to build /${name}: ${toError(err).message}`);
            }
        }
        try {
            this.logger.startup("[SlashCommands] Clearing global commands...");
            await this.client.application?.commands.set([]);
            for (const [, guild] of this.client.guilds.cache) {
                try {
                    await guild.commands.set(builders);
                    this.logger.startup(`[SlashCommands] Registered to guild: ${guild.name}`);
                } catch (err) {
                    this.logger.warn(`[SlashCommands] Failed for guild ${guild.name}: ${toError(err).message}`);
                }
            }
        } catch (err) {
            this.logger.error(`[SlashCommands] Registration failed: ${toError(err).message}`);
        }
    }
}
