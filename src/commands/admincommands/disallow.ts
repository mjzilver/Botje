import fs from "fs";
import type { ICommand } from "../../interfaces";
const DISALLOWED_PATH = "json/disallowed.json";
export default {
    name: "disallow",
    description: "disallows or re-allows a user from using the bot",
    format: "disallow @user (remove)",
    function(message, context) {
        const mention = message.mentions?.users?.first?.() as
            | {
                  id: string;
                  username: string;
              }
            | undefined;
        const args = message.content.split(" ");
        const disallowed = JSON.parse(fs.readFileSync(DISALLOWED_PATH, "utf8"));
        if (args[2] && args[2] === "remove") {
            if (mention) delete disallowed[mention.id];
            context.logger.warn(`${mention?.username} is now allowed to use the bot again`);
            context.messageHandler.markComplete(message);
        } else if (mention) {
            disallowed[mention.id] = true;
            context.disallowed[mention.id] = true;
            context.logger.warn(`${mention.username} is no longer allowed to use the bot`);
            context.messageHandler.markComplete(message);
        } else {
            return context.messageHandler.send(message, "You need to @ someone to disallow them");
        }
        fs.writeFile(DISALLOWED_PATH, JSON.stringify(disallowed), (err) => {
            if (err) context.logger.error(err);
        });
    },
} satisfies ICommand;
