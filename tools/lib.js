// Shared Node helpers: static server + headless browser launcher.
// Browser resolution order: --chrome / CHROME_PATH → puppeteer → puppeteer-core → playwright.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm',
};

function startServer(root) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      try {
        const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        let p = path.normalize(path.join(root, u));
        if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
        if (!fs.existsSync(p)) { res.writeHead(404); return res.end('not found'); }
        const stat = fs.statSync(p);
        const type = MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
        const range = req.headers.range;
        if (range) {
          const m = /bytes=(\d*)-(\d*)/.exec(range);
          const start = m[1] ? parseInt(m[1], 10) : 0;
          const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
          res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
          fs.createReadStream(p, { start, end }).pipe(res);
        } else {
          res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': 'no-cache' });
          fs.createReadStream(p).pipe(res);
        }
      } catch (e) { res.writeHead(500); res.end(String(e)); }
    });
    srv.listen(0, '127.0.0.1', () => resolve({ server: srv, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}

const CHROME_ARGS = [
  '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
  '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  '--force-color-profile=srgb', '--hide-scrollbars', '--mute-audio',
];

function tryRequire(name) { try { return require(name); } catch (_) { return null; } }

/** Returns { kind, newPage(), close() }. Pages expose goto/evaluate/screenshot. */
async function launch({ chrome, gpu = false, headless = true } = {}) {
  const exe = chrome || process.env.CHROME_PATH;
  const args = CHROME_ARGS.concat(gpu ? ['--use-angle=default', '--enable-gpu-rasterization'] : ['--use-angle=swiftshader']);
  const pptr = tryRequire('puppeteer') || (exe ? tryRequire('puppeteer-core') : null);
  if (pptr) {
    const browser = await pptr.launch({ headless: headless ? 'new' : false, executablePath: exe || undefined, args, protocolTimeout: 0, defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 } });
    return {
      kind: 'puppeteer',
      async newPage() { const p = await browser.newPage(); await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 }); p.setDefaultTimeout(0); return p; },
      close: () => browser.close(),
    };
  }
  const pw = tryRequire('playwright') || tryRequire('playwright-core');
  if (pw) {
    const browser = await pw.chromium.launch({ headless, executablePath: exe || undefined, args });
    return {
      kind: 'playwright',
      async newPage() { const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }); const p = await ctx.newPage(); p.setDefaultTimeout(0); return p; },
      close: () => browser.close(),
    };
  }
  throw new Error('No browser automation found. Run `npm install` (installs puppeteer) or set CHROME_PATH with puppeteer-core.');
}

/** Open the film page and wait until it is ready. */
async function openFilm(br, baseUrl, { sections, dev, log = true } = {}) {
  const page = await br.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  const q = `render=1${sections ? '&sections=' + sections : ''}${dev ? '&dev=' + dev : ''}`;
  await page.goto(`${baseUrl}/index.html?${q}`, { waitUntil: 'load', timeout: 0 });
  const ok = await page.evaluate(async () => { try { await window.__ready; return true; } catch (e) { return String(window.__bootError || e); } });
  if (ok !== true) throw new Error('Film failed to boot: ' + ok + '\n' + errs.join('\n'));
  page.__errs = errs;
  if (log && errs.length) console.warn('[page errors]', errs.slice(0, 5).join('\n'));
  return page;
}

function parseArgs(argv) {
  const o = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const nx = argv[i + 1];
    if (nx === undefined || nx.startsWith('--')) o[k] = true; else { o[k] = nx; i++; }
  }
  return o;
}

module.exports = { startServer, launch, openFilm, parseArgs, CHROME_ARGS };
