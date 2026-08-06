import type { BotMessage } from "../../interfaces/discord";

export function getAttachmentUrl(message: BotMessage): string {
    const attachment = message.attachments?.first();
    if (attachment?.url) {
        return attachment.url;
    }

    const embed = message.embeds?.[0];
    if (embed?.url) {
        return embed.url;
    }

    return "";
}

export async function resolveImageUrl(message: BotMessage, args: string[]): Promise<string> {
    let url: string;
    if (message.reference?.messageId) {
        const fetched = await message.channel.messages.fetch(message.reference.messageId);
        url = getAttachmentUrl(fetched);
    } else {
        url = getAttachmentUrl(message);
    }

    if (args[0]?.startsWith("http")) {
        url = args.shift() ?? url;
    }

    return url;
}
