/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
document.addEventListener("DOMContentLoaded", () => {
    const inputField = document.getElementById("terminal-input")
    const terminalList = document.getElementById("terminal-list")

    // Connect to WebSocket on the /terminal path
    const socket = io("/terminal")

    socket.on("message", data => {
        const newMessage = document.createElement("li")

        const timestampSpan = document.createElement("span")
        timestampSpan.className = "timestamp"
        timestampSpan.textContent = data.timestamp

        const levelSpan = document.createElement("span")
        levelSpan.className = `level-${data.level}`
        levelSpan.textContent = data.level

        const messageText = document.createTextNode(`: ${data.message}`)

        // Append the elements in the correct order
        newMessage.appendChild(timestampSpan)
        newMessage.appendChild(document.createTextNode(" "))
        newMessage.appendChild(levelSpan)
        newMessage.appendChild(messageText)

        // Append the new message to the terminal list
        terminalList.appendChild(newMessage)

        // Scroll the terminal to the bottom
        terminalList.scrollTop = terminalList.scrollHeight
    })

    inputField.addEventListener("keypress", e => {
        if (e.key === "Enter") {
            e.preventDefault()
            const message = inputField.value.trim()

            if (message) {
                socket.emit("command", message)
                inputField.value = ""
            }
        }
    })
})

function home() {
    // redirect to /
    window.location.href = "/"
}