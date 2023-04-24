function sendMessage() {
    let selectedChannel = $("#channelSelect").val()
    let selectedUser = $("#userSelect").val()
    let textToSend = $("#textToSend").val()

    if (textToSend != "") {
        $.post("/interact", {
            "channel": selectedChannel,
            "user": selectedUser,
            "text": textToSend
        })
    }
}

function guildSelected() {
    let selectedGuild = $("#guildSelect").val()
    let first = null

    $("#channelSelect > option").each(function () {
        if ($(this).attr("guild") == selectedGuild) {
            $(this).show()
            if (!first)
                first = $(this)
        } else {
            $(this).hide()
        }
    })
    $("#channelSelect option:selected").prop("selected", false)
    $(first).prop("selected", "selected")
}

$(document).ready(function () {
    guildSelected()
})