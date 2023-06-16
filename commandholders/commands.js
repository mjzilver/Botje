let commands = {
    "help": require("commands/help.js"),
    "emoji": require("commands/emoji.js"),
    "count": require("commands/listers/count.js"),
    "emotes": require("commands/listers/emotes.js"),
    "ping": require("commands/ping.js"),
    "reddit": require("commands/reddit.js"),
    "score": require("commands/listers/score.js"),
    "quality": require("commands/listers/quality.js"),
    "syllables": require("commands/listers/syllables.js"),
    "top": require("commands/listers/top.js"),
    "uptime": require("commands/uptime.js"),
    "word": require("commands/listers/word.js"),
    "weather": require("commands/weather.js"),
    "age": require("commands/age.js"),
    "speak": require("commands/speak.js"),
    "talk": require("commands/talk.js"),
    "draw": require("commands/draw.js"),
    "hangman": require("commands/hangman.js"),
    "guess": require("commands/guess.js"),
    "choose": require("commands/choose.js"),
    "roll": require("commands/roll.js"),
    "youtube": require("commands/youtube.js"),
    "getemote": require("commands/getemote.js"),
    "combine": require("commands/combine.js"),
    "meme": require("commands/meme.js")
}

module.exports = commands