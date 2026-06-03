import { PermissionFlagsBits } from "../interfaces/discord";
import type { IMessageHandler, ILogger, ICommand, IBotContext } from "../interfaces";
import type { BotConfig } from "../interfaces/config";
import type { BotMessage } from "../interfaces/discord";
import type { ReplyHandler } from "./replyHandler";
import type { LoadedCommands } from "./commandLoader";
import { LimitedList } from "./types/limitedList";
import { normalizeSpaces, makeStringHelpers, capitalize } from "./stringHelpers";
import { extractTopics, fetchContextMessages } from "./topicExtractor";
import { randomBetween, toError } from "./utils";
import { CooldownTracker } from "./cooldownTracker";

const SPEAK_MIN_TIMEOUT_MINUTES = 20;
const SPEAK_MAX_TIMEOUT_MINUTES = 60;
const SPEAK_RANDOM_CHANCE = 20;

export class CommandHandler {
    private commands: Record<string, ICommand>;
    private admincommands: Record<string, ICommand>;
    private dmcommands: Record<string, ICommand>;
    private messageHandler: IMessageHandler;
    private replyHandler: ReplyHandler;
    private logger: ILogger;
    private config: BotConfig;
    private disallowed: Record<string, boolean>;
    private strHelpers: ReturnType<typeof makeStringHelpers>;
    private getBotUser: () => {
        id: string;
        equals?(other: { id: string }): boolean;
    } | null;

    private context: IBotContext;
    public commandList: LimitedList<BotMessage>;
    private messageCounter = 0;
    private lastMessageSent = new Date();
    private cooldown = new CooldownTracker();
    private prefixRegex: RegExp;
    constructor(deps: {
        commands: LoadedCommands;
        messageHandler: IMessageHandler;
        replyHandler: ReplyHandler;
        logger: ILogger;
        config: BotConfig;
        disallowed: Record<string, boolean>;
        getBotUser: () => {
            id: string;
        } | null;
        context: IBotContext;
    }) {
        this.commands = deps.commands.commands;
        this.admincommands = deps.commands.admincommands;
        this.dmcommands = deps.commands.dmcommands;
        this.messageHandler = deps.messageHandler;
        this.replyHandler = deps.replyHandler;
        this.logger = deps.logger;
        this.config = deps.config;
        this.disallowed = deps.disallowed;
        this.getBotUser = deps.getBotUser;
        this.context = deps.context;
        this.strHelpers = makeStringHelpers(deps.config);
        this.commandList = new LimitedList<BotMessage>(10);
        this.prefixRegex = new RegExp(deps.config.prefix, "i");
    }

