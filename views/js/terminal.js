document.addEventListener('DOMContentLoaded', () => {
    const inputField = document.getElementById('terminal-input');
    const terminalList = document.getElementById('terminal-list');

    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const message = inputField.value.trim();

            if (message) {
                fetch('/terminal-message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const newMessage = document.createElement('li');
                        newMessage.className = 'terminal-line';
                        const now = new Date();
                        const timestamp = now.toLocaleString("nl-NL")
                        
                        newMessage.textContent = `${timestamp} ${message}`
                        terminalList.appendChild(newMessage);
                        
                        inputField.value = '';

                        // Scroll the terminal to the bottom
                        terminalList.scrollTop = terminalList.scrollHeight;
                    }
                })
                .catch(error => console.error('Error:', error));
            }
        }
    });
});
