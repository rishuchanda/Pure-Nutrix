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
    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 2000));
    // Simulate mouse move
    await page.mouse.move(100, 100);
    await new Promise(r => setTimeout(r, 500));
    await page.mouse.move(200, 200);
    await new Promise(r => setTimeout(r, 1000));
  } catch (e) {
    console.log('Puppeteer error:', e);
  } finally {
    await browser.close();
  }
})();
