const amqplib = require('amqplib');

const MAX_RETRIES = 20;
const RETRY_INTERVAL_SECONDS = 5;

class Sender {
    constructor(url, queue, queueOptions) {
        this.url = url;
        this.queue = queue;
        this.queueOptions = queueOptions;
        this.retries = 0;
    }

    /**
     * @param content Buffer
     * @param options Object
     * */
    send(content, options) {
        return this.ch.sendToQueue(this.queue, content, options);
    }

    /**
     * @param messageObject Object
     * @param options Object
     * */
    sendJSON(messageObject, options={ persistent: true }) {
        const json = JSON.stringify(messageObject);
        return this.ch.sendToQueue(this.queue, Buffer.from(json), options);
    }

    async connect() {
        const conn = await amqplib.connect(this.url);

        this.retries = 0;

        conn.on('close', () => this._reconnect());

        const ch = await conn.createChannel();

        await ch.assertQueue(this.queue, this.queueOptions);

        this.conn = conn;
        this.ch = ch;
    }

    _reconnect() {
        setTimeout(async () => {
            try {
                await this.connect();
            } catch (e) {
                if (++this.retries !== MAX_RETRIES) {
                    this._reconnect();
                }
            }
        }, RETRY_INTERVAL_SECONDS * 1000);
    }
}


module.exports = Sender;
