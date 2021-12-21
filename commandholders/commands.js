var commands = {
   'help': require('../commands/help.js'),
   'emoji': require('../commands/emoji.js'),
   'count': require('../commands/count.js'),
   'emotes': require('../commands/emotes.js'),
   'ping': require('../commands/ping.js'),
   'reddit': require('../commands/reddit.js'),
   'score': require('../commands/score.js'),
   'quality': require('../commands/quality.js'),
   'syllables': require('../commands/syllables.js'),
   'top': require('../commands/top.js'),
   'uptime': require('../commands/uptime.js'),
   'word': require('../commands/word.js'),
   'weather': require('../commands/weather.js'),
   'age': require('../commands/age.js'),
   'speak': require('../commands/speak.js'),
   'talk': require('../commands/talk.js'),
   'draw': require('../commands/draw.js'),
   "hangman": require('../commands/hangmanholder.js'),
   'choose' : require('../commands/choose.js'),
   'match' : require('../commands/match.js'),
   'roll' : require('../commands/roll.js'),
   'youtube' : require('../commands/youtube.js')
}

module.exports = commands