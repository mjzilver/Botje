// JQUERY document ready funciton
$(function () {
    var socket = io();
    var names = [
        'OC', 
        'Rooie', 
        'Mick', 
        'Beir', 
        'Aya', 
        'Bert', 
        'Geoff', 
        'Sarah',
        'Dirk',
        'Chad',
        'Anime',
        'Penor',
        'Raulp',
        'Katar',
        'Monk',
        'Homo Sapien',
        'Botje'
    ];

    var number = Math.floor(Math.random() * names.length) 
    var name = names[number];

    $('form').submit(function(){
        socket.emit('chat', name + ": " + $('#m').val());
        $('#m').val('');
        return false;
    });
    socket.on('chat', function(msg){
        $('#messages').append($('<li>').text(msg));
        window.scrollTo(0, document.body.scrollHeight);
    });
});

    