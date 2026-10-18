import {CFB,utils} from 'xlsx';
import {EXCEL_LIMITS} from './types';

// The BIFF reader can omit a formula if its required following STRING cache is
// absent. Retain that fact separately so export cannot silently drop the cell.
export function missingLegacyCaches(bytes:Uint8Array):Map<number,string[]> {
  const archive=CFB.read(bytes,{type:'array'});
  const entry=archive.FileIndex.find((file:{name:string})=>/^(Workbook|Book)$/i.test(file.name));
  if(!entry?.content)throw new Error('This XLS container has no readable workbook stream. Encrypted files are not supported.');
  if(entry.content.length>EXCEL_LIMITS.expanded)throw new Error('Legacy workbook stream exceeds the processing limit.');
  const data=new Uint8Array(entry.content),view=new DataView(data.buffer),sheets=new Map<number,number>(),missing=new Map<number,string[]>();
  let sheet=-1,pending:{sheet:number;address:string}|null=null;
  const flush=()=>{if(pending){const cells=missing.get(pending.sheet)||[];cells.push(pending.address);missing.set(pending.sheet,cells);pending=null;}};
  for(let at=0;at+4<=data.length;){
    const id=view.getUint16(at,true),length=view.getUint16(at+2,true),start=at+4;
    if(start+length>data.length)throw new Error('Damaged legacy workbook record. No partial CSV was created.');
    if(pending){if(id===0x0207)pending=null;else if(![0x04bc,0x0221,0x0236].includes(id))flush();}
    if(id===0x0085&&length>=8)sheets.set(view.getUint32(start,true),sheets.size);
    if(id===0x0809)sheet=sheets.get(at)??-1;
    if([0x0006,0x0206,0x0406].includes(id)&&sheet>=0){
      if(length<20)throw new Error('Damaged legacy formula record.');
      if(view.getUint16(start+12,true)===0xffff&&data[start+6]===0)pending={sheet,address:utils.encode_cell({r:view.getUint16(start,true),c:view.getUint16(start+2,true)})};
    }
    at=start+length;
  }
  flush();return missing;
}
