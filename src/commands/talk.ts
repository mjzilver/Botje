import type { ICommand } from "../interfaces";
import { generateTalkMessage } from "../features/mimic/textGenerationService";
import { toError } from "../utils";

export default {
    name: "talk",
    description: "makes the bot talk via predictive text or as if it were the mentioned user",
    format: "talk (@user)",
    options: [{ type: "user", name: "user", description: "The user to mimic (optional)", required: false }],
    async function(message, context) {
        const mention = message.mentions?.users?.first?.();
        try {
            const result = await generateTalkMessage(context, mention?.id);
            if (result) context.messageHandler.send(message, result);
        } catch (err) {
            context.logger.error(toError(err));
        }
    },
} satisfies ICommand;
