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
    { key: 'flipkart-settled', platform: 'flipkart', run: (p) => flipkartReport(p, { group: 'Payment Reports', name: 'Settled Transactions', from: daysAgo(15), to: daysAgo(1) }) },
    { key: 'meesho-orders', platform: 'meesho', run: (p) => meeshoOrders(p, { from: daysAgo(10), to: daysAgo(0) }) },
  ];
}

// One-time history: last ~90 days (marketplace limits: Amazon 30 days per file, Meesho 1 month per file).
export function backfillJobs() {
  const jobs = [];
  jobs.push({ key: 'bf-amazon-30', platform: 'amazon', run: (p) => amazonAllOrders(p, { basis: 'Order Date', range: 'P30D' }) });
  for (const [a, b] of [[89, 60], [59, 30]]) {  // older Amazon windows (30 days per file)
    jobs.push({ key: `bf-amazon-${a}-${b}`, platform: 'amazon', run: (p) => amazonAllOrders(p, { basis: 'Order Date', from: daysAgo(a), to: daysAgo(b) }) });
  }
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
  // Flipkart's picker shows last + this month; returns older than that matter less.
  jobs.push({ key: 'bf-flipkart-returns-2m', platform: 'flipkart', run: (p) => flipkartReport(p, { group: 'Fulfilment Reports', name: 'Returns', from: monthStart(new Date(Date.UTC(daysAgo(0).getUTCFullYear(), daysAgo(0).getUTCMonth() - 1, 15))), to: daysAgo(0) }) });
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
    // history jobs run once; daily jobs refresh each run but not more than every 2 hours
    const doneKey = job.key.startsWith('bf-') ? job.key : `${today()}:${job.key}`;
    const last = state[doneKey] ? Date.parse(state[doneKey]) : 0;
    const fresh = job.key.startsWith('bf-') ? !!last : Date.now() - last < 2 * 3600e3;
    if (!force && fresh) { results.push({ job: job.key, status: 'skipped', note: 'recently done' }); continue; }
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
      // merge with what's on disk: another run (e.g. a backfill) may have written meanwhile
      const merged = { ...loadState(), ...Object.fromEntries(Object.entries(state).filter(([k]) => k in state)) };
      for (const [k, v] of Object.entries(state)) if (!merged[k] || merged[k] < v) merged[k] = v;
      fs.writeFileSync(STATE, JSON.stringify(merged, null, 1));
    }
  }
  return results;
}


// ---------- live "today" counters from the panels' home pages ----------
function flipkartToday(text) {
  const num = (re) => { const m = text.match(re); return m ? m : null; };
  const units = num(/Today.s Units\s*([\d,]+)/);
  const sales = num(/Today.s Sales\s*₹\s*([\d.,]+)\s*([KkLl]?)/);
  const neworders = num(/New Orders\s*([\d,]+)/);
  const returns = num(/Today.s Returns\s*([\d,]+)/);
  if (!units || !sales) return null;
  const mult = { k: 1e3, K: 1e3, l: 1e5, L: 1e5 }[sales[2]] || 1;
  return {
    units: +units[1].replace(/,/g, ''),
    sales: Math.round(parseFloat(sales[1].replace(/,/g, '')) * mult),
    new_orders: neworders ? +neworders[1].replace(/,/g, '') : null,
    returns: returns ? +returns[1].replace(/,/g, '') : null,
  };
}

export async function liveToday(browser) {
  const cfg = env();
  const url = (process.env.REPORT_TARGET_URL || cfg.DASHBOARD_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
  const page = await browser.newPage();
  const out = [];
  try {
    await page.goto('about:blank');
    await page.goto('https://seller.flipkart.com/index.html#dashboard/home-page', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 12000));
    const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const v = flipkartToday(text);
    if (!v) throw new Error('Flipkart home: today counters not found (login?)');
    const r = await fetch(`${url}/api/agent/live`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${cfg.AUDIT_TOKEN}` },
      body: JSON.stringify({ platform: 'flipkart', ...v }) });
    if (!r.ok) throw new Error(`dashboard ${r.status}`);
    out.push({ platform: 'flipkart', status: 'ok', ...v });
  } catch (e) {
    out.push({ platform: 'flipkart', status: 'error', note: String(e.message || e) });
  } finally {
    await page.close().catch(() => {});
  }
  return out;
}
