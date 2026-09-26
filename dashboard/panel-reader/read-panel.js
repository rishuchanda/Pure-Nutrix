// Reads seller-panel pages in the PureNutrix Chrome profile (a real Chrome window
// on the Mac that the owner logged into once). Called by server.mjs for n8n.
//
// READ-ONLY: it only opens the listed pages and copies their visible text. If a
// session has expired it can log in again with the details n8n sends. It never
// clicks order/label/price/ads buttons and never solves captchas.
//
// context.config      = {platform, day, pages:[{page_kind, url, listing_id?}], wait_ms}
// context.credentials = {username, password, totp_secret?}   (optional, from the n8n credential)
export default async function ({ page, context }) {
  const cfg = context.config;
  const creds = context.credentials || {};
  const out = [];
  let loginTried = false;
  let loginError = null;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function visible(selectors) {
    for (const sel of selectors) {
      const els = await page.$$(sel);
      for (const el of els) {
        const box = await el.boundingBox();
        if (box && box.width > 0 && box.height > 0) return el;
      }
    }
    return null;
  }

  async function clickSubmit() {
    const btn = await visible(['#continue', '#signInSubmit', 'button[type=submit]', 'input[type=submit]']);
    if (btn) return btn.click();
    // fall back to a button whose text says continue / next / log in
    const clicked = await page.evaluate(() => {
      const re = /^(continue|next|log ?in|sign ?in|verify|submit)$/i;
      const b = [...document.querySelectorAll('button, [role=button]')].find((x) => re.test((x.innerText || '').trim()));
      if (b) { b.click(); return true; }
      return false;
    });
    if (!clicked) await page.keyboard.press('Enter');
  }

  async function settle() {
    try { await page.waitForNetworkIdle({ idleTime: 800, timeout: 20000 }); } catch (e) { /* SPA never idles */ }
    await sleep(cfg.wait_ms || 2500);
  }

  async function bodyText() {
    return page.evaluate(() => (document.body ? document.body.innerText : '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim());
  }

  function looksLikeLogin(url, text) {
    // Flipkart sends logged-out sellers to its "sell online" landing page instead of a login form.
    return /signin|sign-in|login|ap\/mfa|\/auth|sell-online/i.test(url)
      || /\b(sign in|log in|login)\b[\s\S]{0,300}password/i.test(text.slice(0, 3000))
      || /start selling|register now|create your supplier account/i.test(text.slice(0, 3000));
  }

  function looksLikeCaptcha(text) {
    return /captcha|enter the characters you see|i'm not a robot|verify you are human/i.test(text.slice(0, 5000));
  }

  // RFC 6238 TOTP (6 digits, 30s) using Web Crypto - for Amazon's authenticator-app 2-step verification.
  async function totp(secret) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const clean = secret.replace(/[\s=-]/g, '').toUpperCase();
    let bits = '';
    for (const ch of clean) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
    const key = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < key.length; i++) key[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    const counter = Math.floor(Date.now() / 30000);
    const msg = new Uint8Array(8);
    let c = counter;
    for (let i = 7; i >= 0; i--) { msg[i] = c & 0xff; c = Math.floor(c / 256); }
    const subtle = (globalThis.crypto || {}).subtle;
    if (!subtle) throw new Error('crypto.subtle not available for OTP');
    const k = await subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const h = new Uint8Array(await subtle.sign('HMAC', k, msg));
    const o = h[h.length - 1] & 0xf;
    const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
    return String(bin % 1000000).padStart(6, '0');
  }

  async function login() {
    loginTried = true;
    if (!creds.username || !creds.password) throw new Error('Login karna padega — PureNutrix Chrome me khud login karo (ya n8n credential me username/password daalo)');
    const user = await visible(['#ap_email', 'input[type=email]', 'input[name=email]', 'input[autocomplete=username]',
      'input[type=tel]', 'input[name=username]', 'input[type=text]']);
    const pass0 = await visible(['input[type=password]']);
    if (user && !(await user.evaluate((el) => el.value))) {
      await user.click({ clickCount: 3 });
      await user.type(creds.username, { delay: 40 });
    }
    if (!pass0) { await clickSubmit(); await settle(); }  // two-step forms (email -> next -> password)
    const pass = await visible(['#ap_password', 'input[type=password]']);
    if (!pass) throw new Error('Login page: password box not found');
    await pass.type(creds.password, { delay: 40 });
    await clickSubmit();
    await settle();
    let text = await bodyText();
    if (looksLikeCaptcha(text)) throw new Error('Captcha shown at login — ek baar khud login karo, phir dobara chalao');
    const otpBox = await visible(['#auth-mfa-otpcode', 'input[name=otpCode]', 'input[name=otp]', 'input[autocomplete=one-time-code]']);
    if (otpBox) {
      if (!creds.totp_secret) throw new Error('Login OTP maang raha hai (SMS/email OTP automatic nahi ho sakta)');
      await otpBox.type(await totp(creds.totp_secret), { delay: 40 });
      const remember = await visible(['#auth-mfa-remember-device', 'input[name=rememberDevice]']);
      if (remember) await remember.click();
      await clickSubmit();
      await settle();
      text = await bodyText();
    }
    if (looksLikeLogin(page.url(), text)) throw new Error('Login failed — username/password check karo');
  }

  for (const p of cfg.pages) {
    const item = { platform: cfg.platform, page_kind: p.page_kind, url: p.url, listing_id: p.listing_id || null, day: cfg.day };
    if (loginError) { out.push({ ...item, error: loginError }); continue; }
    try {
      // Load each page fresh: single-page apps (Flipkart) ignore a change that is only after the "#".
      await page.goto('about:blank');
      await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await settle();
      let text = await bodyText();
      if (cfg.platform !== 'listings' && looksLikeLogin(page.url(), text)) {
        if (loginTried) throw new Error('Still on the login page');
        try { await login(); } catch (e) { loginError = String(e.message || e); throw e; }
        await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await settle();
        text = await bodyText();
      }
      if (looksLikeCaptcha(text)) throw new Error('Captcha page — automatic read nahi ho sakta');
      out.push({ ...item, url: page.url(), text: text.slice(0, 250000) });
    } catch (e) {
      out.push({ ...item, error: String(e.message || e).slice(0, 300) });
    }
  }
  return { platform: cfg.platform, pages: out };
}
