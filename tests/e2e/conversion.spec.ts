import {test,expect,type Page} from '@playwright/test';
import {independentCells} from '../helpers/xlsx';
import Papa from 'papaparse';
async function bytes(page:Page,name:string){const event=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();const download=await event;const stream=await download.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));return {download,bytes:Buffer.concat(chunks)};}

test('provider MIME and filenames convert unchanged; replacement, reselection and empty picker events retain correct state',async({page},info)=>{
 await page.goto('/csv-to-xlsx/');const picker=page.getByLabel('Select CSV for Excel conversion');await expect(picker).not.toHaveAttribute('accept');
 const source=Buffer.from('id,note\n00123,"  müşteri 😀  "\n12345678901234567890,-12.50\n');
 for(const name of ['test.csv','csv_rescue_stress_test.csv','csv_rescue_stress_test_cleaned.csv','csv_rescue_stress_test_cleaned (1).csv','very-long-csv-filename-with-multiple-sections.csv','müşteri_verileri_2026.csv','report.CSV','report.csv.csv'])for(const mimeType of ['text/csv','text/plain','application/octet-stream','']){
  await picker.setInputFiles({name,mimeType,buffer:source});await expect(page.locator('.selected-file')).toContainText(name);await expect(page.getByRole('button',{name:'Download Excel (.xlsx)'})).toHaveCount(0);await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('status')).toContainText('Ready: 3 rows');
  expect(independentCells((await bytes(page,'Download Excel (.xlsx)')).bytes).map(c=>c.value)).toEqual(['id','note','00123','  müşteri 😀  ','12345678901234567890','-12.50']);
 }
 await picker.setInputFiles([]);await expect(page.locator('.selected-file')).toContainText('report.csv.csv');await expect(page.getByRole('button',{name:'Download Excel (.xlsx)'})).toBeVisible();expect((await bytes(page,'Download original unchanged')).bytes).toEqual(source);
 await picker.setInputFiles({name:'broken.csv',mimeType:'text/plain',buffer:Buffer.from('a,b\n1,"open')});await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Malformed CSV');await picker.setInputFiles([]);await expect(page.getByRole('alert')).toContainText('Malformed CSV');
 const replacement={name:'report.CSV',mimeType:'',buffer:source};await picker.setInputFiles(replacement);await expect(page.getByRole('alert')).toHaveCount(0);await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('status')).toContainText('Ready:');
 await picker.setInputFiles(replacement);await expect(page.getByRole('button',{name:'Download Excel (.xlsx)'})).toHaveCount(0);await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('status')).toContainText('Ready:');await (await bytes(page,'Download Excel (.xlsx)')).download.saveAs(info.outputPath('provider-filenames.xlsx'));
});

test('reviewed repair export reimports verbatim into text-only XLSX',async({page},info)=>{
 const source=Buffer.from('id,note\r\n00123,"open\r\n00042,next\r\n00008,other,EXTRA\r\n00007,"valid\r\nmultiline"\r\n');
 await page.goto('/csv-to-xlsx/');await page.getByLabel('Select CSV for Excel conversion').setInputFiles({name:'original.csv',mimeType:'text/csv',buffer:source});await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Malformed CSV');
 await page.getByRole('link',{name:'Open CSV repair',exact:true}).click();await page.getByLabel('Choose CSV file').setInputFiles({name:'original.csv',mimeType:'text/csv',buffer:source});await page.getByRole('link',{name:'2 Clean',exact:true}).click();
 const approval=page.getByLabel(/Apply suggested quote repairs/);await expect(approval).toBeDisabled();await page.getByText('Review 1 changed physical lines',{exact:true}).click();await page.getByLabel('I reviewed line 2',{exact:true}).check();await approval.check();await approval.uncheck();await expect(page.getByRole('alert')).toContainText('CSV parsing warning');await approval.check();
 await page.getByRole('switch',{name:'Pad missing fields',exact:true}).check();await page.getByRole('switch',{name:'Name extra fields',exact:true}).check();await expect(page.getByRole('alert')).toHaveCount(0);
 expect((await bytes(page,'Download original unchanged')).bytes).toEqual(source);
 const cleaned=await bytes(page,'Download CSV');await cleaned.download.saveAs(info.outputPath('repair-conversion.csv'));const parsed=Papa.parse<string[]>(cleaned.bytes.toString());expect(parsed.errors.filter(e=>e.code!=='UndetectableDelimiter')).toEqual([]);expect(parsed.data).toEqual([['id','note','Extra field 3'],['00123','open',''],['00042','next',''],['00008','other','EXTRA'],['00007','valid\r\nmultiline','']]);
 await page.getByRole('navigation',{name:'Tools',exact:true}).getByRole('link',{name:'CSV to Excel',exact:true}).click();await page.getByLabel('Select CSV for Excel conversion').setInputFiles(info.outputPath('repair-conversion.csv'));await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('status')).toContainText('Ready: 5 rows, 3 maximum columns');
 expect((await bytes(page,'Download original unchanged')).bytes).toEqual(cleaned.bytes);const workbook=await bytes(page,'Download Excel (.xlsx)');expect(independentCells(workbook.bytes).map(c=>c.value)).toEqual(parsed.data.flat());await workbook.download.saveAs(info.outputPath('repair-conversion.xlsx'));
});

