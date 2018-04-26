## Kmq

amqp consumer app using koa middleware style handler.

```javascript

const Kmq = require('kmq');
const QueueConsumer = Kmq.Consumer;

const consumer = new QueueConsumer();

consumer.handle(async (ctx, next) => {
    /*
     * ctx.conn amqplib Connection Object
     * ctx.ch   amqplib Channel Object, eg: ctx.ch.ack(ctx.msg)
     * ctx.msg  amqplib msg object
     *
     * http://www.squaremobius.net/amqp.node/channel_api.html
     */
    const t = Date.now();
    await next();
    console.log(`total: ${Date.now() - t}ms`);
});

consumer.handle(async (ctx, next) => {
    console.log('passed context:', ctx.db);
    await next();
});

consumer.handle(async (ctx, next) => {
    console.log('raw:', ctx.msg.content.toString());
    await next();
});

consumer.handle(async (ctx, next) => {
    try {
        console.log('parse:', JSON.parse(ctx.msg.content.toString()));
        await next();
    } catch (e) {
        ctx.ch.nack(ctx.msg, false, false);
    }
}, async (ctx) => {
    console.log('handling');
    await new Promise((resolve) => {
        setTimeout(() => {
            resolve();
            ctx.ch.ack(ctx.msg);
            console.log('done. ack');
        }, 2345);
    });
});

const app = new Kmq();

app.context = { db: 'db object' };
app.consume(
        'queue.test',
        consumer.handlers(),
        { durable: true }, //assertQueue options
        { noAck: false }   //consume options
    );
app.consume('another.queue.test', consumer.handlers(), { durable: true }, { noAck: true });

app.start('amqp://username:password@your.amqp.server.host:5672/');
app.on('success', () => {
    console.log('start success');
});
app.on('error', (e) => {
    console.log('default err handler', e);
});


```
