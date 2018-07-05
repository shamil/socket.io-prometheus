'use strict';

let promClient, metrics;

function strToBytes(str) {
  try {
    str = (typeof str === 'string') ? str : JSON.stringify(str);
  } catch (e) {
    return 0;
  }

  return Buffer.byteLength(str || '', 'utf8');
}

function beforeHook(obj, methods, hook) {
  if (!obj) return false;
  if (!Array.isArray(methods)) methods = [methods];

  methods.forEach((meth) => {
    let orig = obj[meth];
    if (!orig) return;

    obj[meth] = function () {
      try {
        hook(arguments);
      } catch (e) {
        console.error(e);
      }

      return orig.apply(this, arguments);
    };
  });
}

function initializeMetrics() {
  const {Counter, Gauge} = promClient;

  return {
    connectedSockets: new Gauge({
      name: 'socket_io_connected',
      help: 'Number of currently connected sockets',
    }),

    connectTotal: new Counter({
      name: 'socket_io_connect_total',
      help: 'Total count of socket.io connection requests',
    }),

    disconnectTotal: new Counter({
      name: 'socket_io_disconnect_total',
      help: 'Total count of socket.io disconnections',
    }),

    eventsReceivedTotal: new Counter({
      name: 'socket_io_events_received_total',
      help: 'Total count of socket.io recieved events',
      labelNames: ['event'],
    }),

    eventsSentTotal: new Counter({
      name: 'socket_io_events_sent_total',
      help: 'Total count of socket.io sent events',
      labelNames: ['event'],
    }),

    bytesReceived: new Counter({
      name: 'socket_io_recieve_bytes',
      help: 'Total socket.io bytes recieved',
      labelNames: ['event'],
    }),

    bytesTransmitted: new Counter({
      name: 'socket_io_transmit_bytes',
      help: 'Total socket.io bytes transmitted',
      labelNames: ['event'],
    }),
  };
}

function collectMetrics(io) {
  if (metrics == null) {
    metrics = initializeMetrics();
  }

  const connectedSockets = metrics.connectedSockets;
  const connectTotal = metrics.connectTotal;
  const disconnectTotal = metrics.disconnectTotal;
  const eventsReceivedTotal = metrics.eventsReceivedTotal;
  const eventsSentTotal = metrics.eventsSentTotal;
  const bytesReceived = metrics.bytesReceived;
  const bytesTransmitted = metrics.bytesTransmitted;

  // listen to connect events
  io.on('connection', (socket) => {
    connectTotal.inc();
    connectedSockets.inc();
    socket.on('disconnect', () => {
      connectedSockets.dec();
      disconnectTotal.inc();
    });

    // Sent events
    beforeHook(socket, 'emit', ([event, eventStr]) => {
      // ignore internal events
      if (event === 'newListener') return;

      bytesTransmitted.labels(event).inc(strToBytes(eventStr));
      eventsSentTotal.labels(event).inc();
    });

    // Recieved events
    beforeHook(socket, ['addListener', 'on'], (args) => {
      let event = args[0],
        cbPos = args.length - 1;

      // ignore internal events
      if (event === 'disconnect') return;

      // get original callback function
      let origCb = (typeof args[cbPos] === 'function') ? args[cbPos] : undefined;
      if (!origCb) return false;

      args[cbPos] = function () {
        let eventStr = Array.prototype.slice.call(arguments)[0];

        bytesReceived.labels(event).inc(strToBytes(eventStr));
        eventsReceivedTotal.labels(event).inc();

        return origCb.apply(this, arguments);
      };
    });
  });
}

module.exports = function() {
  try {
    promClient = require('prom-client');
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      return console.error('`prom-client` module not installed, socket.io metrics will not be collected.');
    }

    throw e;
  }

  return collectMetrics.apply(null, Array.from(arguments));
};
