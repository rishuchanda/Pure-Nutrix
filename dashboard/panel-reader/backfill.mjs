// One-off: load ~90 days of history.  REPORT_TARGET_URL=http://127.0.0.1:8765 node backfill.mjs
import puppeteer from 'puppeteer-core';
import { startChrome } from './server.mjs';
import { backfillJobs, runJobs } from './report-jobs.mjs';
await startChrome();
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
const results = await runJobs(b, backfillJobs(), { force: process.argv.includes('--force') });
for (const r of results) console.log(JSON.stringify(r));
b.disconnect();
