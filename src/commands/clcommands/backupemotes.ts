import type { IBotContext, IClCommand } from "../../interfaces";

export default {
    name: "backupemotes",
    description: "Saves all emotes to backups/emotes/<guildId>",
    format: "backupemotes",
    function(_input: string[], context: IBotContext) {
        context.backupHandler.backupAllEmotes();
    },
} satisfies IClCommand;
