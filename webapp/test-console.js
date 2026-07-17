import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  await page.goto('http://localhost:4173');
  await new Promise(r => setTimeout(r, 1000));
  await page.mouse.move(200, 200);
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
