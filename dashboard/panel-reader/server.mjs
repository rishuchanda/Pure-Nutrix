// PureNutrix panel reader — a tiny local service that n8n calls.
//
// It controls a separate Chrome profile ("PureNutrix Panels") on this Mac, which
// the owner logs into once by hand (OTP included). Because it is a normal Chrome
// window with a real login, the seller panels treat it like the owner's browser.
//
//   POST /read   {config:{platform, day, pages:[...]}, credentials?}  -> {platform, pages:[{..., text|error}]}
//   POST /reports {mode: 'daily'|'backfill', force?, only?: ['amazon',..]} -> downloads official reports, uploads them
//   GET  /health                                                      -> {ok, chrome}
//
// Listens on 127.0.0.1 only. Start with:  node panel-reader/server.mjs
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import readPanel from './read-panel.js';
import { backfillJobs, dailyJobs, liveToday, runJobs } from './report-jobs.mjs';

const PORT = Number(process.env.READER_PORT || 3100);
const CHROME_PORT = Number(process.env.CHROME_DEBUG_PORT || 9222);
const CHROME_BIN = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR
  || path.join(os.homedir(), 'Library', 'Application Support', 'PureNutrix-Panels-Chrome');
const READER_TOKEN = process.env.READER_TOKEN || '';

export const LOGIN_PAGES = [
  'https://sellercentral.amazon.in/',
  'https://advertising.amazon.in/',
  'https://seller.flipkart.com/',
  'https://supplier.meesho.com/',
];

async function chromeUp() {
  try {
    const r = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/version`);
    return r.ok;
  } catch {
    return false;
  }
}

// Chrome only allows remote control for a non-default profile, which is exactly what we want:
// the seller logins live in their own profile, separate from everyday browsing.
export async function startChrome(urls = []) {
  if (await chromeUp()) return;
  const child = spawn(CHROME_BIN, [
    `--remote-debugging-port=${CHROME_PORT}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run', '--no-default-browser-check', ...urls,
  ], { detached: true, stdio: 'ignore' });
  child.unref();
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await chromeUp()) return;
  }
  throw new Error('PureNutrix Chrome did not start');
}

let queue = Promise.resolve();  // one read at a time - it's one browser

async function read(body) {
  const config = body.config;
  if (!config || !config.platform || !Array.isArray(config.pages)) throw new Error('config.platform and config.pages are required');
  await startChrome();
  const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${CHROME_PORT}`, defaultViewport: null });
  const page = await browser.newPage();
  try {
    return await readPanel({ page, context: { config, credentials: body.credentials || {} } });
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
  }
}

async function reports(body) {
  await startChrome();
  const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${CHROME_PORT}`, defaultViewport: null });
  try {
    const jobs = body.mode === 'backfill' ? backfillJobs() : dailyJobs();
    const results = await runJobs(browser, jobs, { force: !!body.force, only: body.only || null });
    return { mode: body.mode || 'daily', results, ok: results.every((r) => r.status !== 'error') };
  } finally {
    browser.disconnect();
  }
}

function send(res, code, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(b) });
  res.end(b);
}

if (process.argv[1] && process.argv[1].endsWith('server.mjs')) {
  http.createServer((req, res) => {
    if (READER_TOKEN && req.headers.authorization !== `Bearer ${READER_TOKEN}`) return send(res, 401, { error: 'bad token' });
    if (req.method === 'GET' && req.url === '/health') {
      return chromeUp().then((chrome) => send(res, 200, { ok: true, chrome }));
    }
    if (req.method === 'POST' && req.url === '/live') {
      queue = queue.then(async () => {
        await startChrome();
        const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${CHROME_PORT}`, defaultViewport: null });
        try { return await liveToday(browser); } finally { browser.disconnect(); }
      }).then((out) => send(res, 200, { results: out })).catch((e) => send(res, 500, { error: String(e.message || e) }));
      return;
    }
    if (req.method === 'POST' && req.url === '/reports') {
      let raw = '';
      req.on('data', (c) => { raw += c; });
      req.on('end', () => {
        let body;
        try { body = JSON.parse(raw || '{}'); } catch { return send(res, 400, { error: 'invalid JSON' }); }
        queue = queue.then(() => reports(body))
          .then((out) => send(res, 200, out))
          .catch((e) => send(res, 500, { error: String(e.message || e) }));
      });
      return;
    }
    if (req.method === 'POST' && req.url === '/read') {
      let raw = '';
      req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
      req.on('end', () => {
        let body;
        try { body = JSON.parse(raw || '{}'); } catch { return send(res, 400, { error: 'invalid JSON' }); }
        queue = queue.then(() => read(body))
          .then((out) => send(res, 200, out))
          .catch((e) => send(res, 500, { error: String(e.message || e) }));
      });
      return;
    }
    send(res, 404, { error: 'not found' });
  }).listen(PORT, '127.0.0.1', () => console.log(`panel-reader on http://127.0.0.1:${PORT} (Chrome profile: ${PROFILE_DIR})`));
}
