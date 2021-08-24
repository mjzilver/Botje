function sendMessage() {
    var selectedChannel = $(`#channelSelect`).val()
    var selectedUser = $(`#userSelect`).val()
    var textToSend = $(`#textToSend`).val()

    if (textToSend != '') {
        $.post('/interact', {
            'type' : 'webhook',
            'channel': selectedChannel,
            'user': selectedUser,
            'text': textToSend
        })
    }
}

function useCommand() {
    var selectedChannel = $(`#channelSelect`).val()
    var selectedCommand = $(`#commandSelect`).val()
    var commandText = $(`#commandText`).val()

    if (textToSend != '') {
        $.post('/interact', {
            'type' : 'command',
            'channel': selectedChannel,
            'command': selectedCommand,
            'text': commandText
        })
    }
}

function guildSelected() {
    var selectedGuild = $(`#guildSelect`).val()
    var first = null;

    $('#channelSelect > option').each(function() {
        if ($(this).attr('guild') == selectedGuild) {
            $(this).show()
            if(!first)
                first = $(this)
        } else {
            $(this).hide()
        }
    })
    $("#channelSelect option:selected").prop("selected", false);
    $(first).prop("selected", "selected");
}

$(document).ready(function() {
    guildSelected()
})