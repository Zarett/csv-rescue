function attribute(tag:string,name:string){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const match=new RegExp('(?:^|\\s)'+escaped+'=(["\'])([\\s\\S]*?)\\1').exec(tag);return match?.[2];}
function xmlText(text:string){return text.replace(/&(?:amp|lt|gt|quot|apos|#x[\da-f]+|#\d+);/gi,entity=>{const named:Record<string,string>={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};if(named[entity])return named[entity];return String.fromCodePoint(entity[2].toLowerCase()==='x'?parseInt(entity.slice(3,-1),16):Number(entity.slice(2,-1)));});}

export function missingXlsxFormulaCells(xml:string):string[]{
  const result:string[]=[];
  for(const cell of xml.matchAll(/<(?:[\w.-]+:)?c\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?c>/g)){
    if(!/<(?:[\w.-]+:)?f\b/.test(cell[2]))continue;
    const address=attribute(cell[1],'r');if(!address||!/^\$?[A-Z]+\$?[1-9]\d*$/.test(address))throw new Error('Formula cell has no supported address. No partial CSV was created.');
    const value=/<(?:[\w.-]+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?v>/.exec(cell[2]);
    const empty=/<(?:[\w.-]+:)?v\s*\/>/.test(cell[2]);
    const string=attribute(cell[1],'t')==='str';
    if(!value&&!empty || !string&&(!value||value[1].trim()===''))result.push(address.replace(/\$/g,''));
  }
  return result;
}
export function resolveXlsxFormulaCaches(parts:Map<string,string[]>,workbook:string,relationships:string):Map<number,string[]>{
  const result=new Map<number,string[]>();if(!parts.size)return result;
  const targets=new Map<string,string>();
  for(const relation of relationships.matchAll(/<(?:[\w.-]+:)?Relationship\b([^>]*)\/?\s*>/g)){
    const id=attribute(relation[1],'Id'),target=attribute(relation[1],'Target');if(!id||!target||attribute(relation[1],'TargetMode')==='External')continue;
    const url=new URL(xmlText(target),'https://workbook.invalid/xl/workbook.xml');if(url.origin!=='https://workbook.invalid')continue;
    targets.set(xmlText(id),decodeURIComponent(url.pathname.slice(1)));
  }
  let index=0;const found=new Set<string>();
  for(const sheet of workbook.matchAll(/<(?:[\w.-]+:)?sheet\b([^>]*)\/?\s*>/g)){
    const id=/(?:^|\s)(?:[\w.-]+:)?id=(["'])(.*?)\1/.exec(sheet[1])?.[2],path=id?targets.get(xmlText(id)):undefined;
    if(path&&parts.has(path)){result.set(index,parts.get(path)!);found.add(path);}index++;
  }
  if(found.size!==parts.size)throw new Error('Uncached formulas could not be mapped to worksheets. No partial CSV was created.');
  return result;
}
