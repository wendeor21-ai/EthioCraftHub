const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  console.log('Logging in...');
  await page.goto('http://localhost:3000/login');
  await page.type('input[type="email"]', 'wendiemer123@gmail.com');
  await page.type('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  console.log('Navigating to tracking...');
  await page.goto('http://localhost:3000/orders/track');
  await page.waitForSelector('input[placeholder*="ID"]');
  await page.type('input[placeholder*="ID"]', 'EC-20260323');
  await page.click('button[type="submit"]');
  
  console.log('Waiting for crash...');
  await new Promise(r => setTimeout(r, 4000));
  
  await browser.close();
  console.log('Done test');
})();
