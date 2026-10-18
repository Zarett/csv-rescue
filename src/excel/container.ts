import { EXCEL_LIMITS } from './types';
import { CFB } from 'xlsx';
import {missingXlsxFormulaCells,resolveXlsxFormulaCaches} from './xlsx-caches';

// Validate container types before SheetJS can fall back to permissive text import.
// ZIP metadata limits reduce ordinary decompression bombs; they are not a hard heap cap.
export async function inspectContainer(bytes: Uint8Array, extension: 'xlsx' | 'xls',onMissing?:(cells:Map<number,string[]>)=>void) {
  if (bytes.length > EXCEL_LIMITS.bytes) throw new Error('Workbook exceeds the 5 MB input limit.');
  const ole = [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1].every((v,i)=>bytes[i]===v);
  if (extension === 'xls') {
    if (!ole) throw new Error('This is not an Excel 97–2003 XLS container. Older raw BIFF, HTML and renamed CSV files are not supported.');
    return bytes;
  }
  if (ole) throw new Error('Encrypted XLSX files are not supported. Save an unencrypted copy in Excel first.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 22 || view.getUint32(0,true)!==0x04034b50) throw new Error('This is not a valid XLSX ZIP container.');
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length-65557) && view.getUint32(end,true)!==0x06054b50) end--;
  if (end < Math.max(0,bytes.length-65557)) throw new Error('The XLSX ZIP directory is missing or damaged.');
  const count=view.getUint16(end+10,true), size=view.getUint32(end+12,true), start=view.getUint32(end+16,true);
  if (view.getUint16(end+4,true) || view.getUint16(end+6,true) || view.getUint16(end+8,true)!==count || end+22+view.getUint16(end+20,true)!==bytes.length || count>EXCEL_LIMITS.entries || count===0 || start+size!==end) throw new Error('Unsupported, oversized or damaged XLSX ZIP directory.');
  let at=start, expanded=0,workbookXml='',workbookRels='';const names=new Set<string>(),normalized=new Map<string,Uint8Array>(),missingParts=new Map<string,string[]>();
  for(let i=0;i<count;i++) {
    if(at+46>end || view.getUint32(at,true)!==0x02014b50) throw new Error('Damaged XLSX ZIP entry.');
    const flags=view.getUint16(at+8,true),method=view.getUint16(at+10,true),compressed=view.getUint32(at+20,true),plain=view.getUint32(at+24,true),nameSize=view.getUint16(at+28,true),extra=view.getUint16(at+30,true),comment=view.getUint16(at+32,true),local=view.getUint32(at+42,true);
    if(flags&1 || ![0,8].includes(method) || compressed===0xffffffff || plain===0xffffffff || at+46+nameSize+extra+comment>end || local+30>start || view.getUint32(local,true)!==0x04034b50) throw new Error('Encrypted, ZIP64 or damaged XLSX archives are not supported.');
    if(view.getUint16(local+8,true)!==method || view.getUint16(local+6,true)!==flags || local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true)+compressed>start) throw new Error('Inconsistent XLSX ZIP entry.');
    const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(at+46,at+46+nameSize));
    const localName=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(local+30,local+30+view.getUint16(local+26,true)));
    if(name!==localName || names.has(name) || name.includes('..') || name.startsWith('/') || name.includes('\\')) throw new Error('Unsafe or duplicate XLSX ZIP path.');
    names.add(name);expanded+=plain;if(expanded>EXCEL_LIMITS.expanded) throw new Error('Expanded XLSX content exceeds 32 MB. No partial CSV was created.');
    // Count actual decompressed bytes, not just attacker-controlled ZIP lengths.
    const offset=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
    const payload=new Uint8Array(bytes.subarray(offset,offset+compressed));
    let stream:ReadableStream<Uint8Array<ArrayBuffer>>=new Blob([payload]).stream();
    if(method===8) {
      if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot validate XLSX compression. Try a current browser.');
      stream=stream.pipeThrough(new DecompressionStream('deflate-raw'));
    }
    const reader=stream.getReader();let actual=0,crc=0xffffffff;const chunks:Uint8Array[]=[];
    try{while(true){const {done,value}=await reader.read();if(done)break;actual+=value.length;if(actual>plain){await reader.cancel();throw new Error('XLSX decompression exceeds its declared size.');}if(name.endsWith('.xml')||name.endsWith('.rels'))chunks.push(value);for(const byte of value){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}}}finally{reader.releaseLock();}
    if(actual!==plain||((crc^0xffffffff)>>>0)!==view.getUint32(at+16,true))throw new Error('XLSX content failed its size or checksum validation.');
    if(chunks.length){const xmlBytes=new Uint8Array(actual);let offset=0;for(const chunk of chunks){xmlBytes.set(chunk,offset);offset+=chunk.length;}const xml=new TextDecoder('utf-8',{fatal:true}).decode(xmlBytes);
      if(name==='xl/workbook.xml')workbookXml=xml;
      if(name==='xl/_rels/workbook.xml.rels')workbookRels=xml;
      if(name.startsWith('xl/worksheets/')){const cells=missingXlsxFormulaCells(xml);if(cells.length)missingParts.set(name,cells);}
      // SheetJS 0.20.3 truncates non-BMP numeric XML references. Decode just these
      // valid references to literal UTF-8 before reading; preserve CDATA/comments.
      const unicode=xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|&#(x[\da-f]+|\d+);/gi,(all,code:string|undefined)=>{if(!code)return all;const point=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code);if(point>0xffff&&point<=0x10ffff)return String.fromCodePoint(point);return all;});
      // The reader decodes type="str" XML twice, corrupting literal entity/OOXML
      // escape text. Route those cached strings through its single-decode inline
      // string path; keep any formula and all other cell metadata intact.
      const fixed=name.startsWith('xl/worksheets/')?unicode.replace(/(<(?:[\w.-]+:)?c\b[^>]*\bt=(["'])str\2[^>]*>)([\s\S]*?)(<\/(?:[\w.-]+:)?c>)/g,(_all,tag:string,_quote:string,body:string,end:string)=>{
        const value=/<(?:[\w.-]+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?v>/.exec(body);
        const inline=`<is><t xml:space="preserve">${value?.[1]??''}</t></is>`;
        return tag.replace(/\bt=(["'])str\1/,'t="inlineStr"')+(value?body.replace(value[0],()=>inline):body+inline)+end;
      }):unicode;
      if(fixed!==xml)normalized.set(name,new TextEncoder().encode(fixed));
    }
    at+=46+nameSize+extra+comment;
  }
  if(at!==end || !names.has('xl/workbook.xml') || !names.has('[Content_Types].xml')) throw new Error('The archive does not contain a supported XLSX workbook.');
  onMissing?.(resolveXlsxFormulaCaches(missingParts,workbookXml,workbookRels));
  if(!normalized.size)return bytes;
  const archive=CFB.read(bytes,{type:'array'});
  for(const [name,content]of normalized)CFB.utils.cfb_add(archive,archive.FullPaths[0]+name,content);
  return new Uint8Array(CFB.write(archive,{type:'array',fileType:'zip',compression:false}));
}
