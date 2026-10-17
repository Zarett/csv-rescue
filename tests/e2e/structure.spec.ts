import {test,expect} from '@playwright/test';
test('structural alignment is explicit, reversible, and preserves extra fields',async({page})=>{
 await page.goto('/');await page.getByLabel('Choose CSV file').setInputFiles({name:'uneven.csv',mimeType:'text/csv',buffer:Buffer.from('id,note\n1\n2,value,EXTRA\n3,')});
 await page.getByRole('link',{name:'2 Clean',exact:true}).click();const pad=page.getByRole('switch',{name:'Pad missing fields',exact:true}),names=page.getByRole('switch',{name:'Name extra fields',exact:true});await expect(pad).not.toBeChecked();await expect(names).not.toBeChecked();
 await pad.check();await names.check();await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.getByText(/3 empty field placeholders added; 1 extra header names added/)).toBeVisible();
 await page.getByRole('link',{name:'3 Preview',exact:true}).click();await page.getByRole('button',{name:'After',exact:true}).click();await expect(page.getByRole('columnheader',{name:'Extra field 3'})).toBeVisible();await expect(page.getByRole('cell',{name:'EXTRA',exact:true})).toBeVisible();
 await names.uncheck();await pad.uncheck();await expect(page.getByRole('alert')).toContainText('Records with missing fields: 1; records with extra fields: 1');
});
test('structural options wait for quote repair and reset when parsing settings change',async({page})=>{
 await page.goto('/');await page.getByLabel('Choose CSV file').setInputFiles({name:'quotes.csv',mimeType:'text/csv',buffer:Buffer.from('id,note\n1,"open\n2,next')});await page.getByRole('link',{name:'2 Clean',exact:true}).click();await expect(page.getByRole('switch',{name:'Pad missing fields',exact:true})).toBeDisabled();
 await page.getByText('Review 1 changed physical lines',{exact:true}).click();await page.getByLabel('I reviewed line 2',{exact:true}).check();await page.getByLabel(/Apply suggested quote repairs/).check();
 const pad=page.getByRole('switch',{name:'Pad missing fields',exact:true});await expect(pad).toBeEnabled();await pad.check();await page.getByLabel('First row contains headers').uncheck();await expect(pad).not.toBeChecked();await expect(page.getByRole('switch',{name:'Name extra fields',exact:true})).toBeDisabled();
});
