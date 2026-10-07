const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const fs = require('fs');
const base = process.env.BLOG_BASE_URL || 'http://127.0.0.1:1313';
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE || undefined});
 const context = await browser.newContext({viewport:{width:1440,height:1050},deviceScaleFactor:1,colorScheme:'light'});
 const page = await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 const check = (condition,name) => {if(!condition)throw new Error(name);console.log('PASS '+name)};
 await page.goto(base + '/',{waitUntil:'networkidle'});
 fs.mkdirSync('.artifacts',{recursive:true});
 await page.screenshot({path:'.artifacts/home-desktop.png',fullPage:true});
 check(await page.locator('h1').textContent().then(x=>x.includes('保持好奇')),'home hero');
 check(await page.locator('.post-card').count()===6,'home article count');
 await page.click('[data-home-filter="技术"]'); check(await page.locator('#home-posts .post-card:visible').count()===3,'home category filtering');
 await page.click('[data-action="search"]'); await page.fill('#search-input','循环'); await page.waitForTimeout(300);
 check(await page.locator('.search-result').count()===1,'full text search');
 await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForURL('**/posts/agent-loop/');
 check(await page.locator('.article-toc a').count()>=4,'article table of contents');
 await page.screenshot({path:'.artifacts/article-desktop.png',fullPage:true});
 await page.click('[data-action="font-up"]'); check(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--article-size'))==='18px','font control');
 await page.click('[data-action="focus"]'); check(await page.locator('body').getAttribute('class').then(x=>x.includes('focus-mode')),'focus mode'); await page.click('[data-action="focus"]');
 await page.click('.article-tools [data-bookmark]'); check(await page.locator('.article-tools [data-bookmark]').getAttribute('aria-pressed')==='true','article bookmark');
 await page.goto(base + '/bookmarks/'); check(await page.locator('.saved-row').count()===1,'bookmark persistence'); await page.reload(); check(await page.locator('.saved-row').count()===1,'bookmark reload persistence');
 await page.click('.saved-row button'); check(await page.locator('.saved-row').count()===0,'bookmark removal');
 await page.goto(base + '/posts/'); check(await page.locator('#post-list .post-card').count()===9,'all nine posts');
 await page.fill('#post-search','不存在的内容'); check(await page.locator('#list-empty').isVisible(),'empty state'); await page.click('[data-action="reset-filters"]'); check(await page.locator('#post-list .post-card:visible').count()===9,'reset filters');
 await page.selectOption('#post-sort','oldest'); check(await page.locator('#post-list .post-card').first().getAttribute('data-title')==='Hello World','article ordering');
 await page.click('[data-action="theme"]'); check(await page.locator('html').getAttribute('data-theme')==='dark','dark mode'); await page.reload(); check(await page.locator('html').getAttribute('data-theme')==='dark','theme persistence');
 await page.screenshot({path:'.artifacts/writing-dark.png',fullPage:true}); await page.click('[data-action="theme"]');
 await page.goto(base + '/library/'); await page.click('[data-book-filter="在读"]'); check(await page.locator('.book-card:visible').count()===2,'book filtering'); await page.locator('.book-card:visible summary').first().click(); check(await page.locator('.book-card:visible details[open]').count()===1,'reading note disclosure');
 await page.goto(base + '/notes/'); await page.click('[data-note-filter="技术"]'); check(await page.locator('.note-card:visible').count()===1,'notes filter');
 await page.goto(base + '/gallery/'); await page.locator('[data-photo]').first().click(); check(await page.locator('#photo-dialog').isVisible(),'photo lightbox'); await page.keyboard.press('Escape'); check(!await page.locator('#photo-dialog').isVisible(),'dialog escape');
 await page.goto(base + '/lab/'); await page.click('#timer-start'); await page.waitForTimeout(1150); check(await page.locator('#timer').textContent()==='24:59','timer tick'); await page.click('#timer-start'); await page.click('#timer-reset'); check(await page.locator('#timer').textContent()==='25:00','timer reset'); await page.click('[data-minutes="5"]'); check(await page.locator('#timer').textContent()==='05:00','timer break mode');
 const before=await page.locator('#palette').textContent();await page.click('#new-palette');check(before!==await page.locator('#palette').textContent(),'palette change');
 await page.fill('#markdown-input','# 测试标题\n\n**测试内容**\n\n<img src=x onerror=alert(1)>'); check(await page.locator('#markdown-preview h1').textContent()==='测试标题','markdown render');check(await page.locator('#markdown-preview img').count()===0,'markdown injection escaping');await page.reload();check(await page.locator('#markdown-input').inputValue().then(x=>x.includes('测试标题')),'draft persistence');
 await page.evaluate(()=>localStorage.removeItem('garden-markdown')); await page.reload(); await page.screenshot({path:'.artifacts/lab-desktop.png',fullPage:true});
 await page.locator('.terminal-launch').click(); await page.fill('#terminal-input','help'); await page.locator('#terminal-input').press('Enter'); check(await page.locator('#terminal-output').textContent().then(x=>x.includes('random')),'terminal help'); await page.fill('#terminal-input','<img src=x>'); await page.locator('#terminal-input').press('Enter'); check(await page.locator('#terminal-output img').count()===0,'terminal escaping'); await page.fill('#terminal-input','cd /notes'); await page.locator('#terminal-input').press('Enter'); await page.waitForURL('**/notes/');check(true,'terminal navigation');
 const routes=['/','/posts/','/notes/','/projects/','/library/','/gallery/','/links/','/about/','/lab/','/bookmarks/','/archives/','/now/','/colophon/','/search/','/tags/','/categories/','/posts/hello-world/'];
 for(const route of routes){await page.goto(base+route);check(await page.locator('h1').count()>=1,'route '+route); const broken=await page.locator('img[src]').evaluateAll(imgs=>imgs.filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src));check(!broken.length,'images '+route+' '+broken.join(','));check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'desktop overflow '+route);}
 await page.setViewportSize({width:390,height:844});
 for(const route of routes){await page.goto(base+route);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow '+route);}
 await page.goto(base + '/');await page.screenshot({path:'.artifacts/home-mobile.png',fullPage:true});await page.click('.mobile-menu');check(await page.locator('body').getAttribute('class').then(x=>x.includes('menu-open')),'mobile menu');await page.locator('.nav-item[href="/posts/"]').click();await page.waitForURL('**/posts/');check(true,'mobile navigation');
 check(!errors.length,'no browser runtime errors: '+errors.join('; '));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

