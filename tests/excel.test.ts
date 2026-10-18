// @vitest-environment node
import {it,expect,describe} from 'vitest';
import {utils,write,CFB,type WorkBook} from 'xlsx';
import Papa from 'papaparse';
import {openWorkbook,exportSheet,sheetList} from '../src/excel/workbook';
import {validateExcelFile,EXCEL_LIMITS} from '../src/excel/types';
import {legacyWorkbook} from './helpers/legacy-xls';
import {stringCacheWorkbook} from './helpers/string-cache-xlsx';
import {resolveXlsxFormulaCaches} from '../src/excel/xlsx-caches';
import {readFileSync} from 'node:fs';

function fixture(){const book=utils.book_new(),sheet=utils.aoa_to_sheet([['id','date','amount','note','formula','error'],['00123',45292,-12.5,'  Español 😀, "quoted"\nnext  ',null,null],['12345678901234567890',null,null,'=1+1'],['duplicate'],['duplicate']]);sheet.B2.z='yyyy-mm-dd';sheet.C2.z='0.00';sheet.E2={t:'n',f:'1+1',v:2};sheet.F2={t:'e',v:7,w:'#DIV/0!'};sheet['!merges']=[{s:{r:5,c:0},e:{r:5,c:1}}];sheet.A6={t:'s',v:'merged'};sheet['!ref']='A1:F6';utils.book_append_sheet(book,sheet,'Data');utils.book_append_sheet(book,utils.aoa_to_sheet([['second'],['00007']]),'Hidden');utils.book_append_sheet(book,{},'Empty');book.Workbook={Sheets:[{name:'Data',Hidden:0},{name:'Hidden',Hidden:1},{name:'Empty',Hidden:0}]};return book;}
const bytes=(book:WorkBook,type:'xlsx'|'biff8'='xlsx',compression=true)=>new Uint8Array(write(book,{type:'array',bookType:type,compression}));
const parse=(csv:string,delimiter=',')=>Papa.parse<string[]>(csv,{delimiter}).data;
describe('Excel import and explicit CSV exports',()=>{
 it.each(['xlsx','biff8'] as const)('retains numeric leading zeros in %s formatted mode and exposes underlying numbers explicitly',async type=>{const book=utils.book_new(),sheet=utils.aoa_to_sheet([[42,-5,45292]]);sheet.A1.z='00000';sheet.B1.z='0.00';sheet.C1.z='yyyy-mm-dd';utils.book_append_sheet(book,sheet,'Values');const parsed=await openWorkbook(bytes(book,type),type==='xlsx'?'xlsx':'xls');expect(parse(exportSheet(parsed,0,'formatted',',',false).csv)).toEqual([['00042','-5.00','2024-01-01']]);expect(parse(exportSheet(parsed,0,'raw',',',false).csv)).toEqual([['42','-5','45292']]);});
 it('blocks missing string formula caches but retains explicitly cached empty-string results',async()=>{const missing=await openWorkbook(stringCacheWorkbook(false),'xlsx'),saved=await openWorkbook(stringCacheWorkbook(true),'xlsx');expect(exportSheet(missing,0,'formatted',',',false).missingResults).toBe(1);expect(exportSheet(missing,0,'formatted',',',false).csv).toBe('');expect(exportSheet(saved,0,'formatted',',',false).missingResults).toBe(0);expect(exportSheet(saved,0,'formatted',',',false).csv).toBe('""');});
 it('blocks a legacy formula whose required cached STRING record is missing',async()=>{const book=await openWorkbook(legacyWorkbook([['id','result'],['00123',{cached:null}]]),'xls');expect(exportSheet(book,0,'formatted',',',false).missingResults).toBe(1);expect(exportSheet(book,0,'formatted',',',false).csv).toBe('');});
 it('maps absent caches by worksheet relationships rather than physical file order',()=>{const parts=new Map([['xl/worksheets/sheet1.xml',['A1']]]);const workbook='<sheets><sheet name="Safe" r:id="r2"/><sheet name="Missing" r:id="r1"/></sheets>';const relationships='<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/><Relationship Id="r2" Target="/xl/worksheets/sheet2.xml"/></Relationships>';expect([...resolveXlsxFormulaCaches(parts,workbook,relationships)]).toEqual([[1,['A1']]]);expect(()=>resolveXlsxFormulaCaches(parts,workbook,'')).toThrow(/could not be mapped/);});
 it.each(['xlsx','biff8'] as const)('reads %s workbooks, worksheets and formatted values',async type=>{
  const book=await openWorkbook(bytes(fixture(),type),type==='xlsx'?'xlsx':'xls');expect(sheetList(book)).toEqual([{name:'Data',hidden:false},{name:'Hidden',hidden:true},{name:'Empty',hidden:false}]);
  const output=exportSheet(book,0,'formatted',',',false),rows=parse(output.csv);expect(rows[1].slice(0,5)).toEqual(['00123','2024-01-01','-12.50','  Español 😀, "quoted"\nnext  ','2']);expect(rows[2][0]).toBe('12345678901234567890');expect(output.formulas).toBe(type==='xlsx'?1:0);expect(output.errors).toBe(1);expect(rows[1][5]).toBe('#DIV/0!');expect(output.merges).toBe(1);expect(rows[5].slice(0,2)).toEqual(['merged','']);expect(rows[3]).toEqual(rows[4]);
  expect(parse(exportSheet(book,1,'formatted',',',false).csv)).toEqual([['second'],['00007']]);expect(exportSheet(book,2,'formatted',',',false).empty).toBe(true);
 });
 it('reads genuine independent BIFF8/CFB bytes and Unicode',async()=>{
  const book=await openWorkbook(legacyWorkbook([['id','note','amount'],['00123','Español 東京 😀',-5],['00001','comma, quote"\nnext',-12.5]]),'xls');expect(book.SheetNames).toEqual(['Legacy']);expect(parse(exportSheet(book,0,'raw',',',false).csv)).toEqual([['id','note','amount'],['00123','Español 東京 😀','-5'],['00001','comma, quote"\nnext','-12.5']]);
 });
 it('reads an independent openpyxl workbook and preserves its actual text',async()=>{
  const book=await openWorkbook(readFileSync('tests/fixtures/excel-independent.xlsx'),'xlsx');const output=exportSheet(book,0,'formatted',',',false);expect(parse(output.csv)).toEqual([['id','postal','date','negative','unicode'],['00123','00042','2024-01-01','-12.50','東京 😀'],['12345678901234567890','','','','']]);
 });
 it('reads actual legacy formula records using saved results without calculation',async()=>{const book=await openWorkbook(legacyWorkbook([['formula'],[{cached:2}]]),'xls');const result=exportSheet(book,0,'formatted',',',false);expect(result.formulas).toBe(1);expect(parse(result.csv)).toEqual([['formula'],['2']]);});
 it('decodes supplementary XML references but preserves escaped literal reference text',async()=>{
  const source=utils.book_new();utils.book_append_sheet(source,utils.aoa_to_sheet([['PLACEHOLDER','&#128512;','_x005F_x0041_']]),'Text');const archive=CFB.read(bytes(source),{type:'array'});const path=archive.FullPaths.find((p:string)=>p.endsWith('/xl/worksheets/sheet1.xml'));const file=CFB.find(archive,path);const xml=new TextDecoder().decode(file.content).replace('PLACEHOLDER','&#x1F642;&#128512;');CFB.utils.cfb_add(archive,path,new TextEncoder().encode(xml));const book=await openWorkbook(new Uint8Array(CFB.write(archive,{type:'array',fileType:'zip'})),'xlsx');expect(parse(exportSheet(book,0,'formatted',',',false).csv)).toEqual([['🙂😀','&#128512;','_x0041_']]);
 });
 it('keeps the workbook date system and booleans explicit',async()=>{
  const book=utils.book_new();book.Workbook={WBProps:{date1904:true}};const sheet=utils.aoa_to_sheet([[1,true,false]]);sheet.A1.z='yyyy-mm-dd';utils.book_append_sheet(book,sheet,'Dates');const parsed=await openWorkbook(bytes(book),'xlsx');expect(parse(exportSheet(parsed,0,'formatted',',',false).csv)).toEqual([['1904-01-02','TRUE','FALSE']]);expect(parse(exportSheet(parsed,0,'raw',',',false).csv)).toEqual([['1','TRUE','FALSE']]);
 });
 it('makes numeric underlying values distinct from formatted text without mutating workbook',()=>{
  const book=fixture(),before=JSON.stringify(book);expect(parse(exportSheet(book,0,'raw',',',false).csv)[1].slice(0,3)).toEqual(['00123','45292','-12.5']);expect(JSON.stringify(book)).toBe(before);
 });
 it.each([',',';','\t','|'])('reparses %j delimiters, quoted fields and blank positions',delimiter=>{const result=exportSheet(fixture(),0,'formatted',delimiter,false);expect(parse(result.csv,delimiter)).toHaveLength(6);expect(parse(result.csv,delimiter)[1][3]).toBe('  Español 😀, "quoted"\nnext  ');});
 it('only changes risky exported values with explicit safe export, leaving numeric negatives intact',()=>{
  const book=fixture();book.Sheets.Data.D3={t:'s',v:'-5'};book.Sheets.Data.D4={t:'s',v:' @cmd'};const before=JSON.stringify(book);const raw=exportSheet(book,0,'formatted',',',false),safe=exportSheet(book,0,'formatted',',',true);expect(raw.changed).toBe(0);expect(safe.changed).toBe(2);const rows=parse(safe.csv);expect(rows[2][3]).toBe("'-5");expect(rows[3][3]).toBe("' @cmd");expect(rows[1][2]).toBe('-12.50');expect(JSON.stringify(book)).toBe(before);
 });
 it('blocks export for missing formula caches, including cached array ranges',()=>{const book=fixture();book.Sheets.Data.E2={t:'n',f:'1+1'};const result=exportSheet(book,0,'formatted',',',false);expect(result.missingResults).toBe(1);expect(result.csv).toBe('');});
 it('retains coordinates, empty rows, hidden row values, extra cells outside reported dimensions',()=>{const book=utils.book_new();utils.book_append_sheet(book,{'!ref':'B2:B2',B2:{t:'s',v:'001'},D4:{t:'s',v:'tail'},'!rows':[{hidden:true}]},'Data');expect(parse(exportSheet(book,0,'raw',',',false).csv)).toEqual([['','','',''],['','001','',''],['','','',''],['','','','tail']]);});
 it('rejects excessive dimensions and invalid sheets instead of truncating',()=>{const book=fixture();book.Sheets.Data['!ref']='A1:XFD1048576';expect(()=>exportSheet(book,0,'raw',',',false)).toThrow(/truncated/);expect(()=>exportSheet(book,-1,'raw',',',false)).toThrow(/available/);});
 it('rejects wrong extensions, empty, huge, encrypted-like and renamed text files',async()=>{
  expect(()=>validateExcelFile({name:'a.xlsm',size:10})).toThrow(/not supported/);expect(()=>validateExcelFile({name:'a.xls',size:0})).toThrow(/empty/);expect(()=>validateExcelFile({name:'a.xls',size:EXCEL_LIMITS.bytes+1})).toThrow(/5 MB/);
  await expect(openWorkbook(new TextEncoder().encode('id,note\n1,2'),'xls')).rejects.toThrow(/container/);await expect(openWorkbook(legacyWorkbook([['x']]),'xlsx')).rejects.toThrow(/Encrypted/);await expect(openWorkbook(new Uint8Array([1,2,3]),'xlsx')).rejects.toThrow(/container/);
 });
 it('rejects ZIP corruption, expansion limits, mismatched sizes and duplicated paths',async()=>{
  const original=bytes(fixture(),'xlsx',false);const end=original.length-22,view=new DataView(original.buffer);const directory=view.getUint32(end+16,true);
  const expanded=original.slice();new DataView(expanded.buffer).setUint32(directory+24,EXCEL_LIMITS.expanded+1,true);await expect(openWorkbook(expanded,'xlsx')).rejects.toThrow(/32 MB/);
  const corrupted=original.slice();corrupted[35]^=1;await expect(openWorkbook(corrupted,'xlsx')).rejects.toThrow();
  const shortened=original.slice();new DataView(shortened.buffer).setUint32(directory+24,1,true);await expect(openWorkbook(shortened,'xlsx')).rejects.toThrow(/declared size/);
 });
 it('rejects oversized sheet count and malformed Office archives',async()=>{const book=utils.book_new();for(let i=0;i<51;i++)utils.book_append_sheet(book,{},'s'+i);await expect(openWorkbook(bytes(book),'xlsx')).rejects.toThrow(/50 worksheets/);});
});
