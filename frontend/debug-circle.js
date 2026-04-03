const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1464, height: 735 });
    await page.goto('http://localhost:5173/');
    
    // Wait for the app to load
    await page.waitForSelector('button.login-pill-nav', { visible: true });
    
    // Click the login button
    await page.click('button.login-pill-nav');
    
    // Wait a brief moment for the modal and animations
    await new Promise(r => setTimeout(r, 1000));
    
    // Find any huge element or the modal
    const elementsInfo = await page.evaluate(() => {
        const result = [];
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            // We're looking for elements causing a giant black semi circle.
            // So we'll check elements that have width > 300 and border-radius > 0
            const style = getComputedStyle(el);
            if (rect.width > 300 && parseInt(style.borderRadius) > 20) {
                result.push({
                    tagName: el.tagName,
                    className: el.className,
                    width: rect.width,
                    height: rect.height,
                    borderRadius: style.borderRadius,
                    bgColor: style.backgroundColor,
                    bgImage: style.backgroundImage,
                    zIndex: style.zIndex,
                    position: style.position,
                    top: style.top,
                    bottom: style.bottom
                });
            }
        });
        return result;
    });

    console.log(JSON.stringify(elementsInfo, null, 2));
    
    await browser.close();
})();
