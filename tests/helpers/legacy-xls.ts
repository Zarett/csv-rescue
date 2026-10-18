// Synthetic BIFF8 + CFB fixture built independently of SheetJS's reader/writer.
// One worksheet, no styles: enough to test real Excel 97–2003 container/Unicode handling.
export function legacyWorkbook(rows:readonly (readonly (string|number|{cached:number|null})[])[]) {
  const u16=(v:number)=>{const b=Buffer.alloc(2);b.writeUInt16LE(v);return b;};
  const record=(id:number,data:Buffer)=>Buffer.concat([u16(id),u16(data.length),data]);
  const bof=(type:number)=>record(0x0809,Buffer.from([0,6,type,0,0xbb,0x0d,0xcc,0x07,0x41,0,0,0,6,0,0,0]));
  const eof=record(0x000a,Buffer.alloc(0));
  const name='Legacy';const bound=Buffer.alloc(8+name.length);bound[6]=name.length;bound.write(name,8,'ascii');
  const globals=[bof(5),record(0x0042,u16(1200)),record(0x0085,bound),eof];
  bound.writeUInt32LE(globals.reduce((n,b)=>n+b.length,0),0);globals[2]=record(0x0085,bound);
  const dim=Buffer.alloc(14);dim.writeUInt32LE(rows.length,4);dim.writeUInt16LE(Math.max(...rows.map(r=>r.length),0),10);
  const sheet=[bof(0x10),record(0x0200,dim)];
  rows.forEach((row,r)=>row.forEach((v,c)=>{const head=Buffer.concat([u16(r),u16(c),u16(0)]);if(typeof v==='object'){const number=Buffer.alloc(8);if(v.cached===null){number[6]=number[7]=255;}else number.writeDoubleLE(v.cached);const tokens=Buffer.from([0x1e,1,0,0x1e,1,0,0x03]);sheet.push(record(0x0006,Buffer.concat([head,number,Buffer.alloc(6),u16(tokens.length),tokens])));}else if(typeof v==='number'){const number=Buffer.alloc(8);number.writeDoubleLE(v);sheet.push(record(0x0203,Buffer.concat([head,number])));}else sheet.push(record(0x0204,Buffer.concat([head,u16(v.length),Buffer.from([1]),Buffer.from(v,'utf16le')])));}));
  sheet.push(eof);const stream=Buffer.concat([...globals,...sheet]);if(stream.length>4096)throw new Error('Fixture too large');
  const bytes=Buffer.alloc(512*11),header=bytes.subarray(0,512);Buffer.from('d0cf11e0a1b11ae1','hex').copy(header);
  header.writeUInt16LE(0x003e,24);header.writeUInt16LE(3,26);header.writeUInt16LE(0xfffe,28);header.writeUInt16LE(9,30);header.writeUInt16LE(6,32);
  header.writeUInt32LE(1,44);header.writeUInt32LE(1,48);header.writeUInt32LE(4096,56);header.writeUInt32LE(0xfffffffe,60);header.writeUInt32LE(0xfffffffe,68);
  for(let i=76;i<512;i+=4)header.writeUInt32LE(0xffffffff,i);header.writeUInt32LE(0,76);
  const fat=bytes.subarray(512,1024);for(let i=0;i<512;i+=4)fat.writeUInt32LE(0xffffffff,i);fat.writeUInt32LE(0xfffffffd,0);fat.writeUInt32LE(0xfffffffe,4);for(let i=2;i<=9;i++)fat.writeUInt32LE(i===9?0xfffffffe:i+1,i*4);
  function directory(offset:number,name:string,type:number,start:number,size:number,child=0xffffffff){const entry=bytes.subarray(1024+offset,1024+offset+128);Buffer.from(name+'\0','utf16le').copy(entry);entry.writeUInt16LE((name.length+1)*2,64);entry[66]=type;entry[67]=1;entry.writeUInt32LE(0xffffffff,68);entry.writeUInt32LE(0xffffffff,72);entry.writeUInt32LE(child,76);entry.writeUInt32LE(start,116);entry.writeUInt32LE(size,120);}
  directory(0,'Root Entry',5,0xfffffffe,0,1);directory(128,'Workbook',2,2,4096);stream.copy(bytes,1536);return bytes;
}
