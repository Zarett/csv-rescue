import {test,expect} from '@playwright/test';
import {independentCells} from '../helpers/xlsx';
const path='/guides/preserve-leading-zeros/';
const title='How to Keep Leading Zeros in Excel & CSV | CSV Rescue';
const description='Excel removing leading zeros from CSV files? Learn how to preserve IDs, postal codes and text values using Excel import options or CSV-to-XLSX conversion.';

test('guide is complete static HTML with metadata, native links and no runtime scripts',async({browser,request})=>{
 const response=await request.get(path);expect(response.status()).toBe(200);const html=await response.text();expect(html).toContain('Applied Steps');expect(html).toContain('=ISTEXT(A2)');expect(html).toContain('CSV Rescue cannot reliably reconstruct it');expect(html).not.toContain('<script');expect(html).not.toContain('application/ld+json');
 expect(response.headers()['content-security-policy']).toContain("connect-src 'none'");expect(response.headers()['referrer-policy']).toBe('no-referrer');expect(response.headers()['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');expect(response.headers()['x-content-type-options']).toBe('nosniff');
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 try{await page.goto('http://127.0.0.1:4173'+path);await expect(page).toHaveTitle(title);await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',description);await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://csv-rescue-app.pages.dev'+path);await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content','article');await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content','https://csv-rescue-app.pages.dev'+path);await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('h1')).toHaveText('How to Keep Leading Zeros When Opening CSV in Excel');expect(await page.locator('h2').count()).toBeGreaterThanOrEqual(8);await expect(page.locator('pre')).toContainText('00123,000482,00007190,12345678901234567890');
 expect(requests.every(url=>url.startsWith('http://127.0.0.1:4173/'))).toBe(true);expect(requests.some(url=>/\.js(?:\?|$)/.test(url))).toBe(false);
 // Every local article link resolves, including its target fragment.
 const links=await page.locator('a').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')!).filter(href=>href.startsWith('/')||href.startsWith('#')));
 for(const href of new Set(links)){const url=new URL(href,'http://127.0.0.1:4173'+path);expect((await request.get(url.pathname)).status(),href).toBe(200);if(url.hash){const target=await context.newPage();await target.goto(url.href);await expect(target.locator(url.hash)).toHaveCount(1);await target.close();}}
 await page.getByRole('link',{name:'Convert CSV to Excel while preserving text',exact:true}).click();await expect(page).toHaveURL('/csv-to-xlsx/');await expect(page.locator('noscript')).toBeVisible();
 }finally{await context.close();}
});

test('guide is discoverable, keyboard accessible and readable on narrow screens',async({page},info)=>{
 await page.goto('/');await page.getByRole('link',{name:'How to keep leading zeros when opening CSV in Excel',exact:true}).click();await expect(page).toHaveURL(path);
 await page.goto('/csv-to-xlsx/');await page.getByRole('link',{name:'how to preserve leading zeros in Excel and CSV',exact:true}).click();await expect(page).toHaveURL(path);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await page.goto(path);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const cta=await page.getByRole('link',{name:'Convert CSV to Excel while preserving text',exact:true}).boundingBox();expect(cta!.height).toBeGreaterThanOrEqual(44);}
 await page.setViewportSize({width:320,height:900});await page.goto(path);await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();await page.keyboard.press('Enter');await expect(page).toHaveURL(path+'#main-content');
 expect(await page.locator('.guide-table').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);expect((await page.locator('.guide-table').boundingBox())!.height).toBeLessThan(500);
 await page.locator('pre').focus();await expect(page.locator('pre')).toBeFocused();await page.keyboard.press('End');await page.locator('.guide-table').focus();await expect(page.locator('.guide-table')).toBeFocused();
 await page.screenshot({path:info.outputPath('guide-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.goto(path);await page.screenshot({path:info.outputPath('guide-desktop.png'),fullPage:true});
});

test('guide route normalizes correctly and related nonexistent pages stay 404',async({request})=>{
 for(const from of [path.slice(0,-1),path+'index.html']){const response=await request.get(from+'?test=1',{maxRedirects:0});expect(response.status()).toBe(308);expect(response.headers().location).toBe(path+'?test=1');}
 for(const missing of ['/guides/','/guides/missing/','/guides/preserve-leading-zeros/missing.js','/not-released-tool/','/xls-to-csv/']){const response=await request.get(missing);expect(response.status()).toBe(404);expect(await response.text()).toContain('name="robots" content="noindex"');}
 const sitemap=await(await request.get('/sitemap.xml')).text();expect(sitemap.match(/https:\/\/csv-rescue-app.pages.dev\/guides\/preserve-leading-zeros\//g)).toHaveLength(1);
});

test('copyable article example converts exactly as documented without processing requests',async({page,context})=>{
 await page.goto(path);const csv=await page.locator('pre code').innerText();await page.getByRole('link',{name:'Convert CSV to Excel while preserving text',exact:true}).click();
 const requests:{url:string;method:string}[]=[];context.on('request',r=>requests.push({url:r.url(),method:r.method()}));
 await page.getByLabel('Select CSV for Excel conversion').setInputFiles({name:'leading-zeros.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('status')).toContainText('Ready: 3 rows');
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'Download Excel (.xlsx)',exact:true}).click();const download=await event;const stream=await download.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));const cells=independentCells(Buffer.concat(chunks));expect(cells.map(c=>c.value)).toEqual(csv.split('\n').flatMap(row=>row.split(',')));
 expect(cells.find(c=>c.address==='A2')?.value).toBe('00123');expect(cells.find(c=>c.address==='D2')?.value).toBe('12345678901234567890');expect(cells.find(c=>c.address==='E2')?.value).toBe('01/02/2026');expect(requests.every(r=>r.method==='GET'&&r.url.startsWith('http://127.0.0.1:4173/'))).toBe(true);
});
