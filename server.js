// A tiny static server for previewing the AzLang site and IDE in a browser.
// Usage:  node server.js   ->  http://127.0.0.1:4173
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 4173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.az': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8'
};

http.createServer((req, res) => {
  let file = decodeURIComponent((req.url || '/').split('?')[0]);
  if (file === '/') file = '/index.html';

  const full = path.join(root, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));

  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found: ' + file);
      return;
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(full)] || 'application/octet-stream'
    });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => {
  console.log('AzLang -> http://127.0.0.1:' + port);
  console.log('Studio -> http://127.0.0.1:' + port + '/ide.html');
});
