// Independent test-only ZIP/XML reader. Never imports the spreadsheet library.
import { inflateRawSync } from 'node:zlib';
export function unzip(bytes: Uint8Array) {
  const b = Buffer.from(bytes), files: Record<string, string> = {};
  let end = b.length - 22;
  while (end >= 0 && b.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('Missing ZIP directory');
  let at = b.readUInt32LE(end + 16);
  for (let i = 0; i < b.readUInt16LE(end + 10); i++) {
    if (b.readUInt32LE(at) !== 0x02014b50) throw new Error('Invalid ZIP entry');
    const method=b.readUInt16LE(at+10), size=b.readUInt32LE(at+20), nameLength=b.readUInt16LE(at+28), extra=b.readUInt16LE(at+30), comment=b.readUInt16LE(at+32), local=b.readUInt32LE(at+42);
    const name=b.subarray(at+46,at+46+nameLength).toString();
    const start=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28), data=b.subarray(start,start+size);
    if (method !== 0 && method !== 8) throw new Error('Unsupported ZIP compression');
    const decoded=method===8?inflateRawSync(data):data;
    if(decoded.length!==b.readUInt32LE(at+24)) throw new Error('ZIP size mismatch');
    files[name]=decoded.toString('utf8');at+=46+nameLength+extra+comment;
  }
  return files;
}
export function independentCells(bytes: Uint8Array) {
  const files=unzip(bytes);
  const decode=(text:string)=>text.replace(/\r\n?/g,'\n').replace(/&(?:amp|lt|gt|quot|apos);/g,e=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[e]!)).replace(/_x([\da-f]{4})_/gi,(_,code:string)=>String.fromCharCode(parseInt(code,16)));
  const strings=[...files['xl/sharedStrings.xml'].matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>decode([...m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(t=>t[1]).join('')));
  const sheet=files['xl/worksheets/sheet1.xml'];
  if (/<f[\s>]/.test(sheet)) throw new Error('Unexpected Excel formula');
  return [...sheet.matchAll(/<c\s([^>]+)>([\s\S]*?)<\/c>/g)].map(m=>{
    if(!/t="s"/.test(m[1])) throw new Error('Non-text cell');
    return {address:/r="([^"]+)"/.exec(m[1])![1],value:strings[Number(/<v>(\d+)<\/v>/.exec(m[2])![1])]};
  });
}
