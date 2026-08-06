import fs from "node:fs";

export function readGuildEmoteDir(guildId: string | null): { path: string; files: string[] } {
    const path = `backups/emotes/${guildId}/`;

    return { path, files: fs.readdirSync(path) };
}
