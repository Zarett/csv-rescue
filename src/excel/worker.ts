import { openWorkbook, sheetList, exportSheet } from './workbook';
import { validateExcelFile, type ValueMode } from './types';
let book:Awaited<ReturnType<typeof openWorkbook>>|null=null;
self.onmessage=async({data}:MessageEvent<{id:number;file?:File;index?:number;mode?:ValueMode;delimiter?:string;safe?:boolean}>)=>{
  try {
    if(data.file){book=null;validateExcelFile(data.file);book=await openWorkbook(new Uint8Array(await data.file.arrayBuffer()),/\.xlsx$/i.test(data.file.name)?'xlsx':'xls');self.postMessage({id:data.id,sheets:sheetList(book)});}
    else {if(!book)throw new Error('Choose a workbook first.');const result=exportSheet(book,data.index!,data.mode!,data.delimiter!,data.safe!);self.postMessage({id:data.id,result});}
  }catch(error){self.postMessage({id:data.id,error:error instanceof Error?error.message:'Workbook conversion failed. Your original file has not changed.'});}
};
