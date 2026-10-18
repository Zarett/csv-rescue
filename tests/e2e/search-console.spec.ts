import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('Google verification file is preserved and served directly without changing SEO routes',async({request})=>{
 const name='google361db6f5475b9aee.html';
 const source=await readFile('public/'+name);
 expect(source.toString()).toBe('google-site-verification: '+name);
 expect(await readFile('dist/'+name)).toEqual(source);
 const response=await request.get('/'+name,{maxRedirects:0});
 expect(response.status()).toBe(200);expect(response.headers().location).toBeUndefined();expect(await response.body()).toEqual(source);
 expect(response.headers()['content-type']).toContain('text/html');
 expect(response.headers()['content-security-policy']).toContain("connect-src 'none'");
 expect(response.headers()['x-content-type-options']).toBe('nosniff');
 expect(await(await request.get('/sitemap.xml')).text()).not.toContain(name);
 expect((await request.get('/google-not-a-real-verification.html',{maxRedirects:0})).status()).toBe(404);
 expect((await request.get('/csv-repair/index.html',{maxRedirects:0})).status()).toBe(308);
});
