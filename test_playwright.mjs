import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.type()} ${msg.text()}`));
  page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));
  
  await page.goto('http://localhost:3000');
  
  try {
    await page.fill('input[type="email"]', 'test@columbia.edu');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    console.log('Clicking on Portals');
    const portalsNav = await page.$('text=Career Portals');
    if (portalsNav) {
      await portalsNav.click();
      await page.waitForTimeout(1000);
      
      console.log('Clicking Connect to Session on first portal');
      const connectBtn = await page.$('text=Connect to Session');
      if (connectBtn) {
        await connectBtn.click();
        await page.waitForTimeout(1000);
        
        console.log('Clicking Connect Internal Session');
        const modalConnectBtn = await page.$('text=Connect Internal Session');
        if (modalConnectBtn) {
          await modalConnectBtn.click();
          await page.waitForTimeout(2000);
        } else {
           console.log('Could not find Connect Internal Session in modal');
        }
      } else {
        console.log('Could not find Connect to Session button');
      }
    } else {
      console.log('Could not find Portals navigation tab');
    }

    console.log('Testing Studio');
    const studioNav = await page.$('text=AI Cover Letter');
    if (studioNav) {
      await studioNav.click();
      await page.waitForTimeout(1000);

      console.log('Clicking Synthesize');
      const synthBtn = await page.$('text=Synthesize Cover Letter');
      if (synthBtn) {
         await synthBtn.click();
         await page.waitForTimeout(2000);
      } else {
         console.log('Could not find Synthesize button');
      }
    }
  } catch (err) {
    console.error("Test script error:", err);
  }
  
  await browser.close();
})();
