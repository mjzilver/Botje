var emoji_values = require('../json/emoji.json');

module.exports = function(message) {
    var sentence = message.content.split(' ').slice(1);

    sentence = sentence.join(' ');
    sentence = sentence.toLowerCase();
    var result = '';
    if (sentence.length > 0) {
        for (var i = 0; i < sentence.length; i++) {
            if (sentence.charAt(i) >= 'a' && sentence.charAt(i) <= 'z')
                result += emoji_values['letter_' + sentence.charAt(i)];
            result += ' ';
        }
    }
    message.channel.send(result);
}