import os from "os";
import type { IBotContext } from "../../interfaces";
import { formatUptime } from "../utils";

const formatter = new Intl.NumberFormat("en-GB");

export type ReportRow = [string, string | number];

export async function getReportRows(context: IBotContext): Promise<ReportRow[] | null> {
    const { rss, heapUsed, heapTotal } = process.memoryUsage();
    const now = new Date();
    const diff = now.getTime() - (context.client.readyTimestamp ?? 0);
    const formattedUptime = formatUptime(diff);
    const ipAddress =
        Object.values(os.networkInterfaces())
            .flat()
            .find((alias) => alias?.family === "IPv4" && !alias?.internal)?.address ?? "Not found";
    const printRows: ReportRow[] = [
        ["Process ID", process.pid],
        ["IP address", ipAddress],
        ["Node.js Version", process.version],
        ["Memory: rss", `${Math.round((rss / 1024 / 1024) * 100) / 100} MB`],
        ["Memory: heapUsed", `${Math.round((heapUsed / 1024 / 1024) * 100) / 100} MB`],
        ["Memory: heapTotal", `${Math.round((heapTotal / 1024 / 1024) * 100) / 100} MB`],
        ["Uptime", formattedUptime],
    ];
    const sql = `SELECT pg_size_pretty(pg_database_size('botdb')) AS size, COUNT(messages.id) as count FROM messages`;
    const rows = await context.database.query<{ size: string; count: string }>(sql, []);
    if (rows.length === 0) {
        return null;
    }

    printRows.push(["Database Size", String(rows[0].size)], ["Message Count", formatter.format(Number(rows[0].count))]);
    printRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

    return printRows;
}
