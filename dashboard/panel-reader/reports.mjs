// Downloads the official order/return/payment reports from the seller panels, in the
// owner's logged-in "PureNutrix Chrome", and hands each file to the dashboard importer.
//
// What it clicks: report-page tabs, date pickers, "Request"/"Submit"/"Export data" (these only
// ask the marketplace to prepare a file) and "Download". It never touches orders, prices,
// listings or ads. Downloaded files contain buyer details, so each file is uploaded to the
// dashboard (which keeps only the business columns) and then deleted from the Mac.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DOWNLOAD_DIR = path.join(HERE, '..', 'data', 'downloads');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ---------- helpers ----------
export async function prepareDownloads(browser) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  const cdp = await browser.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOAD_DIR, eventsEnabled: true });
}

const snapshotDir = () => new Set(fs.readdirSync(DOWNLOAD_DIR));

async function waitForNewFile(before, timeoutMs = 90000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    await sleep(1500);
    const fresh = fs.readdirSync(DOWNLOAD_DIR).filter((f) => !before.has(f));
    const done = fresh.filter((f) => !/\.(crdownload|tmp|download)$/.test(f));
    if (done.length && fresh.length === done.length) return path.join(DOWNLOAD_DIR, done[0]);
  }
  throw new Error('download did not finish');
}

async function gotoFresh(page, url, wait = 9000) {
  await page.goto('about:blank');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(wait);
  const text = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  if (/sign in|log in|login/i.test(page.url()) || /start selling|create your supplier account|enter your password/i.test(text)) {
    throw new Error('Login karna padega — PureNutrix Chrome me dobara login karo');
  }
}

async function clickByText(page, selector, pattern, { last = false } = {}) {
  const ok = await page.evaluate((selector, src, last) => {
    const re = new RegExp(src);
    const els = [...document.querySelectorAll(selector)].filter((e) => e.getBoundingClientRect().width > 0 && re.test((e.innerText || e.value || '').trim()));
    const el = last ? els[els.length - 1] : els[0];
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, selector, pattern.source, last);
  if (!ok) throw new Error(`button not found: ${pattern}`);
}

const fmt = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() + 5.5 * 3600e3 - n * 86400e3);  // IST calendar day

// ---------- Amazon: Order reports → All Orders (FBA + seller-fulfilled) ----------
export async function amazonAllOrders(page, { basis = 'Last Updated Date', range = 'P3D' } = {}) {
  await gotoFresh(page, 'https://sellercentral.amazon.in/order-reports-and-feeds/reports/allOrders', 9000);
  await page.evaluate((basis, range) => {
    const radio = [...document.querySelectorAll('input[type=radio]')].find((r) => (r.closest('label')?.innerText || '').trim().startsWith(basis));
    if (radio) radio.click();
    const sel = [...document.querySelectorAll('select')].find((s) => s.name.includes('allOrders'));
    sel.value = range;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, basis, range);
  await sleep(1200);
  const topBefore = await page.evaluate(() => ([...document.querySelectorAll('table tr')][1]?.innerText || '').replace(/\s+/g, ' '));
  await page.click('#a-autoid-1-announce');
  const before = snapshotDir();
  for (let i = 0; i < 40; i++) {
    await sleep(8000);
    await page.click('#refreshButton-announce').catch(() => {});
    await sleep(3000);
    const row = await page.evaluate(() => ([...document.querySelectorAll('table tr')][1]?.innerText || '').replace(/\s+/g, ' '));
    if (row && row !== topBefore && /Ready/.test(row)) {
      await page.evaluate(() => [...[...document.querySelectorAll('table tr')][1].querySelectorAll('a')].find((a) => /download/i.test(a.innerText)).click());
      return waitForNewFile(before);
    }
  }
  throw new Error('Amazon report was not ready in time');
}

// ---------- Flipkart: Reports → Request New Report ----------
async function flipkartPickRange(page, from, to) {
  // open picker → "custom" → click start day, then end day in the two-month calendar
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')].filter((e) => e.innerText && /^\w{3} \d\d, \d{4}\s*-\s*\w{3} \d\d, \d{4}/.test(e.innerText.trim()) && e.getBoundingClientRect().width > 0);
    els[els.length - 1].click();
  });
  await sleep(1500);
  await clickByText(page, 'button, div, span', /^custom$/, { last: true });
  await sleep(1500);
  for (const d of [from, to]) {
    const title = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    const ok = await page.evaluate((title, day) => {
      const header = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === title);
      if (!header) return false;
      let box = header.parentElement;
      while (box && !/\b31\b|\b30\b/.test(box.innerText)) box = box.parentElement;  // the month's grid
      const cell = [...box.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === String(day) && e.getBoundingClientRect().width > 0);
      if (!cell) return false;
      cell.click();
      return true;
    }, title, d.getUTCDate());
    if (!ok) throw new Error(`Flipkart calendar: ${title} ${d.getUTCDate()} not clickable`);
    await sleep(800);
  }
}

