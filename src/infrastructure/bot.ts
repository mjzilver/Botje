import fs from "fs";
import path from "path";
import * as discord from "discord.js";
import type { BotConfig } from "../interfaces/config";
import type { ILogger } from "../interfaces";
import { toBotMessage } from "../adapters/messageAdapter";
import { setBotContext } from "./botContext";
import { SystemRegistry } from "./systemRegistry";
import { Settings } from "./settings";
import { toError, ONE_DAY_MS } from "../utils";

const DISALLOWED_PATH = path.resolve(__dirname, "../json/disallowed.json");

export class Bot {
    readonly client: discord.Client;
    registry!: SystemRegistry;
    private readonly config: BotConfig;
    private readonly settings: Settings;
    private readonly logger: ILogger;
    private readonly version: string;
    constructor(settings: Settings, logger: ILogger, version = "3.0.0") {
        this.settings = settings;
        this.config = settings.config;
        this.logger = logger;
        this.version = version;
        this.client = new discord.Client({
            intents: [
                discord.GatewayIntentBits.DirectMessages,
                discord.GatewayIntentBits.DirectMessageTyping,
                discord.GatewayIntentBits.Guilds,
                discord.GatewayIntentBits.GuildMembers,
                discord.GatewayIntentBits.GuildModeration,
                discord.GatewayIntentBits.GuildExpressions,
                discord.GatewayIntentBits.GuildIntegrations,
                discord.GatewayIntentBits.GuildWebhooks,
                discord.GatewayIntentBits.GuildInvites,
                discord.GatewayIntentBits.GuildVoiceStates,
                discord.GatewayIntentBits.GuildPresences,
                discord.GatewayIntentBits.GuildMessages,
                discord.GatewayIntentBits.GuildMessageReactions,
                discord.GatewayIntentBits.GuildMessageTyping,
                discord.GatewayIntentBits.MessageContent,
            ],
            partials: [discord.Partials.Channel],
        });
        this.client.once("clientReady", async () => {
            await this.loadSystems();
            this.client.user?.setPresence({
                activities: [{ name: `Version ${this.version}` }],
            });
            logger.startup(`Logged in as: ${this.client.user?.username} - ${this.version} - ${this.client.user?.id}`);
        });
        this.login();
        setInterval(() => this.login(), 5 * 60 * 1000);
    }

    login(): void {
        if (!this.client.isReady()) {
            this.logger.startup("Attempting to log in");
            const isBeta = process.argv.includes("--beta");
            const key = isBeta ? this.config.discord_api_key_beta : this.config.discord_api_key;
            if (isBeta) this.logger.startup("Logging in with beta key");
            this.client.login(key);
        }
    }

    private async loadSystems(): Promise<void> {
        const disallowed = this.loadDisallowed();
        const registry = new SystemRegistry(this.settings, this.logger, this.client);
        await registry.initialize(disallowed);
        this.registry = registry;
        setBotContext(this.registry);
        if (this.config.scan_on_startup === true || this.config.scan_on_startup === "1") {
            this.scanOnStartup().catch((err) => {
                this.logger.error(toError(err));
            });
        }
    }

    private async scanOnStartup(): Promise<void> {
        this.logger.startup("Reading messages since startup");
        const yesterday = Date.now() - ONE_DAY_MS;
        const channels = this.client.channels.cache
            .filter((ch) => ch.type === discord.ChannelType.GuildText && (ch as discord.TextChannel).viewable)
            .map((ch) => ch as discord.TextChannel);
        for (const channel of channels) await this.scanChannel(channel, yesterday);
    }

    private async scanChannel(channel: discord.TextChannel, since: number): Promise<void> {
        try {
            const messages = await channel.messages.fetch({ limit: 100 });
            const filteredMessages = messages.filter((m) => m.createdTimestamp > since);
            for (const message of filteredMessages.values()) await this.processScannedMessage(message);
        } catch (err) {
            this.logger.error(toError(err));
        }
    }

    private async processScannedMessage(rawMessage: discord.Message): Promise<void> {
        const message = toBotMessage(rawMessage);
        await this.registry.database.storeMessage(message);
        if (!rawMessage.content.match(new RegExp(this.config.prefix, "i"))) return;
        const calls = this.registry.messageHandler.getCommandCalls();
        if (rawMessage.id in calls) return;
        if (!this.registry.commandHandler.isUserBanned(message))
            this.registry.commandHandler.handleCommand(message, true);
    }

    private loadDisallowed(): Record<string, boolean> {
        try {
            if (fs.existsSync(DISALLOWED_PATH)) {
                const data = fs.readFileSync(DISALLOWED_PATH, "utf8");

                return JSON.parse(data) as Record<string, boolean>;
            } else {
                fs.writeFileSync(DISALLOWED_PATH, "{}", "utf8");

                return {};
            }
        } catch (err) {
            this.logger.error(`Error loading disallowed.json: ${toError(err).message}`);

            return {};
        }
    }
}
