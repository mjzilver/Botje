# Botje v3

A Discord bot made for myself and friends — built entirely for fun, not intended for public use.

A full rewrite of [Botje](https://github.com/mjzilver/Botje) in TypeScript with strict types, a PostgreSQL backend, comprehensive tests, and proper error handling so it can run unattended in the cloud.

## Features

- **Message statistics** tracked in PostgreSQL:
  - Message count per user and server-wide totals
  - Custom emote usage frequency and rankings
  - Repeated phrases and common expressions
  - Message score based on letter values (Scrabble-like)
  - Post quality metrics measuring uniqueness
  - Syllable count analysis
  - Word and phrase usage tracking
  - `profile` — user interests and dislikes derived from sentiment analysis of message history
  - `stats` — activity overview for yourself or another user

- **Text generation**:
  - `talk` — Markov chain message generation trained on the whole server's history
  - `mimic` — generates a message in a specific user's style based on their message history
  - `speak` — pattern-matching message recycling from the database
  - `about` — makes the bot say something about a given topic
  - `reply` — regex-based auto-responses to keywords
  - `ask` — LLM integration for conversational responses

- **Server backup utilities**:
  - Custom emote backup and archival
  - Database backup
  - Message history scanning and preservation

- **External API integrations**:
  - YouTube video search
  - Reddit posts by subreddit, timespan, and popularity
  - Weather lookup by city name

- **Interactive games**:
  - Hangman word guessing
  - Tarot card readings with optional LLM interpretation

- **Image manipulation**:
  - Meme generator with custom top/bottom text
  - Emote image combining and fusion

- **Moderation and admin tools**:
  - Message purging and channel nuking
  - Timed message deletion
  - Keyword filtering
  - Custom meme template management
  - Activity logging

- **Utility commands**:
  - Dice rolling, random choice picker
  - Emoji text converter
  - `getemote` — fetches a server emote by name, or lists all if omitted
  - `quote` — fetches a random archived message from server history, optionally filtered by user or keyword
  - `who` — traces the origin of a message by reply chain or keyword search
  - `topic` — shows the current conversation topic inferred from recent channel messages
  - `poll` — creates a reaction-based poll with up to 9 options
  - `remind` — schedules a reminder for a given duration
  - Bot uptime and age tracking
  - Ping and latency measurement

## Stack

- TypeScript (strict, CommonJS, ES2022)
- discord.js v14
- PostgreSQL via `pg`
- Winston logging
- Vitest for tests

## License

GPL-3.0 — see [LICENSE](LICENSE).
