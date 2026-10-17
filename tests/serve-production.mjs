// Local-only QA server: serve dist with the same headers declared for Pages.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const root = resolve('dist');
const policy = (await readFile(resolve(root,'_headers'),'utf8')).split(/\r?\n/).filter(line=>line.startsWith('  ')).map(line=>{const colon=line.indexOf(':');return [line.slice(0,colon).trim(),line.slice(colon+1).trim()];});
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain; charset=utf-8'};
createServer(async (req,res)=>{
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(path!==root && !path.startsWith(root+sep)) {res.writeHead(403).end();return;}
    // Model Pages' default SPA fallback (no top-level 404.html is shipped).
    const file = path===root || !extname(path) ? resolve(root,'index.html') : path;
    if(!types[extname(file)]) {res.writeHead(404).end();return;}
    const bytes = await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)],...Object.fromEntries(policy)}).end(bytes);
  } catch {res.writeHead(404).end();}
}).listen(4173,'127.0.0.1',()=>console.log('Production QA: http://127.0.0.1:4173'));
