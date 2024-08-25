document.addEventListener('DOMContentLoaded', () => {
    const inputField = document.getElementById('terminal-input');
    const terminalList = document.getElementById('terminal-list');

    // Connect to WebSocket on the /terminal path
    const socket = io('/terminal');

    socket.on('message', (data) => {
        const newMessage = document.createElement('li');
        newMessage.textContent = `${data.timestamp} ${data.level}: ${data.message}`;
        newMessage.innerHTML = `<span class="timestamp">${data.timestamp}</span> <span class="level-${data.level}">${data.level}</span>: ${data.message}`;
        terminalList.appendChild(newMessage);

        // Scroll the terminal to the bottom
        terminalList.scrollTop = terminalList.scrollHeight;
    });

    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const message = inputField.value.trim();

            if (message) {
                socket.emit("command", message);
                inputField.value = '';
            }
        }
    });
});
