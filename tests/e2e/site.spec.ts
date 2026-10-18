import {test,expect} from '@playwright/test';
const host='https://csv-rescue-app.pages.dev';
const routes=[
 {path:'/',title:'CSV Rescue — Free CSV Repair & Conversion Tools',h1:'Your files.Fixed and converted.'},
 {path:'/csv-repair/',title:'CSV Repair & Cleaner — Free, Private | CSV Rescue',h1:'CSV Repair & Cleaner'},
 {path:'/csv-to-xlsx/',title:'CSV to Excel Converter — Preserve Text | CSV Rescue',h1:'CSV to Excel converter'},
 {path:'/guides/preserve-leading-zeros/',title:'How to Keep Leading Zeros in Excel & CSV | CSV Rescue',h1:'How to Keep Leading Zeros When Opening CSV in Excel'}
];
test('homepage is a static two-tool directory with native navigation',async({page},info)=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Your files.Fixed and converted.');await expect(page.locator('.tool-card')).toHaveCount(2);
 await expect(page.getByRole('button',{name:/Browse files/})).toHaveCount(0);await expect(page.locator('input[type=file]')).toHaveCount(0);
 expect(requests.filter(url=>/\.js(?:\?|$)/.test(url))).toEqual([]);expect(requests.every(url=>url.startsWith('http://127.0.0.1:4173/'))).toBe(true);
 await page.screenshot({path:info.outputPath('homepage.png'),fullPage:true});
 await page.getByRole('link',{name:'Repair CSV',exact:true}).focus();await page.keyboard.press('Enter');await expect(page).toHaveURL('/csv-repair/');await expect(page.getByRole('button',{name:/Browse files/})).toBeVisible();
 await page.getByRole('link',{name:'All tools',exact:true}).click();await page.getByRole('link',{name:'Convert to Excel',exact:true}).click();await expect(page).toHaveURL('/csv-to-xlsx/');await expect(page.getByRole('button',{name:'Try sample CSV'})).toBeVisible();
});
test('all canonical pages have static content, unique metadata, social cards and one H1',async({browser,request})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();const descriptions=new Set<string>();
 try{for(const route of routes){const response=await page.goto('http://127.0.0.1:4173'+route.path);expect(response?.status()).toBe(200);await expect(page).toHaveTitle(route.title);await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('h1')).toHaveText(route.h1);
  const description=await page.locator('meta[name="description"]').getAttribute('content');expect(description!.length).toBeGreaterThan(70);descriptions.add(description!);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',host+route.path);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content',host+route.path);await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content','summary_large_image');
  const image=await page.locator('meta[property="og:image"]').getAttribute('content');expect(image).toBe(host+'/social-card.png');expect((await request.get('/social-card.png')).headers()['content-type']).toContain('image/png');
  await expect(page.locator(`a[href="${route.path==='/csv-repair/'?'/':'/csv-repair/'}"]`).first()).toBeVisible();await expect(page.locator('a[href="/csv-to-xlsx/"]').first()).toBeVisible();
  if(['/csv-repair/','/csv-to-xlsx/'].includes(route.path))await expect(page.getByText(/JavaScript is required|needs JavaScript/)).toBeVisible();
 }expect(descriptions.size).toBe(4);
 await page.goto('http://127.0.0.1:4173/');await page.getByRole('link',{name:'Repair CSV',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('CSV Repair & Cleaner');
 }finally{await context.close();}
});
test('unknown routes and missing resources return real 404 responses, not an app',async({request,page})=>{
 for(const path of ['/not-a-page/','/review/deep-link/','/csv-repair/missing/','/xlsx-to-csv/','/xls-to-csv/','/assets/missing.js','/missing.csv','/missing.html']){
  const response=await request.get(path);expect(response.status(),path).toBe(404);const html=await response.text();expect(html).toContain('name="robots" content="noindex"');expect(html).not.toContain('id="root"');expect(html).not.toContain('<script');
 }
 await page.goto('/not-a-page/');await page.getByRole('link',{name:'CSV Repair & Cleaner',exact:true}).click();await expect(page).toHaveURL('/csv-repair/');
});
test('canonical normalization preserves queries and does not redirect the homepage to repair',async({request})=>{
 for(const [from,to] of [['/index.html','/'],['/csv-repair','/csv-repair/'],['/csv-repair/index.html','/csv-repair/'],['/csv-to-xlsx','/csv-to-xlsx/'],['/csv-to-xlsx/index.html','/csv-to-xlsx/']]){
  const response=await request.get(from+'?test=1',{maxRedirects:0});expect(response.status()).toBe(308);expect(response.headers().location).toBe(to+'?test=1');
 }
 const response=await request.get('/',{maxRedirects:0});expect(response.status()).toBe(200);expect(response.headers().location).toBeUndefined();
});
test('sitemap contains exactly the four released canonical pages and all are indexable',async({request})=>{
 const response=await request.get('/sitemap.xml');expect(response.status()).toBe(200);const sitemap=await response.text();expect([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1])).toEqual(routes.map(r=>host+r.path));
 for(const {path} of routes){const response=await request.get(path);expect(response.status()).toBe(200);expect(response.headers()['x-robots-tag']||'').not.toContain('noindex');expect(await response.text()).not.toMatch(/name="robots"[^>]*noindex/);}
 const robots=await request.get('/robots.txt');expect(await robots.text()).toContain('Allow: /');expect(await robots.text()).toContain('Sitemap: '+host+'/sitemap.xml');
});
test('migrated repair hydrates cleanly, refreshes directly and retains its workflow',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/csv-repair/');await page.reload();await expect(page.locator('h1')).toHaveCount(1);
 await page.getByLabel('Choose CSV file').setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:Buffer.from('id,note\n1, original \n1, original ')});await expect(page.getByRole('button',{name:'Download CSV',exact:true})).toBeVisible();await expect(page.locator('h1')).toHaveCount(1);await page.getByRole('button',{name:'Start over'}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('CSV Repair & Cleaner');expect(errors).toEqual([]);
});
test('homepage cards remain equally usable at mobile, tablet and desktop sizes',async({page})=>{
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await page.goto('/');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const boxes=await page.locator('.tool-card').evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));expect(Math.abs(boxes[0].width-boxes[1].width)).toBeLessThan(1);for(const button of await page.locator('.tool-cta').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);}
 await page.goto('/');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
 const contrasts=await page.locator('.tool-description,.tool-limit,.home-hero>p,.privacy-band p').evaluateAll(nodes=>{const lum=(rgb:number[])=>rgb.map(c=>{const s=c/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);return nodes.map(n=>{const rgb=getComputedStyle(n).color.match(/[\d.]+/g)!.slice(0,3).map(Number);return (lum([239,247,240])+.05)/(lum(rgb)+.05);});});for(const contrast of contrasts)expect(contrast).toBeGreaterThanOrEqual(4.5);
});
