import { read, utils, type WorkBook, type WorkSheet, type CellObject } from 'xlsx';
import { serialize, formulaLike } from '../csv/export';
import { EXCEL_LIMITS, type SheetInfo, type SheetResult, type ValueMode } from './types';
import { inspectContainer } from './container';
import { missingLegacyCaches } from './legacy-caches';

export async function openWorkbook(bytes: Uint8Array, extension: 'xlsx' | 'xls'): Promise<WorkBook> {
  let missing=new Map<number,string[]>();
  const input=await inspectContainer(bytes,extension,cells=>{missing=cells;});
  if(extension==='xls')missing=missingLegacyCaches(input);
  // No HTML rendering, macros, formula evaluation, link following or network APIs.
  let book: WorkBook;
  try {book=read(input,{type:'array',cellFormula:true,cellHTML:false,cellNF:true,cellText:true,cellDates:false,bookVBA:false,WTF:true});}
  catch {throw new Error('This workbook could not be read. It may be damaged, encrypted or unsupported. No partial CSV was created.');}
  if(!book.SheetNames.length || book.SheetNames.length>EXCEL_LIMITS.sheets) throw new Error('Choose a workbook with 1–50 worksheets.');
  for(const [index,cells]of missing){const sheet=book.Sheets[book.SheetNames[index]];if(sheet)sheet['!missingFormulaCaches']=cells;}
  return book;
}
export function sheetList(book:WorkBook):SheetInfo[] {
  return book.SheetNames.map((name,i)=>({name,hidden:!!book.Workbook?.Sheets?.[i]?.Hidden}));
}
function bounds(sheet:WorkSheet) {
  // Include actual cells even if a third-party producer understates !ref.
  let row=-1,column=-1;
  const include=(r:number,c:number)=>{row=Math.max(row,r);column=Math.max(column,c);};
  for(const address of Object.keys(sheet))if(/^[A-Z]+[1-9]\d*$/.test(address)){const cell=utils.decode_cell(address);include(cell.r,cell.c);}
  for(const address of sheet['!missingFormulaCaches']||[]){const cell=utils.decode_cell(address);include(cell.r,cell.c);}
  for(const ref of [sheet['!ref'],sheet['!fullref']])if(ref){const range=utils.decode_range(ref);include(range.e.r,range.e.c);}
  for(const merge of sheet['!merges']||[])include(merge.e.r,merge.e.c);
  const rows=row+1,columns=column+1;
  if(!Number.isSafeInteger(rows)||!Number.isSafeInteger(columns)||rows>EXCEL_LIMITS.rows||columns>EXCEL_LIMITS.columns||rows*columns>EXCEL_LIMITS.fields) throw new Error('Selected worksheet exceeds 100,000 rows, 256 columns or 200,000 output fields. No values were truncated.');
  return {rows,columns};
}
function cellText(cell:CellObject|undefined,mode:ValueMode) {
  if(!cell || cell.v==null || cell.t==='z')return '';
  if(cell.t==='s')return String(cell.v);
  if(cell.t==='e')return cell.w ?? utils.format_cell({...cell});
  if(mode==='formatted')return cell.w ?? utils.format_cell({...cell});
  if(cell.t==='b')return cell.v?'TRUE':'FALSE';
  return String(cell.v);
}
export function exportSheet(book:WorkBook,index:number,mode:ValueMode,delimiter:string,safe:boolean):SheetResult {
  if(!Number.isInteger(index)||index<0||index>=book.SheetNames.length)throw new Error('Select an available worksheet.');
  if(!['formatted','raw'].includes(mode)||![',',';','\t','|'].includes(delimiter))throw new Error('Unsupported export setting.');
  const sheet=book.Sheets[book.SheetNames[index]];
  if(!sheet || (sheet['!type'] && sheet['!type']!=='sheet'))throw new Error('This tab is not a data worksheet. Choose another worksheet.');
  const {rows,columns}=bounds(sheet);let formulas=0,missingResults=0,errors=0,risky=0,changed=0,hasStoredValue=false;
  const missing=new Set<string>(sheet['!missingFormulaCaches']||[]);
  const values:string[][]=[];
  for(let r=0;r<rows;r++) {
    const row:string[]=[];
    for(let c=0;c<columns;c++) {
      const address=utils.encode_cell({r,c}),cell=sheet[address] as CellObject|undefined;
      if(cell&&(cell.f||cell.F||(cell.v!=null&&cell.t!=='z')))hasStoredValue=true;
      if(missing.has(address)){formulas++;missingResults++;hasStoredValue=true;}
      else if(cell?.f || cell?.F){formulas++;if(cell.v==null||cell.t==='z')missingResults++;}
      if(cell?.t==='e')errors++;
      let text=missing.has(address)?'':cellText(cell,mode);
      // Numeric negatives stay numeric text; risky strings are changed only on opt-in.
      const numeric=cell?.t==='n' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text);
      if(formulaLike(text)&&!numeric){risky++;if(safe){text="'"+text;changed++;}}
      row.push(text);
    }
    values.push(row);
  }
  const csv=missingResults?'':serialize(values,delimiter,false);
  if(new TextEncoder().encode(csv).length>EXCEL_LIMITS.output)throw new Error('CSV output exceeds 20 MB. No partial download was created.');
  return {rows,columns,preview:values.slice(0,5).map(row=>row.slice(0,8)),formulas,missingResults,errors,merges:sheet['!merges']?.length||0,risky,changed,csv,empty:!hasStoredValue};
}
