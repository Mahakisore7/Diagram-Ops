const mongoose = require('mongoose');
const { mongoUri } = require('../config/env');

async function connect() {
  await mongoose.connect(mongoUri);
}

async function disconnect() {
  await mongoose.disconnect();
}

// readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connect, disconnect, isConnected };
