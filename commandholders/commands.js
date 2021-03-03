var help = require('../commands/help.js');
var emoji = require('../commands/emoji.js');
var count = require('../commands/count.js');
var emotes = require('../commands/emotes.js');
var ping = require('../commands/ping.js');
var reddit = require('../commands/reddit.js');
var score = require('../commands/score.js');
var quality = require('../commands/quality.js');
var syllables = require('../commands/syllables.js');
var top = require('../commands/top.js');
var uptime = require('../commands/uptime.js');
var word = require('../commands/word.js');
var weather = require('../commands/weather.js');
var age = require('../commands/age.js');
var speak = require('../commands/speak.js');
var talk = require('../commands/talk.js');
var avatar = require('../commands/avatar.js');

var commands = {
   "help" : help,
   "emoji" : emoji,
   "count" : count,
   "emotes" : emotes,
   "ping" : ping,
   "reddit" : reddit,
   "score" : score,
   "quality" : quality,
   "syllables" : syllables,
   "top" : top,
   "uptime" : uptime,
   "word" : word,
   "weather" : weather,
   "speak" : speak,
   "talk" : talk,
   "avatar" : avatar,
   "age" : age
}

module.exports = commands