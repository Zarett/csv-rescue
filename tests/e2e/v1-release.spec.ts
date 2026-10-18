import {test,expect} from '@playwright/test';
test('production direct navigation loads local assets with security headers',async({page,request})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const response=await page.goto('/csv-repair/');expect(response?.status()).toBe(200);
 await expect(page.getByRole('button',{name:/Browse files/})).toBeVisible();
 const assets=await page.locator('script[src],link[rel="stylesheet"],link[rel="icon"]').evaluateAll(elements=>elements.map(el=>el.getAttribute('src')||el.getAttribute('href')!));
 expect(assets.length).toBeGreaterThanOrEqual(3);
 for(const asset of assets){expect(asset).toMatch(/^\//);const response=await request.get(asset);expect(response.status()).toBe(200);expect(response.headers()['x-content-type-options']).toBe('nosniff');}
 const notices=await request.get('/THIRD_PARTY_NOTICES.txt');expect(notices.status()).toBe(200);expect(await notices.text()).toContain('papaparse');
 await page.getByRole('link',{name:'CSV Rescue home',exact:true}).click();await expect(page).toHaveURL('/');expect(errors).toEqual([]);
});
test('export modes default to preserving negative values and never mutate working data or original bytes',async({page})=>{
 await page.goto('/csv-repair/');const source=Buffer.from('\uFEFFid,age,amount,note\r\n1,-5,-12.50,"Español 😀, quoted"\r\n2,0,1,"=SUM(1,2)"\r\n');
 await page.getByLabel('Choose CSV file').setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:source});
 const preserve=page.getByRole('radio',{name:'Data-preserving export',exact:true});const safe=page.getByRole('radio',{name:'Spreadsheet-safe export',exact:true});
 await expect(preserve).toBeChecked();await expect(safe).not.toBeChecked();
 async function exported(original=false){const promise=page.waitForEvent('download');await page.getByRole('button',{name:original?'Download original unchanged':'Download CSV',exact:true}).click();const stream=await(await promise).createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks);}
 const normal=await exported();expect(normal.toString()).toContain('1,-5,-12.50,');expect(normal.toString()).not.toContain("'-5");
 await safe.check();await expect(page.getByText(/3 values will gain an apostrophe/)).toBeVisible();
 const protectedBytes=await exported();expect(protectedBytes.toString()).toContain("'-5");expect(protectedBytes.toString()).toContain("'-12.50");expect(await exported(true)).toEqual(source);
 await preserve.check();expect(await exported()).toEqual(normal);
 await page.getByRole('link',{name:'3 Preview',exact:true}).click();await page.getByRole('button',{name:'After',exact:true}).click();
 await expect(page.getByRole('cell',{name:'-5',exact:true})).toBeVisible();await expect(page.getByRole('cell',{name:'-12.50',exact:true})).toBeVisible();
});
