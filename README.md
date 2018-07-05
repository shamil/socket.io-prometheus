# socket.io-prometheus

[![NPM Version][npm-image]][npm-url]

Collect `socket.io` server metrics with Prometheus.

## Example Usage

This module has a peer dependency on [`prom-client`][prom-client-url], version `10` and up.

Pass the [`socket.io`][socket.io-url] instance to the `socket.io-prometheus` module.

```js
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const ioMetrics = require('socket.io-prometheus')
const promRegister = require('prom-client').register

// start collecting socket.io metrics
ioMetrics(io);

// expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', promRegister.contentType)
  res.end(promRegister.metrics())
})
```

## Metrics exposed

> all metrics have `socket_io_` prefix in their names.

| Name                              | Help                                         | Labels  |
| --------------------------------- | ---------------------------------------------| ------- |
| `socket_io_connected`             | Number of currently connected sockets        |         |
| `socket_io_connect_total`         | Total count of socket.io connection requests |         |
| `socket_io_disconnect_total`      | Total count of socket.io disconnections      |         |
| `socket_io_events_received_total` | Total count of socket.io recieved events     | `event` |
| `socket_io_events_sent_total`     | Total count of socket.io sent events         | `event` |
| `socket_io_recieve_bytes`         | Total socket.io bytes recieved               | `event` |
| `socket_io_transmit_bytes`        | Total socket.io bytes transmitted            | `event` |

## License

Licensed under the MIT License. See the LICENSE file for details.

[npm-image]: https://img.shields.io/npm/v/socket.io-prometheus.svg
[npm-url]: https://npmjs.org/package/socket.io-prometheus
[prom-client-url]: https://github.com/siimon/prom-client
[socket.io-url]: https://github.com/socketio/socket.io
