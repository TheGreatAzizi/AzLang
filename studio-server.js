#!/usr/bin/env node
'use strict';

// AzLang Studio server - a tiny, dependency-free static server that opens the
// browser-based Studio at http://127.0.0.1:<port>/ide.html.
//
// Serving the editor over http:// (instead of opening ide.html from the file
// system) gives AzLang programs a normal web origin, so fetch(), imports, and
// browser storage all work the way they do on a real website.
//
//   node studio-server.js                start on the first free port near 4173
//   node studio-server.js --port 5000    use a specific port
//   node studio-server.js --no-open      do not open a browser window
//   node studio-server.js --idle 120     stop after 120 idle minutes
//
// The server only reads files inside its own folder. It never executes code on
// the host; programs run inside the browser tab.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = __dirname;
const VERSION = (function () {
  try {
    const runtime = fs.readFileSync(path.join(root, 'azlang.js'), 'utf8');
    const match = /var VERSION = '([^']+)'/.exec(runtime);
    return match ? match[1] : 'dev';
  } catch (e) {
    return 'dev';
  }
})();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.az': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function parseArgs(argv) {
  const options = {
    port: Number(process.env.AZLANG_STUDIO_PORT || 4173),
    open: true,
    idle: 180,
    host: '127.0.0.1'
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '--no-open') {
      options.open = false;
    } else if (arg === '--open') {
      options.open = true;
    } else if (arg === '--port' || arg === '--idle' || arg === '--host') {
      const value = argv[i + 1];
      i += 1;
      if (arg === '--port') options.port = Number(value);
      else if (arg === '--idle') options.idle = Number(value);
      else options.host = String(value || options.host);
    } else if (/^--port=/.test(arg)) {
      options.port = Number(arg.slice(7));
    } else if (/^--idle=/.test(arg)) {
      options.idle = Number(arg.slice(7));
    } else if (/^--host=/.test(arg)) {
      options.host = arg.slice(7);
    } else {
      process.stderr.write('Unknown option: ' + arg + '\n');
      process.exitCode = 2;
      options.bad = true;
    }
  }
  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    process.stderr.write('The port must be a whole number between 0 and 65535.\n');
    process.exitCode = 2;
    options.bad = true;
  }
  if (!Number.isFinite(options.idle) || options.idle < 0) {
    process.stderr.write('The idle time must be zero or a positive number of minutes.\n');
    process.exitCode = 2;
    options.bad = true;
  }
  return options;
}

function help() {
  process.stdout.write([
    '',
    '  AzLang Studio ' + VERSION,
    '',
    '  Usage: node studio-server.js [options]',
    '',
    '    --port <n>     port to listen on (default 4173, tries nearby ports)',
    '    --host <name>  address to bind (default 127.0.0.1)',
    '    --no-open      do not open the default browser',
    '    --idle <n>     stop after n idle minutes (default 180; 0 = never)',
    '    -h, --help     show this help',
    '',
    '  Studio URL: http://127.0.0.1:4173/ide.html',
    ''
  ].join('\n') + '\n');
}

function openBrowser(url) {
  let command;
  let args;
  if (process.platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }
  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', function () {
      process.stdout.write('Open this URL in your browser: ' + url + '\n');
    });
    child.unref();
  } catch (e) {
    process.stdout.write('Open this URL in your browser: ' + url + '\n');
  }
}

function safeFile(urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  } catch (e) {
    return null;
  }
  if (pathname === '/' || pathname === '') pathname = '/ide.html';
  const full = path.resolve(root, '.' + pathname);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

function health(res) {
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify({ app: 'AzLang Studio', version: VERSION }));
}

function existingStudio(port, callback) {
  const request = http.get({
    host: '127.0.0.1',
    port: port,
    path: '/__azlang/health',
    timeout: 700
  }, function (res) {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) { body += chunk; });
    res.on('end', function () {
      try {
        const data = JSON.parse(body);
        callback(data && data.app === 'AzLang Studio' ? data : null);
      } catch (e) {
        callback(null);
      }
    });
  });
  request.on('timeout', function () { request.destroy(); });
  request.on('error', function () { callback(null); });
}

function start(options) {
  let idleTimer = null;
  let lastActivity = Date.now();
  let lastHeartbeat = 0;

  const server = http.createServer(function (req, res) {
    lastActivity = Date.now();

    if (req.url === '/__azlang/health') {
      health(res);
      return;
    }

    if (req.url === '/__azlang/ping') {
      lastHeartbeat = Date.now();
      res.writeHead(204, { 'Cache-Control': 'no-store' });
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' });
      res.end('Method not allowed');
      return;
    }

    const file = safeFile(req.url || '/');
    if (!file) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad request');
      return;
    }

    fs.stat(file, function (err, stat) {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found: ' + (req.url || '/'));
        return;
      }

      const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': type,
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const stream = fs.createReadStream(file);
      stream.on('error', function () {
        res.destroy();
      });
      stream.pipe(res);
    });
  });

  server.on('error', function (error) {
    if (error.code === 'EADDRINUSE' && !options.fixedPort) {
      if (options.port > 0 && options.port < 65000) {
        options.port += 1;
        start(options);
        return;
      }
    }
    process.stderr.write('Could not start AzLang Studio: ' + error.message + '\n');
    process.exitCode = 1;
  });

  server.listen(options.port, options.host, function () {
    const address = server.address();
    const port = address && typeof address === 'object' ? address.port : options.port;
    const url = 'http://' + options.host + ':' + port + '/ide.html';
    process.stdout.write('AzLang Studio ' + VERSION + '\n');
    process.stdout.write('Serving ' + root + '\n');
    process.stdout.write('Open ' + url + '\n');
    process.stdout.write('Press Ctrl+C to stop.\n');
    if (options.open) openBrowser(url);

    if (options.idle > 0) {
      idleTimer = setInterval(function () {
        const now = Date.now();
        const heartStale = lastHeartbeat > 0 && now - lastHeartbeat > 10 * 60000;
        if (heartStale || now - lastActivity >= options.idle * 60000) {
          process.stdout.write(heartStale
            ? 'Stopping because the Studio page was closed.\n'
            : 'Stopping after ' + options.idle + ' idle minutes.\n');
          server.close(function () { process.exit(0); });
        }
      }, 30000);
      idleTimer.unref();
    }
  });

  function shutdown() {
    if (idleTimer) clearInterval(idleTimer);
    server.close(function () { process.exit(0); });
    setTimeout(function () { process.exit(0); }, 1500).unref();
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  help();
} else if (!options.bad) {
  if (options.port > 0) {
    existingStudio(options.port, function (found) {
      if (found) {
        const url = 'http://' + options.host + ':' + options.port + '/ide.html';
        process.stdout.write('AzLang Studio is already running at ' + url + '\n');
        if (options.open) openBrowser(url);
        return;
      }
      start(options);
    });
  } else {
    start(options);
  }
}
