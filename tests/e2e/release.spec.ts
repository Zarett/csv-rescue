import { test, expect } from '@playwright/test';
test('readable secondary text and responsive layout at narrow, tablet and desktop widths',async ({page})=>{
  for(const width of [320,768,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto('/csv-repair/');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const contrasts = await page.evaluate(()=>{
      const luminance=(rgb:number[])=>rgb.map(c=>{const s=c/255;return s<=0.04045?s/12.92:((s+0.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
      return ['.intro p','.file-hint','.local-note','.steps p','.privacy','footer'].map(selector=>{
        const color=getComputedStyle(document.querySelector(selector)!).color.match(/[\d.]+/g)!.slice(0,3).map(Number);
        return {selector,ratio:(luminance([248,250,249])+0.05)/(luminance(color)+0.05)};
      });
    });
    for(const c of contrasts) expect(c.ratio,`${c.selector} contrast at ${width}px`).toBeGreaterThanOrEqual(4.5);
  }
});
test('processes untrusted data without network requests or browser storage', async ({page}) => {
  const failures: string[] = [];
  page.on('pageerror',e=>failures.push(e.message));
  const response = await page.goto('/csv-repair/'); await page.waitForLoadState('networkidle');
  expect(response?.headers()['content-security-policy']).toContain("connect-src 'none'");
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  const requests: string[] = [];
  page.on('request',req=>{if(/^https?:/.test(req.url())) requests.push(req.url());});
  const source = 'name,note\nAlpha,"<img src=x onerror=alert(1)>"\nAlpha,"<img src=x onerror=alert(1)>"\n,""\n,""';
  await page.getByLabel('Choose CSV file').setInputFiles({name:'untrusted.csv',mimeType:'text/csv',buffer:Buffer.from(source)});
  await page.getByRole('link',{name:'2 Clean',exact:true}).click();
  await page.getByRole('link',{name:'3 Preview',exact:true}).click();
  await expect(page.getByRole('cell',{name:'<img src=x onerror=alert(1)>',exact:true}).first()).toBeVisible();
  await expect(page.locator('tbody img')).toHaveCount(0);
  for(const toggle of await page.getByRole('switch').all()) await expect(toggle).not.toBeChecked();
  await page.getByRole('switch',{name:/Remove duplicate rows/}).check();
  await page.getByRole('button',{name:'After',exact:true}).click();
  await expect(page.getByText('Showing 3 of 3 data rows.',{exact:false})).toBeVisible();
  const dl = page.waitForEvent('download'); await page.getByRole('button',{name:'Download CSV',exact:true}).click();
  const stream = await (await dl).createReadStream(); let bytes=''; for await(const chunk of stream!) bytes+=chunk;
  expect(bytes).toContain('<img src=x onerror=alert(1)>');
  expect(bytes.endsWith('"",""\r\n"",""')).toBe(true);
  await page.getByRole('button',{name:'Start over'}).click();
  await expect(page.getByText('untrusted.csv',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookies:document.cookie}))).toEqual({local:0,session:0,cookies:''});
  expect(await page.evaluate(async()=> (await indexedDB.databases()).length)).toBe(0);
  expect(requests).toEqual([]); expect(failures).toEqual([]);
});
test('blank file error, keyboard navigation, and wide preview remain usable',async ({page})=>{
  await page.goto('/csv-repair/');
  await page.keyboard.press('Tab'); await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
  await page.getByLabel('Choose CSV file').setInputFiles({name:'blank.csv',mimeType:'text/csv',buffer:Buffer.from('\n')});
  await expect(page.getByRole('alert')).toContainText('empty');
  const rows = Array.from({length:110},(_,r)=>Array.from({length:16},(_,c)=>`value ${r}:${c}`).join(',')).join('\n');
  await page.getByLabel('Choose CSV file').setInputFiles({name:'wide.csv',mimeType:'text/csv',buffer:Buffer.from(rows)});
  await page.getByRole('link',{name:'3 Preview',exact:true}).click();
  await expect(page.getByText('Showing 100 of 109 data rows.',{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.getByLabel('Scrollable CSV preview').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
  await page.getByLabel('First row contains headers').uncheck();
  await expect(page.getByText('All records are treated as data.',{exact:false})).toBeVisible();
});
