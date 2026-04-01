import type { ICommand } from "../interfaces";
export default {
    name: "age",
    description: "shows how long bot has been living in this server",
    format: "age",
    function(message, context) {
        const member = message.guild?.members?.cache?.find(
            (u: { id: string; joinedAt?: Date }) => u.id === context.client.user?.id,
        );
        const joined = new Date(member?.joinedAt ?? Date.now());
        const now = new Date();
        const diff = now.getTime() - joined.getTime();
        let days = Math.floor(diff / 86400000);
        const years = Math.floor(days / 365);
        days -= years * 365;
        const hours = Math.floor((diff / 3600000) % 24);
        const birthday = `${joined.getDate()} of ${joined.toLocaleString("default", { month: "long" })}`;
        context.messageHandler.reply(
            message,
            `I have been in this server for ${years ? `${years} years, ` : ""}${days} days and ${hours} hours. My birthday is ${birthday}`,
        );
    },
} satisfies ICommand;
