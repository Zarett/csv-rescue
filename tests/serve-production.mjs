// Local-only QA server: serve dist with the same headers declared for Pages.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const root = resolve('dist');
const policy = (await readFile(resolve(root,'_headers'),'utf8')).split(/\r?\n/).filter(line=>line.startsWith('  ')).map(line=>{const colon=line.indexOf(':');return [line.slice(0,colon).trim(),line.slice(colon+1).trim()];});
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain; charset=utf-8','.xml':'application/xml'};
// Explicit file proxies run before Pages' automatic HTML normalization.
let fileProxies=[];
try {fileProxies=(await readFile(resolve(root,'_redirects'),'utf8')).split(/\r?\n/).map(line=>line.trim().split(/\s+/)).filter(([from,to,status])=>from?.startsWith('/') && to?.startsWith('/') && status==='200');} catch {/* No explicit proxies configured. */}
createServer(async (req,res)=>{
  const notFound=async()=>res.writeHead(404,{'Content-Type':'text/html; charset=utf-8',...Object.fromEntries(policy)}).end(await readFile(resolve(root,'404.html')));
  try {
    const url=new URL(req.url,'http://localhost');
    const pathname=decodeURIComponent(url.pathname);
    const path = resolve(root, '.' + pathname);
    if(path!==root && !path.startsWith(root+sep)) {res.writeHead(403).end();return;}
    const proxy=fileProxies.find(([from])=>from===pathname);
    if(proxy){const target=resolve(root,'.'+proxy[1]);if(!target.startsWith(root+sep)){res.writeHead(403).end();return;}const bytes=await readFile(target);res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream',...Object.fromEntries(policy)}).end(bytes);return;}
    // Model Pages' physical HTML routes, normalization and top-level 404.html.
    if(pathname.endsWith('/index.html')) {res.writeHead(308,{Location:pathname.slice(0,-10)+url.search}).end();return;}
    if(pathname.endsWith('.html')) {
      try {await readFile(path);res.writeHead(308,{Location:pathname.slice(0,-5)+url.search}).end();return;} catch {await notFound();return;}
    }
    let file = path;
    if(path===root || !extname(path)) {
      const candidate=resolve(path,'index.html');
      let directory=true;
      try { await readFile(candidate); file=candidate; } catch {
        try {file=path+'.html';await readFile(file);directory=false;} catch {await notFound();return;}
      }
      if(directory && !pathname.endsWith('/')) {res.writeHead(308,{Location:pathname+'/'+url.search}).end();return;}
    }
    if(!types[extname(file)]) {await notFound();return;}
    const bytes = await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)],...Object.fromEntries(policy)}).end(bytes);
  } catch {await notFound();}
}).listen(4173,'127.0.0.1',()=>console.log('Production QA: http://127.0.0.1:4173'));
