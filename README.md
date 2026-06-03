# Botje

A Discord bot made for myself and friends. Not intended for public use.

## Commands

### Stats
- `stats` — activity overview for yourself or another user
- `profile` — interests and dislikes derived from sentiment analysis of message history
- `count` — message counts, totals, top posters, and per-user breakdowns
- `emotes` — top emotes used server-wide, by percentage, or by user
- `phrase` — how many times a word or phrase has been used, with per-user breakdown
- `quality` — post uniqueness scores, top users, or per-user stats
- `reactions` — top reactions used, totals, and per-user breakdowns
- `replies` — who replies to whom and how often
- `said` — most repeated phrases server-wide or per user
- `score` — Scrabble-style letter value scores, top posters or per user
- `syllables` — syllable counts in posts, top users or per user

### Text generation
- `talk` — Markov chain message generation trained on server history
- `mimic` — generates a message in a specific user's style
- `speak` — picks a recycled message from the database matching a pattern
- `about` — makes the bot say something about a given topic
- `ask` — sends a question to the LLM and returns the response

### Lookup
- `youtube` — searches for a YouTube video
- `weather` — shows current weather for a city
- `quote` — fetches a random archived message, optionally filtered by user or keyword
- `who` — traces the origin of a message by reply chain or keyword search
- `getemote` — fetches a server emote by name, or lists all if omitted
- `topic` — shows the current conversation topic based on recent channel messages

### Games
- `hangman` — play a hangman minigame
- `tarot` — draws a tarot card

### Images
- `meme` — adds captions to an image to create a meme
- `combine` — combines two emotes into one image
- `emoji` — converts text into emoji characters

### Utility
- `roll` — rolls a random number
- `choose` — picks one of the given options
- `poll` — creates a reaction-based poll with up to 9 options
- `remind` — schedules a reminder for a given duration
- `ping` — shows bot latency in milliseconds
- `uptime` — shows how long the bot has been online this session
- `age` — shows how long the bot has been in the server
- `help` — lists available commands

### Admin
- `purge` — removes bot messages and messages with the bot prefix from the channel
- `nuke` — deletes every message in the server (owner only)
- `deleteafter` — deletes all messages after the replied-to message
- `disallow` — blocks or unblocks a user from using the bot
- `log` — shows recent error logs
- `addmeme` — adds an image to the meme templates

## License

GPL-3.0 — see [LICENSE](LICENSE).
