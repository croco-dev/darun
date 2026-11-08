import { createServer } from 'node:http';

// Keep the real SDK and Next tunnel active without forwarding or retaining fixture telemetry.
createServer((request, response) => {
  const pathname = request.url?.split('?')[0];
  if (request.method === 'GET' && pathname === '/health') {
    response.writeHead(200).end('ok');
    return;
  }
  if (request.method === 'POST' && pathname === '/monitoring') {
    request.resume();
    response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
    return;
  }
  response.writeHead(404).end();
}).listen(16490, '127.0.0.1');
