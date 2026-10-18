import {CFB,utils,write} from 'xlsx';
export function stringCacheWorkbook(saved:boolean){
  const book=utils.book_new();utils.book_append_sheet(book,utils.aoa_to_sheet([['placeholder']]),'Strings');
  const archive=CFB.read(new Uint8Array(write(book,{type:'array',bookType:'xlsx'})),{type:'array'});
  const path=archive.FullPaths.find((name:string)=>name.endsWith('/xl/worksheets/sheet1.xml'));
  const xml='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1"/><sheetData><row r="1"><c r="A1" t="str"><f>IF(1=1,"","x")</f>'+(saved?'<v></v>':'')+'</c></row></sheetData></worksheet>';
  CFB.utils.cfb_add(archive,path,new TextEncoder().encode(xml));return Buffer.from(CFB.write(archive,{type:'array',fileType:'zip'}));
}
