const Emitter = require('events').EventEmitter;
const amqplib = require('amqplib');
const logger = require('./logger').loggerConsumer;

const MAX_RETRIES = 20;
const RETRY_INTERVAL_SECONDS = 5;

class App extends Emitter {
    constructor() {
        super();
        this.queues = {};
        this.context = {};
    }

    consume(queue, handler, assertQueueOptions={}, consumeOptions={}) {
        if (!handler) throw new TypeError('missing required param handler');
        if (typeof handler !== 'function') throw new TypeError('param handler is not a function');

        this.queues[queue] = {
            assertQueueOptions,
            consumeOptions,
            handler
        };
    }

    start(url) {
        this.url = url;
        return this._connect();
    }

    async _connect() {
        const conn = await amqplib.connect(this.url);
        this.retries = 0;
        conn.on('close', this._onConnectionClose.bind(this));
        conn.on('error', this._onError.bind(this));

        const ch = await conn.createChannel();

        this.conn = conn;
        this.ch = ch;

        const adapt = (func) => {
            return (msg) => {
                func(this._createContext(msg)).catch(e => this._onError(e));
            }
        };

        for (let qName in this.queues) {
            const q = this.queues[qName];
            await ch.assertQueue(qName, q.assertQueueOptions);
            await ch.consume(qName, adapt(q.handler), q.consumeOptions);
        }

        logger.info('connected');
    }

    _createContext(msg) {
        return {
            msg,
            conn: this.conn,
            ch: this.ch,
            ...this.context,
            app: this
        };
    }

    _onError(e) {
        this.emit('error', e);
    }

    _onConnectionClose() {
        this._reconnect();
    }

    _reconnect() {
        logger.info('reconnecting');
        setTimeout(async () => {
            try {
                await this._connect();
            } catch (e) {
                if (++this.retries !== MAX_RETRIES)
                    this._reconnect();
                else {
                    logger.error("Can not connect to server");
                    process.exit(1);
                }
            }
        }, RETRY_INTERVAL_SECONDS * 1000);
    }
}

module.exports = App;
