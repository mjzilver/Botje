export interface DbConfig {
    user: string;
    host: string;
    database: string;
    password: string;
    port: number;
}

export interface ImageConfig {
    size: number;
    magnification: number;
}

export interface LlmConfig {
    model: string;
    api: string;
    base_prompt: string;
    conversation: string;
    conversation_prompt: string;
    tarot_prompt: string;
    max_concurrent_requests: number;
}

export interface BotConfig {
    prefix: string;
    discord_api_key: string;
    discord_api_key_beta: string;
    weather_api_key: string;
    youtube_api_key: string;
    owner: string;
    speakEvery: number;
    timeoutDuration: number;
    bot_avatar: string;
    color_hex: `#${string}`;
    port: number;
    "dev-port": number;
    spamchecker: number;
    image: ImageConfig;
    positive_emoji: string;
    negative_emoji: string;
    redo_emoji: string;
    db: DbConfig;
    llm: LlmConfig;
    scan_on_startup: string | boolean;
}
