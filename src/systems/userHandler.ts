import * as discord from "discord.js";
import type { IDatabase, IUserHandler } from "../interfaces";
import type { ILogger } from "../interfaces";

export class UserHandler implements IUserHandler {
    private db: IDatabase;
    private logger: ILogger;
    private client: discord.Client;
    private userCache: Record<string, Record<string, string>> = {};
    private static readonly UNKNOWN_USER = "Unknown User";
    constructor(db: IDatabase, logger: ILogger, client: discord.Client) {
        this.db = db;
        this.logger = logger;
        this.client = client;
    }

    async getDisplayName(userId: string, serverId: string): Promise<string> {
        if (!userId || !serverId) return UserHandler.UNKNOWN_USER;
        this.userCache[serverId] ??= {};
        const serverCache = this.userCache[serverId];
        if (serverCache[userId]) return serverCache[userId];
        const fromDb = await this.db.getCurrentUsername(userId, serverId);
        if (fromDb) {
            serverCache[userId] = fromDb;

            return fromDb;
        }

        const client = this.client;
        try {
            const guild = await client.guilds.fetch(serverId);
            const member = await guild.members.fetch(userId);
            serverCache[userId] = member.displayName;
            await this.db.ensureUserExists(member.user, serverId, member.displayName);
        } catch (err) {
            this.logger.debug(`Could not fetch guild member ${userId} in ${serverId}: ${err}`);
            try {
                const user = await client.users.fetch(userId);
                serverCache[userId] = user.username;
                await this.db.ensureUserExists(user, serverId, user.username);
            } catch (err2) {
                this.logger.debug(`Could not fetch user ${userId}: ${err2}`);
                serverCache[userId] = UserHandler.UNKNOWN_USER;
            }
        }

        return serverCache[userId];
    }
}
