import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log('BROWSER CONSOLE:', msg.text());
    }
  });
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  try {
    await page.goto('http://localhost:5173/admin');
    await new Promise(r => setTimeout(r, 2000));
    // Simulate passcode entry
    await page.type('input[type="password"]', 'pure2026');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.log('Puppeteer error:', e);
  } finally {
    await browser.close();
  }
})();
