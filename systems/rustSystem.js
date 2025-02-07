const logger = require("systems/logger.js");
const net = require("net");

class RustSystem {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.responseBuffer = "";
        this.connectToSocket();
    }

    connectToSocket() {
        if (this.isConnected) return;

        this.client = net.createConnection("/tmp/botje_service.sock");

        this.client.on("connect", () => {
            this.isConnected = true;
            logger.startup("Connected to Rust socket");
        });

        this.client.on("error", (err) => {
            logger.error(`Error connecting to Rust socket: ${err.message}`);
        });

        this.client.on("end", () => {
            this.isConnected = false;
            logger.warn("Rust socket connection ended");
        });
    
        this.client.on("close", (hadError) => {
            this.isConnected = false;
            logger.error("Rust socket connection closed unexpectedly");
        });
    }

    sendQuery(msgType, args) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                this.connectToSocket();
            }

            const msg = {
                msg_type: msgType,
                args: args
            };

            logger.debug(`Sending message to Rust service: ${JSON.stringify(msg)}`);
            this.client.write(JSON.stringify(msg) + "\n");

            const timeout = setTimeout(() => {
                reject(new Error("No response from Rust service within timeout"));
            }, 5000);

            this.client.once("data", (chunk) => {
                this.responseBuffer += chunk.toString();

                try {
                    const message = this.responseBuffer.trim();
                    const jsonResponse = JSON.parse(message);

                    logger.debug(`Processed response: ${JSON.stringify(jsonResponse)}`);
                    resolve(jsonResponse);

                    this.responseBuffer = '';
                    clearTimeout(timeout);
                } catch (error) {
                    logger.error("Failed to parse response: " + error.message);
                    reject(new Error("Invalid JSON response from Rust service"));
                }
            });
        });
    }
}

module.exports = RustSystem;
