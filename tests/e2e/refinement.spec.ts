import { readFileSync } from 'node:fs';
import { test,expect } from '@playwright/test';
test('quote review gating, fixed baseline statistics, and remaining extra fields',async ({page})=>{
  await page.goto('/csv-repair/');
  const source=readFileSync('tests/fixtures/quote-width.csv');
  await page.getByLabel('Choose CSV file').setInputFiles({name:'quote-width.csv',mimeType:'text/csv',buffer:source});
  await expect(page.getByTestId('original-width')).toContainText('12');await expect(page.getByTestId('proposed-width')).toContainText('12');
  const approve=page.getByLabel(/Apply suggested quote repairs/);await expect(approve).toBeDisabled();
  await page.getByText('Review 1 changed physical lines',{exact:true}).click();await expect(approve).toBeDisabled();
  await page.getByLabel('I reviewed line 2',{exact:true}).check();await expect(approve).toBeEnabled();
  await page.getByText('Review 1 changed physical lines',{exact:true}).click();await expect(approve).toBeDisabled();
  await page.getByText('Review 1 changed physical lines',{exact:true}).click();await approve.check();
  await expect(page.getByTestId('original-width')).toContainText('12');await expect(page.getByTestId('proposed-width')).toContainText('8');
  await expect(page.getByText(/This is a parsing change, not column deletion/)).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Records with missing fields: 0; records with extra fields: 1');
  await expect(page.getByRole('columnheader',{name:'Extra field 8'})).toBeVisible();
  await page.getByRole('link',{name:'4 Export',exact:true}).click();await expect(page.getByText(/Unresolved structural issues remain/)).toBeVisible();
  const originalDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download original unchanged'}).click();
  const stream=await(await originalDownload).createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));expect(Buffer.concat(chunks)).toEqual(source);
  await approve.uncheck();await expect(page.getByTestId('proposed-width')).toContainText('12');
  // A delimiter change invalidates the previous review and approval.
  await page.getByLabel('Delimiter',{exact:true}).selectOption(';');await page.getByLabel('Delimiter',{exact:true}).selectOption(',');
  await expect(page.getByLabel(/Apply suggested quote repairs/)).toBeDisabled();
});
test('compact mobile panels retain choices and keep export reachable',async ({page},info)=>{
  await page.goto('/csv-repair/');
  const source=Buffer.from('\uFEFFid,email,age,amount,note\r\n1,invalid,-5,-12.50,"multi\r\nline"\r\n2,test@example.com,200,0,   spaced   \r\n3,missing\r\n4,extra,1,2,note,EXTRA\r\n');
  await page.getByLabel('Choose CSV file').setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:source});
  if(info.project.name==='mobile') {
    await expect(page.locator('#clean-section')).not.toHaveAttribute('open','');
    await expect(page.locator('#preview-section')).not.toHaveAttribute('open','');
    await page.screenshot({path:'test-results/mobile-compact.png',fullPage:true});
  }
  const initialViewport=page.viewportSize()!;
  await page.setViewportSize({width:320,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize(initialViewport);
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('link',{name:'2 Clean',exact:true}).click();await page.getByRole('switch',{name:'Trim whitespace',exact:true}).check();
  await page.locator('#clean-section > summary').click();await page.getByRole('link',{name:'2 Clean',exact:true}).click();await expect(page.getByRole('switch',{name:'Trim whitespace',exact:true})).toBeChecked();
  await page.getByRole('link',{name:'4 Export',exact:true}).click();await page.getByLabel('Spreadsheet-safe export',{exact:true}).check();
  await expect(page.getByText(/2 values will gain an apostrophe/)).toBeVisible();
  const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV',exact:true}).click();
  const stream=await(await dl).createReadStream();let text='';for await(const chunk of stream!)text+=chunk;
  expect(text).toContain("'-5");expect(text).toContain("'-12.50");expect(text).toContain('invalid');expect(text).toContain('200');expect(text).toContain('EXTRA');expect(text).toContain('multi\r\nline');
  const originalDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download original unchanged'}).click();
  const raw=await(await originalDownload).createReadStream();const chunks:Buffer[]=[];for await(const chunk of raw!)chunks.push(Buffer.from(chunk));expect(Buffer.concat(chunks)).toEqual(source);
  await page.getByRole('link',{name:'3 Preview',exact:true}).click();await page.getByRole('button',{name:'After',exact:true}).click();
  await expect(page.getByRole('cell',{name:'spaced',exact:false}).first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
