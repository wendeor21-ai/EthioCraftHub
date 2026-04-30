const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Logging in...');
    await page.goto('http://localhost:3000/login');
    await page.type('input[type="email"]', 'wendiemer123@gmail.com');
    await page.type('input[type="password"]', 'Password123!');
    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]')
    ]);
    
    console.log('Navigating to tracking...');
    await page.goto('http://localhost:3000/orders/track');
    await page.waitForSelector('input[placeholder*="ID"]');
    await page.type('input[placeholder*="ID"]', 'EC-20260324-29365');
    
    console.log('Tracking order...');
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/orders/') && response.status() === 200),
      page.click('button[type="submit"]')
    ]);
    
    // Wait a moment for rendering and animations
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'C:/Users/Wendie/.gemini/antigravity/brain/f9053b15-328e-4ad6-a614-ee8f30b9d36f/tracking_redesign_v2.png', fullPage: true });
    
    await browser.close();
    console.log('Done test');
  } catch(e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
