import fs from "fs";
import path from "path";
import * as discord from "discord.js";
import type { BotConfig } from "../interfaces/config";
import type { ILogger } from "../interfaces";
import { toBotMessage } from "./messageAdapter";
import { setBotContext } from "./botContext";
import { SystemRegistry } from "./systemRegistry";
import { toError } from "./utils";

const DISALLOWED_PATH = path.resolve(__dirname, "../json/disallowed.json");

export class Bot {
    readonly client: discord.Client;
    registry!: SystemRegistry;
    private readonly config: BotConfig;
    private readonly logger: ILogger;
    private readonly version: string;
    constructor(config: BotConfig, logger: ILogger, version = "3.0.0") {
        this.config = config;
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
            const key = process.argv.includes("--beta")
                ? this.config.discord_api_key_beta
                : this.config.discord_api_key;
            if (process.argv.includes("--beta")) this.logger.startup("Logging in with beta key");
            this.client.login(key);
        }
    }

    private async loadSystems(): Promise<void> {
        const disallowed = this.loadDisallowed();
        this.registry = new SystemRegistry(this.config, this.logger, this.client);
        await this.registry.initialize(disallowed);
        setBotContext(this.registry);
        if (this.config.scan_on_startup === true || this.config.scan_on_startup === "1") this.scanOnStartup();
    }

    private scanOnStartup(): void {
        this.logger.startup("Reading messages since startup");
        const yesterday = Date.now() - 24 * 60 * 60 * 1000;
        this.client.channels.cache
            .filter((ch) => ch.type === discord.ChannelType.GuildText && (ch as discord.TextChannel).viewable)
            .forEach((ch) => this.scanChannel(ch as discord.TextChannel, yesterday));
    }

    private async scanChannel(channel: discord.TextChannel, since: number): Promise<void> {
        try {
            const messages = await channel.messages.fetch({ limit: 100 });
            messages
                .filter((m) => m.createdTimestamp > since)
                .forEach((m) => this.processScannedMessage(m));
        } catch (err) {
            this.logger.error(toError(err));
        }
    }

    private processScannedMessage(m: discord.Message): void {
        const msg = toBotMessage(m);
        this.registry.database.storeMessage(msg);
        if (!m.content.match(new RegExp(this.config.prefix, "i"))) return;
        const calls = this.registry.messageHandler.getCommandCalls();
        if (m.id in calls) return;
        if (!this.registry.commandHandler.isUserBanned(msg))
            this.registry.commandHandler.handleCommand(msg, true);
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
