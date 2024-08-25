/* eslint-disable no-console */
document.addEventListener("DOMContentLoaded", () => {
    const channelSelect = document.getElementById("channel_select")
    const userSelect = document.getElementById("user_select")
    const guildSelect = document.getElementById("guild_select")
    const sendButton = document.getElementById("send_button")
    const webhookReponse = document.getElementById("webhook_response")

    sendButton.addEventListener("click", sendMessage)

    function sendMessage() {
        const selectedChannel = channelSelect.value
        const selectedUser = userSelect.value
        const textToSend = document.getElementById("text_to_send").value

        if (textToSend !== "" && selectedChannel !== "" && selectedUser !== "") {
            fetch("/webhooks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    channel: selectedChannel,
                    user: selectedUser,
                    text: textToSend
                })
            })

            webhookReponse.textContent = "Message sent!"
            webhookReponse.style.display = "block"
            webhookReponse.style.backgroundColor = "green"
        } else {
            webhookReponse.textContent = "Please fill in all fields"
            webhookReponse.style.display = "block"
            webhookReponse.style.backgroundColor = "red"
        }
    }

    async function fetchChannels(guildId) {
        if (guildId === "")
            return

        try {
            const response = await fetch(`webhooks/channels/${guildId}`)
            const channels = await response.json()

            // Clear current options
            channelSelect.innerHTML = "<option value=\"\">Select a channel</option>"

            channels.forEach(channel => {
                const option = document.createElement("option")
                option.value = channel.id
                option.setAttribute("guild", channel.guildId)
                option.textContent = channel.name
                channelSelect.appendChild(option)
            })

            // Trigger channel change to update users
            channelSelect.dispatchEvent(new Event("change"))
        } catch (error) {
            console.error("Error fetching channels:", error)
        }
    }

    async function fetchUsers(channelId) {
        if (channelId === "")
            return

        try {
            const response = await fetch(`webhooks/users/${channelId}`)
            const users = await response.json()

            // Clear current options
            userSelect.innerHTML = "<option value=\"\">Select a user</option>"

            users.forEach(user => {
                const option = document.createElement("option")
                option.value = user.userId
                option.setAttribute("channel", user.channelId)
                option.textContent = user.username
                userSelect.appendChild(option)
            })
        } catch (error) {
            console.error("Error fetching users:", error)
        }
    }

    guildSelect.addEventListener("change", () => {
        const selectedGuild = guildSelect.value
        fetchChannels(selectedGuild)
    })

    channelSelect.addEventListener("change", () => {
        const selectedChannel = channelSelect.value
        fetchUsers(selectedChannel)
    })

    // Initialize on page load
    fetchChannels(guildSelect.value)
})
