// Minimal static server that sends the COOP/COEP headers PSP needs.
// Usage: node serve-coi.js [port] [dir]
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.argv[2] || 3000;
const root = path.resolve(process.argv[3] || '.');

const MIME = {
  '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml',
  '.wasm':'application/wasm', '.data':'application/octet-stream',
};

http.createServer((req, res) => {
  let filePath = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (filePath.endsWith('/')) filePath += 'index.html';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
    res.writeHead(200);
    res.end(data);
  });
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port} with COOP/COEP headers`));
