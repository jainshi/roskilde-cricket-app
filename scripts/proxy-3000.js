const http = require('http');

const server = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: 3001,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: req.headers.host },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Dev server forwarder error: ' + err.message);
  });

  req.pipe(proxyReq, { end: true });
});

server.on('upgrade', (req, socket, head) => {
  const net = require('net');
  const proxySocket = net.connect(3001, '127.0.0.1', () => {
    proxySocket.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
      Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') +
      '\r\n\r\n'
    );
    proxySocket.write(head);
    socket.pipe(proxySocket).pipe(socket);
  });
  proxySocket.on('error', () => socket.destroy());
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Port 3000 forwarding to active dev server on http://localhost:3001');
});
