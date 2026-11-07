import net from 'node:net';

// Preload before Next/Sentry initialization so fixture traces cannot reach external collectors.
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const options = Array.isArray(args[0]) ? args[0] : args;
  const host = typeof options[0] === 'object' ? options[0].host : options[1];
  if (typeof host === 'string' && !['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('External connections are forbidden in the native touch fixture');
  }
  return connect.apply(this, args);
};
