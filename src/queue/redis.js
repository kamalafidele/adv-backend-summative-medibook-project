// Redis connections.
const Redis = require('ioredis');
const config = require('../config');

function createRedis() {
  const client = new Redis(config.redisUrl, { maxRetriesPerRequest: 2 });
  client.on('error', function (err) {
    console.error('Redis error: ' + err.message);
  });
  return client;
}

// the web server uses this shared connection
const redis = createRedis();

module.exports = { createRedis, redis };