export async function flipkartReport(page, { group, name, from, to }) {
  await gotoFresh(page, 'https://seller.flipkart.com/index.html#dashboard/metrics/report-centre', 10000);
  const label = `${from.toDateString()}→${to.toDateString()}`;
  await clickByText(page, 'button', /^Request New Report$/); await sleep(2500);
  await clickByText(page, 'button', new RegExp(`^${group}$`)); await sleep(2500);
  await page.evaluate((name) => {
    const cards = [...document.querySelectorAll('div')].filter((d) => new RegExp(`^\\s*\\d+\\s*${name}\\s*(New)?\\s*\\n`).test(d.innerText));
    const card = cards[cards.length - 1];
    [...card.querySelectorAll('button')].find((b) => /REQUEST REPORT/.test(b.innerText)).click();
  }, name);
  await sleep(2500);
  await flipkartPickRange(page, from, to);
  await clickByText(page, 'button', /^SUBMIT$/); await sleep(4000);
  // the new request appears at the top of the "Requested" list; wait until it's Generated
  const before = snapshotDir();
  for (let i = 0; i < 45; i++) {
    await gotoFresh(page, 'https://seller.flipkart.com/index.html#dashboard/metrics/report-centre', 8000);
    const row = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('tr, [role=row], [class*=ow]')].filter((r) => /Generated|In Progress|Requested|Queued/i.test(r.innerText) && r.querySelector('button'));
      return rows.length ? rows[0].innerText.replace(/\s+/g, ' ') : '';
    });
    if (new RegExp(name.split(' ')[0], 'i').test(row) && /Generated/.test(row)) {
      await page.evaluate(() => {
        const rows = [...document.querySelectorAll('tr, [role=row], [class*=ow]')].filter((r) => /Generated/.test(r.innerText) && r.querySelector('button'));
        [...rows[0].querySelectorAll('button')].find((b) => /Download/.test(b.innerText)).click();
      });
      return waitForNewFile(before);
    }
    await sleep(15000);
  }
  throw new Error(`Flipkart ${name} report (${label}) was not generated in time`);
}

// ---------- Meesho: Orders → Download Orders Data ----------
export async function meeshoOrders(page, { from, to, supplier = 'jpsyo' }) {
  await gotoFresh(page, `https://supplier.meesho.com/panel/v3/new/fulfillment/${supplier}/orders/pending`, 9000);
  const exportedBefore = async () => page.evaluate(() => {
    const t = document.body.innerText; const i = t.indexOf('EXPORTED FILES'); return i < 0 ? '' : t.slice(i, i + 400);
  });
  await clickByText(page, 'button, a, div, span', /^Download Orders Data$/, { last: true }); await sleep(2500);
  const listBefore = await exportedBefore();
  await clickByText(page, '*', /^Select Date Range$/, { last: true }); await sleep(2000);
  for (const d of [from, to]) {
    // day buttons are labelled like "Tue Sep 01 2026"; step months with the Previous/Next buttons
    const label = `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${String(d.getUTCDate()).padStart(2, '0')} ${d.getUTCFullYear()}`;
    for (let k = 0; k < 14; k++) {
      if (await page.$(`button[aria-label="${label}"]`)) break;
      const shown = await page.evaluate(() => document.querySelector('button[aria-label$=" 15 2026"], button[aria-label*=" 15 "]')?.getAttribute('aria-label') || '');
      const shownDate = shown ? new Date(shown) : new Date();
      const wantFirst = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 15));
      await page.click(`button[aria-label="${shownDate > wantFirst ? 'Previous month' : 'Next month'}"]`);
      await sleep(600);
    }
    const btn = await page.$(`button[aria-label="${label}"]`);
    if (!btn) throw new Error(`Meesho calendar: ${label} not found`);
    await btn.click();
    await sleep(800);
  }
  await clickByText(page, 'button', /^Export data$/); await sleep(4000);
  const before = snapshotDir();
  for (let i = 0; i < 40; i++) {
    await gotoFresh(page, `https://supplier.meesho.com/panel/v3/new/fulfillment/${supplier}/orders/pending`, 7000);
    await clickByText(page, 'button, a, div, span', /^Download Orders Data$/, { last: true }); await sleep(2500);
    const list = await exportedBefore();
    if (list && !/No file yet/.test(list)) {
      // newest exported file is listed first; its download control is the first link/button under EXPORTED FILES
      const want = `${fmt(from)}_${fmt(to)}`;  // Meesho names exports "<from>_<to>_<created>"
      const clicked = await page.evaluate((want) => {
        const box = [...document.querySelectorAll('div')].filter((d) => /EXPORTED FILES/.test(d.innerText)).pop();
        const row = [...box.querySelectorAll('div')].find((d) => d.innerText.includes(want) && /Download/.test(d.innerText) && d.querySelector('img'));
        const dl = row && [...row.querySelectorAll('span')].find((e) => e.innerText.trim() === 'Download');
        if (!dl) return false;
        dl.parentElement.click();
        return true;
      }, want);
      if (clicked) return waitForNewFile(before);
    }
    await sleep(15000);
  }
  throw new Error('Meesho export was not ready in time');
}

// ---------- hand a file to the dashboard, then delete it ----------
export async function uploadAndDelete(file, platform, { url, token }) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(file)]), path.basename(file));
  form.append('platform', platform);
  try {
    const r = await fetch(`${url}/api/agent/upload`, { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.detail || `upload failed ${r.status}`);
    return body;
  } finally {
    fs.rmSync(file, { force: true });
  }
}

export { daysAgo, fmt };
