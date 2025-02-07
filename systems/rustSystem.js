const logger = require("systems/logger.js");
const net = require("net");

class RustSystem {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.connectToSocket();
    }

    connectToSocket() {
        this.client = net.createConnection("/tmp/botje_service.sock");

        this.client.on("connect", () => {
            this.isConnected = true;
            logger.startup("Connected to Rust socket");
        });

        this.client.on("error", (err) => {
            logger.error(`Error connecting to Rust socket: ${err.message}`);
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

            let response = "";

            this.client.on("data", (chunk) => {
                response += chunk.toString();
            });

            this.client.on("end", () => {
                try {
                    const jsonResponse = JSON.parse(response.trim());
                    resolve(jsonResponse);
                } catch (error) {
                    reject(new Error("Invalid JSON response from Rust service"));
                }
            });

            this.client.on("error", (err) => {
                reject(new Error(`Error receiving data from Rust service: ${err.message}`));
            });
        });
    }
}

module.exports = RustSystem;
