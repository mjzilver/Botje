# Botje

A discord bot made for myself and discord friends. This bot was built entirely for my own entertainment, and is not intended for public use.
If you're interested in creating your own private Discord bot for fun, feel free to take a look at the code on my GitHub repository. 
However, please note that this bot is not intended for public use, and I cannot provide support for any issues you may encounter.

# Features 
- Message statistics and analytics tracked in PostgreSQL database:
    - Message count per user and server-wide totals
    - Custom emote usage frequency and rankings
    - Repeated phrases and common expressions
    - Message "score" based on letter values (Scrabble-like scoring)
    - Post "quality" metrics measuring uniqueness
    - Syllable count analysis
    - Word/phrase usage tracking
- Server backup utilities:
    - Custom emote backup and archival to local filesystem
    - Database backup functionality
    - Message history preservation
- External API integrations:
    - YouTube video search and link sharing
    - Reddit posts fetching (by subreddit, timespan, and popularity)
    - Weather data lookup by city name
- Text generation using multiple techniques:
    - `talk` - Markov chain-based message generation (mimics users)
    - `speak` - Pattern-matching message recycling from database
    - `reply` - Regex-based auto-responses to keywords
    - `ask` - LLM integration for conversational AI responses
- Interactive games and entertainment:
    - Hangman word guessing game
    - Tarot card readings
- Text manipulation tools:
    - Emoji text converter
    - Emote image combining/fusion
    - Random choice picker
- Utility commands:
    - Dice rolling with customizable ranges
    - Bot uptime and age tracking
    - Ping/latency measurement
- Moderation and admin tools:
    - Message purging/bulk deletion
    - Channel nuking
    - Timed message deletion
    - Keyword disallowing/filtering
    - Custom meme template management
    - Activity logging
