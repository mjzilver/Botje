function selectLevel() {
    let selectedLevel = $("#levelSelect").val()

    if (selectedLevel == "none")
        window.location.href = window.location.href.split("?")[0]
    else
        window.location.href = window.location.href.split("?")[0] + "?level=" + selectedLevel
}