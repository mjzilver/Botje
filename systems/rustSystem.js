const logger = require("systems/logger.js");
const net = require("net");
const { v4: uuidv4 } = require("uuid");

class RustSystem {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.responseBuffer = "";
        this.pendingRequests = new Map();
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

        this.client.on("data", (chunk) => {
            this.responseBuffer += chunk.toString();

            try {
                const messages = this.responseBuffer.split("\n").filter(Boolean);
                this.responseBuffer = "";

                for (const message of messages) {
                    const jsonResponse = JSON.parse(message);
                    const requestId = jsonResponse.id;
                    if (this.pendingRequests.has(requestId)) {
                        const { resolve, _, timeout } = this.pendingRequests.get(requestId);
                        logger.debug(`Processed response: ${JSON.stringify(jsonResponse)}`);

                        clearTimeout(timeout)
                        resolve(jsonResponse.response);
                        this.pendingRequests.delete(requestId);
                    }
                }
            } catch (error) {
                logger.error("Failed to parse response: " + error.message);
            }
        });
    }

    sendQuery(msgType, args) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                this.connectToSocket();
            }

            const requestId = uuidv4();
            const msg = {
                id: requestId,
                msg_type: msgType,
                args: args
            };

            logger.debug(`Sending message to Rust service: ${JSON.stringify(msg)}`);
            this.client.write(JSON.stringify(msg) + "\n");

            const timeout = setTimeout(() => {
                reject(new Error("No response from Rust service within timeout"));
                this.pendingRequests.delete(requestId);
            }, 15 * 1000);

            this.pendingRequests.set(requestId, { resolve, reject, timeout });
        });
    }
}

module.exports = RustSystem;
