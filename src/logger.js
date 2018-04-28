const log4js = require('log4js');

const loggerSender = log4js.getLogger('kmq-sender');
const loggerConsumer = log4js.getLogger('kmq-consumer');

loggerSender.level = 'debug';
loggerConsumer.level = 'debug';

module.exports.loggerSender = loggerSender;
module.exports.loggerConsumer = loggerConsumer;
