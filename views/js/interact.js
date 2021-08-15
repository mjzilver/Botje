function sendMessage() {
    var selectedChannel = $(`#channelSelect`).val()
    var selectedUser = $(`#userSelect`).val()
    var textToSend = $(`#textToSend`).val()

    if (textToSend != '') {
        $.post('/interact', {
            'channel': selectedChannel,
            'user': selectedUser,
            'text': textToSend
        })
    }
}