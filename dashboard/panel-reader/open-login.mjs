// Opens the PureNutrix Chrome profile with all seller panels, so the owner can log in once.
//   node panel-reader/open-login.mjs
import puppeteer from 'puppeteer-core';
import { LOGIN_PAGES, startChrome } from './server.mjs';

const CHROME_PORT = Number(process.env.CHROME_DEBUG_PORT || 9222);
await startChrome();
// Works whether Chrome was just started or was already open.
const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${CHROME_PORT}`, defaultViewport: null });
for (const url of LOGIN_PAGES) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
}
await (await browser.pages())[0]?.bringToFront();
browser.disconnect();
console.log('PureNutrix Chrome khul gaya. Har tab me login karo (OTP bhi), aur Amazon me "Remember this device" tick karo.');
console.log('Login ke baad is Chrome window ko band mat karo — minimize kar sakte ho.');
