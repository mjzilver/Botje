export interface DbConfig {
    user: string;
    host: string;
    database: string;
    password: string;
    port: number;
    poolSize: number;
}

export interface LlmConfig {
    model: string;
    api: string;
    basePrompt: string;
    conversationPrompt: string;
    tarotPrompt: string;
    maxConcurrentRequests: number;
}

export interface BotConfig {
    prefix: string;
    botName: string;
    discordApiKey: string;
    discordApiKeyBeta: string;
    weatherApiKey: string;
    youtubeApiKey: string;
    owner: string;
    speakEvery: number;
    speakMinTimeoutMinutes: number;
    speakMaxTimeoutMinutes: number;
    speakRandomChance: number;
    downvoteThreshold: number;
    timeoutDuration: number;
    colorHex: `#${string}`;
    positiveEmoji: string;
    negativeEmoji: string;
    redoEmoji: string;
    db: DbConfig;
    llm: LlmConfig;
    shouldScanOnStartup: boolean;
}
