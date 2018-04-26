const compose = require('koa-compose');

class QueueConsumer {
    constructor() {
        this._handlers = [];
    }

    handle(...handlers) {
        for (let h of handlers) {
            if (typeof h !== 'function')
                throw new TypeError('must be a function');
        }

        this._handlers = this._handlers.concat(handlers);
    }

    handlers() {
        return compose(this._handlers);
    }
}

module.exports = QueueConsumer;
