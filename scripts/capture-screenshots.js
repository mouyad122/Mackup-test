const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const outDir = '/home/moayad/.gemini/antigravity/brain/d9a7201f-5c8a-4284-8c7a-54d6b0efc7f1/screenshots';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  
  // Desktop
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopContext.newPage();
  
  try {
    await desktopPage.goto('http://localhost:3000/ar', { waitUntil: 'networkidle' });
    await desktopPage.screenshot({ path: path.join(outDir, 'desktop-home-top.png') });
    
    await desktopPage.evaluate(() => window.scrollBy(0, 900));
    await desktopPage.waitForTimeout(1000); // let animations settle
    await desktopPage.screenshot({ path: path.join(outDir, 'desktop-home-middle.png') });

    await desktopPage.goto('http://localhost:3000/ar/shop', { waitUntil: 'networkidle' });
    await desktopPage.screenshot({ path: path.join(outDir, 'desktop-shop.png'), fullPage: true });
  } catch(e) {
    console.error(e);
  }

  // Desktop 1920
  const xlContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const xlPage = await xlContext.newPage();
  try {
    await xlPage.goto('http://localhost:3000/ar', { waitUntil: 'networkidle' });
    await xlPage.screenshot({ path: path.join(outDir, 'desktop-1920-home-top.png') });
  } catch(e) {
    console.error(e);
  }

  // Mobile
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobilePage = await mobileContext.newPage();
  
  try {
    await mobilePage.goto('http://localhost:3000/ar', { waitUntil: 'networkidle' });
    await mobilePage.screenshot({ path: path.join(outDir, 'mobile-home.png'), fullPage: true });

    // Open mobile nav
    await mobilePage.click('button[aria-label="فتح القائمة"]');
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({ path: path.join(outDir, 'mobile-nav-open.png') });
    
    await mobilePage.goto('http://localhost:3000/ar/shop', { waitUntil: 'networkidle' });
    await mobilePage.screenshot({ path: path.join(outDir, 'mobile-shop.png'), fullPage: true });
  } catch(e) {
    console.error(e);
  }

  await browser.close();
  console.log('Screenshots captured successfully.');
})();
