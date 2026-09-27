// Which reports to fetch, and bookkeeping so that several runs a day (retries) only
// re-try what hasn't succeeded yet today.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { amazonAllOrders, daysAgo, flipkartReport, meeshoOrders, prepareDownloads, uploadAndDelete } from './reports.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const STATE = path.join(ROOT, 'data', 'report-state.json');

function env() {
  const out = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].split(' #')[0].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const monthStart = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const monthEnd = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
const today = () => daysAgo(0).toISOString().slice(0, 10);

// Each job: key (unique per day), platform, fn(page) -> file path
export function dailyJobs() {
  return [
    { key: 'amazon-orders', platform: 'amazon', run: (p) => amazonAllOrders(p, { basis: 'Last Updated Date', range: 'P3D' }) },
    { key: 'flipkart-orders', platform: 'flipkart', run: (p) => flipkartReport(p, { group: 'Fulfilment Reports', name: 'Orders', from: daysAgo(10), to: daysAgo(0) }) },
    { key: 'flipkart-sales', platform: 'flipkart', run: (p) => flipkartReport(p, { group: 'Tax Reports', name: 'Sales Report', from: daysAgo(13), to: daysAgo(3) }) },
    { key: 'flipkart-returns', platform: 'flipkart', run: (p) => flipkartReport(p, { group: 'Fulfilment Reports', name: 'Returns', from: daysAgo(30), to: daysAgo(0) }) },
    { key: 'meesho-orders', platform: 'meesho', run: (p) => meeshoOrders(p, { from: daysAgo(10), to: daysAgo(0) }) },
  ];
}

// One-time history: last ~90 days (marketplace limits: Amazon 30 days per file, Meesho 1 month per file).
export function backfillJobs() {
  const jobs = [];
  jobs.push({ key: 'bf-amazon-30', platform: 'amazon', run: (p) => amazonAllOrders(p, { basis: 'Order Date', range: 'P30D' }) });
  for (const back of [2, 1]) {  // two previous full months
    const ref = new Date(Date.UTC(daysAgo(0).getUTCFullYear(), daysAgo(0).getUTCMonth() - back, 15));
    const from = monthStart(ref), to = monthEnd(ref), tag = from.toISOString().slice(0, 7);
    jobs.push({ key: `bf-flipkart-orders-${tag}`, platform: 'flipkart', run: (p) => flipkartReport(p, { group: 'Fulfilment Reports', name: 'Orders', from, to }) });
    jobs.push({ key: `bf-flipkart-sales-${tag}`, platform: 'flipkart', run: (p) => flipkartReport(p, { group: 'Tax Reports', name: 'Sales Report', from, to }) });
    jobs.push({ key: `bf-meesho-orders-${tag}`, platform: 'meesho', run: (p) => meeshoOrders(p, { from, to }) });
  }
  const from = monthStart(daysAgo(0));
  jobs.push({ key: 'bf-flipkart-orders-mtd', platform: 'flipkart', run: (p) => flipkartReport(p, { group: 'Fulfilment Reports', name: 'Orders', from, to: daysAgo(0) }) });
  jobs.push({ key: 'bf-flipkart-sales-mtd', platform: 'flipkart', run: (p) => flipkartReport(p, { group: 'Tax Reports', name: 'Sales Report', from, to: daysAgo(3) }) });
  jobs.push({ key: 'bf-flipkart-returns-90', platform: 'flipkart', run: (p) => flipkartReport(p, { group: 'Fulfilment Reports', name: 'Returns', from: daysAgo(89), to: daysAgo(0) }) });
  jobs.push({ key: 'bf-meesho-orders-mtd', platform: 'meesho', run: (p) => meeshoOrders(p, { from, to: daysAgo(0) }) });
  return jobs;
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return {}; }
}

export async function runJobs(browser, jobs, { force = false, only = null } = {}) {
  const cfg = env();
  // REPORT_TARGET_URL lets a one-off run load into another dashboard (e.g. the local copy).
  const target = { url: (process.env.REPORT_TARGET_URL || cfg.DASHBOARD_URL || 'http://127.0.0.1:8765').replace(/\/$/, ''), token: cfg.AUDIT_TOKEN };
  await prepareDownloads(browser);
  const state = loadState();
  const results = [];
  for (const job of jobs) {
    if (only && !only.includes(job.platform)) continue;
    const doneKey = job.key.startsWith('bf-') ? job.key : `${today()}:${job.key}`;
    if (!force && state[doneKey]) { results.push({ job: job.key, status: 'skipped', note: 'already done' }); continue; }
    const page = await browser.newPage();
    try {
      const file = await job.run(page);
      const up = await uploadAndDelete(file, job.platform, target);
      const rows = (up.results || []).reduce((n, r) => n + (r.rows || 0), 0);
      state[doneKey] = new Date().toISOString();
      results.push({ job: job.key, status: 'ok', rows, kinds: (up.results || []).map((r) => r.kind) });
    } catch (e) {
      results.push({ job: job.key, status: 'error', note: String(e.message || e).slice(0, 300) });
    } finally {
      await page.close().catch(() => {});
      fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
    }
  }
  return results;
}
