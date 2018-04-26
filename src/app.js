const Emitter = require('events').EventEmitter;
const amqplib = require('amqplib');

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
        const connectServer = async () => {
            const conn = await amqplib.connect(url);
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
        };

        connectServer().then(() => this.emit('success')).catch(e => this._onError(e));
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
}

module.exports = App;