test('worker preserves BOM-prefixed field text and overlapping OOXML escapes',async({page},info)=>{
 await page.goto('/csv-to-xlsx/');
 const input=Buffer.from('\uFEFF\uFEFF00123,_x0041_x0042_,_x005F_x0041_\r\n');
 await page.getByLabel('Select CSV for Excel conversion').setInputFiles({name:'integrity.csv',mimeType:'text/csv',buffer:input});
 await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('status')).toContainText('Ready: 1 rows');
 const output=await bytes(page,'Download Excel (.xlsx)');
 expect(independentCells(output.bytes).map(c=>c.value)).toEqual(['\uFEFF00123','_x0041_x0042_','_x005F_x0041_']);
 await output.download.saveAs(info.outputPath('integrity.xlsx'));
 expect((await bytes(page,'Download original unchanged')).bytes).toEqual(input);
});
test('static landing HTML, metadata, canonical, sitemap and navigation',async({page,request})=>{
 const response=await request.get('/csv-to-xlsx/'),html=await response.text();expect(response.status()).toBe(200);expect(html).toContain('CSV to Excel Converter — Preserve Text');expect(html).toContain('How to convert CSV to Excel');expect(html).toContain('https://csv-rescue-app.pages.dev/csv-to-xlsx/');expect(response.headers()['content-security-policy']).toContain("connect-src 'none'");
 expect(await(await request.get('/sitemap.xml')).text()).toContain('https://csv-rescue-app.pages.dev/csv-to-xlsx/');expect(await(await request.get('/robots.txt')).text()).toContain('Sitemap:');
 await page.goto('/');await page.getByRole('link',{name:'Convert to Excel',exact:true}).click();await expect(page).toHaveURL('/csv-to-xlsx/');await expect(page.getByRole('heading',{level:1})).toHaveText('CSV to Excel converter');await page.getByRole('link',{name:'CSV repair',exact:true}).click();await expect(page.getByRole('button',{name:/Browse files/})).toBeVisible();
});
test('sample works with production CSP and independently verified text-only XLSX',async({page,context},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const requests:string[]=[];context.on('request',r=>{requests.push(r.url());expect(r.method()).toBe('GET');});
 await page.goto('/csv-to-xlsx/');await page.getByRole('button',{name:'Try sample CSV'}).click();await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('status')).toContainText('Ready: 3 rows');
 const output=await bytes(page,'Download Excel (.xlsx)');expect(output.download.suggestedFilename()).toBe('sample.xlsx');const cells=independentCells(output.bytes);expect(cells.find(c=>c.address==='A2')?.value).toBe('00123');expect(cells.find(c=>c.address==='A3')?.value).toBe('12345678901234567890');expect(cells.find(c=>c.address==='E3')?.value).toBe('=SUM(A1:A2)');
 await output.download.saveAs(info.outputPath('sample.xlsx'));
 expect(requests.every(url=>url.startsWith('http://127.0.0.1:4173/'))).toBe(true);expect(requests.some(url=>/worker-.*\.js/.test(url))).toBe(true);expect(errors).toEqual([]);
 expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookies:document.cookie}))).toEqual({local:0,session:0,cookies:''});expect(await page.evaluate(()=>indexedDB.databases())).toEqual([]);
 await page.screenshot({path:info.outputPath('converter.png'),fullPage:true});
});
test('uploaded values, ragged fields, whitespace and original bytes survive conversion',async({page})=>{
 await page.goto('/csv-to-xlsx/');const input=Buffer.from('\uFEFFid;note\r\n001;"a;b\nnext"\r\n001;"  spaces  ";extra\r\nlast;\r\n');
 await page.getByLabel('Select CSV for Excel conversion').setInputFiles({name:'values.csv',mimeType:'text/csv',buffer:input});await page.getByLabel('Delimiter',{exact:true}).selectOption(';');await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('status')).toContainText('Ready: 4 rows, 3 maximum columns');
 const original=await bytes(page,'Download original unchanged');expect(original.bytes).toEqual(input);
 const output=await bytes(page,'Download Excel (.xlsx)');expect(independentCells(output.bytes).map(c=>c.value)).toEqual(['id','note','001','a;b\nnext','001','  spaces  ','extra','last','']);
 await page.getByLabel('Delimiter',{exact:true}).selectOption(',');await expect(page.getByRole('button',{name:'Download Excel (.xlsx)'})).toHaveCount(0);
});
test('clear failures for malformed quotes, invalid UTF-8, blank, oversized and unsupported files',async({page})=>{
 await page.goto('/csv-to-xlsx/');
 for(const [name,input,message,convert] of [['broken.csv',Buffer.from('a,b\n1,"oops'),'Malformed CSV',true],['bad.csv',Buffer.from([0xff,0xfe,0x00]),'not valid UTF-8',true],['blank.csv',Buffer.from(' \n'),'empty',true],['large.csv',Buffer.alloc(2*1024*1024+1),'2 MB',false],['workbook.xlsx',Buffer.from('x'),'not supported',false]] as const){
  await page.getByLabel('Select CSV for Excel conversion').setInputFiles({name,mimeType:'application/octet-stream',buffer:input});if(convert)await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('alert')).toContainText(message);await expect(page.getByRole('button',{name:'Download Excel (.xlsx)'})).toHaveCount(0);
 }
});
test('repair route never loads spreadsheet worker and converter fits narrow screens',async({page})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));await page.goto('/csv-repair/');await page.getByLabel('Choose CSV file').setInputFiles({name:'simple.csv',mimeType:'text/csv',buffer:Buffer.from('a,b\n1,2')});await expect(page.getByRole('button',{name:'Download CSV',exact:true})).toBeVisible();expect(requests.some(url=>/worker-|xlsx/.test(url))).toBe(false);
 await page.setViewportSize({width:320,height:740});await page.goto('/csv-to-xlsx/');await page.getByRole('button',{name:'Try sample CSV'}).click();await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('button',{name:'Download Excel (.xlsx)'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByText('Preview text values',{exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const box=await page.getByRole('button',{name:'Download Excel (.xlsx)'}).boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);
});
test('drag and drop, cancel and replacement uploads remain predictable',async({page})=>{
 // Hold the cold worker response so cancellation is exercised deterministically.
 await page.route('**/assets/worker-*.js',async route=>{await new Promise(resolve=>setTimeout(resolve,1000));try{await route.continue();}catch{/* Cancellation may close the request. */}});
 await page.goto('/csv-to-xlsx/');await page.locator('.conversion-tool').evaluate(el=>{const transfer=new DataTransfer();transfer.items.add(new File(['id,note\n001,hello'],'dropped.csv',{type:'text/csv'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));});await expect(page.locator('.selected-file')).toContainText('dropped.csv');
 await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await page.getByRole('button',{name:'Cancel conversion'}).click();await expect(page.getByRole('alert')).toContainText('cancelled');await expect(page.getByRole('button',{name:'Download Excel (.xlsx)'})).toHaveCount(0);
 await page.getByRole('button',{name:'Try sample CSV'}).click();await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('.selected-file')).toContainText('sample.csv');
});
test('bounded 200,000-field conversion stays responsive and exports every field',async({page},info)=>{
 await page.goto('/csv-to-xlsx/');const input=Buffer.from(Array.from({length:1000},(_,r)=>Array.from({length:200},(_,c)=>`id${r}_${c}`).join(',')).join('\n'));
 await page.getByLabel('Select CSV for Excel conversion').setInputFiles({name:'bounded.csv',mimeType:'text/csv',buffer:input});const start=Date.now();await page.getByRole('button',{name:'Convert to XLSX',exact:true}).click();await expect(page.getByRole('status')).toContainText('200000 text fields',{timeout:30000});
 const milliseconds=Date.now()-start;await info.attach('conversion-timing',{body:JSON.stringify({inputBytes:input.length,milliseconds,fields:200000,environment:'local Chromium; mobile project is viewport emulation'}),contentType:'application/json'});
 console.log(`Conversion benchmark ${info.project.name}: ${input.length} bytes, 200000 fields, ${milliseconds} ms`);
 const output=await bytes(page,'Download Excel (.xlsx)');const cells=independentCells(output.bytes);expect(cells).toHaveLength(200000);expect(cells.at(-1)).toEqual({address:'GR1000',value:'id999_199'});
});
test('landing content works without JavaScript and keyboard controls have readable contrast',async({page,browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});try{const staticPage=await context.newPage();await staticPage.goto('http://127.0.0.1:4173/csv-to-xlsx/');await expect(staticPage.getByRole('heading',{name:'How to convert CSV to Excel'})).toBeVisible();await expect(staticPage.getByText(/This converter needs JavaScript/)).toBeVisible();}finally{await context.close();}
 await page.goto('/csv-to-xlsx/');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();await page.getByRole('button',{name:'Try sample CSV'}).focus();await page.keyboard.press('Enter');await expect(page.locator('.selected-file')).toContainText('sample.csv');
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 const ratio=await page.locator('.conversion-page .intro p').evaluate(el=>{const c=getComputedStyle(el).color.match(/[\d.]+/g)!.slice(0,3).map(Number);const lum=(rgb:number[])=>rgb.map(v=>{const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);return (lum([248,250,249])+.05)/(lum(c)+.05);});expect(ratio).toBeGreaterThanOrEqual(4.5);
});