    handleCommand(message: BotMessage, isReadback = false): void {
        const botUser = this.getBotUser();
        const isBotMessage = botUser && message.author.id === botUser.id;
        const isCommand = !isBotMessage && message.content.match(this.prefixRegex);
        if (isCommand) {
            const { command, args } = this.parseMessageArguments(message);
            this.logger.debug(
                `'${message.author.username}' issued '${command}'` +
                    (args.length >= 1 ? ` with arguments '${args}'` : "") +
                    ` in channel '${message.channel.name ?? message.channel.id}'` +
                    (isReadback ? " is a readback command" : ""),
            );
            if (!isReadback) this.commandList.push(message);
            const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator) ?? false;
            if (isAdmin || isReadback || this.isUserAllowed(message, true))
                this.handleCommandType(command, isReadback, message, isAdmin);
        } else if (!message.author.bot) {
            this.handleNonCommandMessage(message);
        }
    }

    parseMessageArguments(message: BotMessage): {
        command: string;
        args: string[];
    } {
        const args = normalizeSpaces(this.strHelpers.removePrefix(message.content)).split(" ");
        const command = (args.shift() ?? "").toLowerCase();

        return { command, args };
    }

    private async runCommand(fn: () => unknown, message: BotMessage): Promise<void> {
        try {
            await fn();
        } catch (err) {
            this.logger.error(toError(err));
            this.messageHandler.reply(message, "Something went wrong while running that command.");
        }
    }

    private handleCommandType(command: string, readback: boolean, message: BotMessage, isAdmin: boolean): void {
        if (command in this.commands)
            void this.runCommand(() => this.commands[command].function(message, this.context), message);
        else if (command in this.admincommands) this.handleAdminCommand(command, message, isAdmin);
        else if (!readback)
            this.messageHandler.reply(message, `${capitalize(command)} is not a command, please try again.`);
        else this.messageHandler.markComplete(message);
    }

    private handleAdminCommand(command: string, message: BotMessage, isAdmin: boolean): void {
        const isOwner = message.author.id === this.config.owner;
        if (isOwner || isAdmin)
            void this.runCommand(() => this.admincommands[command].function(message, this.context), message);
        else
            this.messageHandler.reply(
                message,
                `${capitalize(command)} is an admin command, and you are not allowed to use it.`,
            );
    }

    handleNonCommandMessage(message: BotMessage): void {
        if (!this.replyHandler.process(message)) {
            const now = new Date();
            const timePassed = (now.getTime() - this.lastMessageSent.getTime()) / 60000;
            if (this.shouldSpeakSpontaneously(timePassed)) {
                void this.speakOnContext(message);
                this.lastMessageSent = now;
                this.messageCounter = 0;
            } else {
                this.maybeSpeakOnMention(message);
            }
        }

        this.messageCounter++;
    }

    private shouldSpeakSpontaneously(timePassed: number): boolean {
        const speakThreshold =
            this.messageCounter >= this.config.speakEvery || randomBetween(1, SPEAK_RANDOM_CHANCE) === 1;
        const timeGate = timePassed >= randomBetween(SPEAK_MIN_TIMEOUT_MINUTES, SPEAK_MAX_TIMEOUT_MINUTES);

        return speakThreshold && timeGate;
    }

    private async speakOnContext(message: BotMessage): Promise<void> {
        let recent: BotMessage[] = [];

        try {
            recent = await fetchContextMessages(message.channel);
        } catch (err) {
            this.logger.error(toError(err));
        }

        try {
            const topics = await extractTopics(
                recent,
                this.context.database,
                this.context.dictionary,
                this.config.prefix,
            );
            const syntheticContent = topics[0]
                ? `${this.config.prefix}speak ${topics[0]}`
                : `${this.config.prefix}speak`;
            const topicMessage = {
                ...message,
                content: syntheticContent,
                createdAt: message.createdAt,
                createdTimestamp: message.createdTimestamp,
            };
            await this.runCommand(() => this.commands["speak"]?.function(topicMessage, this.context), topicMessage);
        } catch (err) {
            this.logger.error(toError(err));
        }
    }

    private maybeSpeakOnMention(message: BotMessage): void {
        if (!message.content.match(/\bbot(je)?\b/gi)) return;
        const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator) ?? false;
        if (isAdmin || this.isUserAllowed(message, false))
            void this.runCommand(() => this.commands["speak"]?.function(message, this.context), message);
    }

    async redo(message: BotMessage, fetchMessage: (id: string) => Promise<BotMessage>): Promise<void> {
        const callId = this.messageHandler.findFromReply(message);
        if (!callId) return;
        try {
            const callMessage = await fetchMessage(callId);
            const { command } = this.parseMessageArguments(callMessage);
            this.logger.debug(`Redoing '${callMessage.author.username}' command '${command}'`);
            if (command in this.commands) {
                await this.runCommand(() => this.commands[command].function(callMessage, this.context), callMessage);
                this.messageHandler.delete(message);
            }
        } catch (err) {
            this.logger.error(toError(err));
        }
    }

    isUserBanned(message: BotMessage): boolean {
        return message.author.id in this.disallowed;
    }

    isUserAllowed(message: BotMessage, canSendMessage = false): boolean {
        if (this.isUserBanned(message)) return false;
        const timeoutMs = this.config.timeoutDuration * 1000;
        if (this.cooldown.isAllowed(message.author.id, timeoutMs)) return true;
        if (canSendMessage) {
            const remaining = Math.ceil(this.cooldown.remainingMs(message.author.id, timeoutMs) / 1000);
            this.messageHandler.send(
                message,
                `Please wait ${remaining} second${remaining > 1 ? "s" : ""} before making another request.`,
            );
        }

        return false;
    }

    handleDM(message: BotMessage): void {
        if (message.author.bot) return;
        const { command } = this.parseMessageArguments(message);
        if (command in this.dmcommands)
            void this.runCommand(() => this.dmcommands[command].function(message, this.context), message);
        else if (message.content.match(this.prefixRegex))
            this.messageHandler.reply(message, `Use the command ${this.config.prefix}help for more information`);
    }
}
