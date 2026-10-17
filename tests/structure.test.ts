import {it,expect} from 'vitest';
import {clean,noChanges} from '../src/csv/clean';
import {analyze} from '../src/csv/analyze';
import {parseCSV} from '../src/csv/parse';
import {serialize} from '../src/csv/export';
const source=[['id','note'],['1'],['2','value','EXTRA'],['3','']];
it('refuses excessive padding with explicit feedback while retaining values',()=>{
 const rows=[Array.from({length:1000},(_,i)=>`c${i}`),...Array.from({length:3000},()=>['KEEP'])];const r=clean(rows,true,{...noChanges,padRows:true});expect(r.alignmentWarning).toContain('Padding was not applied');expect(r.addedEmptyFields).toBe(0);expect(r.rows[1]).toEqual(['KEEP']);
});
it('adds only explicitly selected empty fields; extra values stay untouched',()=>{
 const result=clean(source,true,{...noChanges,padRows:true});expect(result.rows).toEqual([['id','note'],['1',''],['2','value','EXTRA'],['3','']]);expect(result.addedEmptyFields).toBe(1);expect(analyze(result.rows,true).longRows).toEqual([3]);
});
it('names extras and pads to the expanded header without inventing values',()=>{
 const r=clean(source,true,{...noChanges,padRows:true,nameExtras:true});expect(r.rows).toEqual([['id','note','Extra field 3'],['1','',''],['2','value','EXTRA'],['3','','']]);expect(r.addedEmptyFields).toBe(3);expect(r.addedHeaderNames).toEqual(['Extra field 3']);expect(analyze(r.rows,true).uneven).toEqual([]);expect(parseCSV(serialize(r.rows,',')).rows).toEqual(r.rows);expect(clean(source,true,noChanges).rows).toEqual(source);
});
it('header naming alone does not silently pad short rows',()=>{const r=clean(source,true,{...noChanges,nameExtras:true});expect(r.rows[1]).toEqual(['1']);expect(r.addedEmptyFields).toBe(0);expect(analyze(r.rows,true).shortRows).toHaveLength(2);});
it('avoids header name collisions and handles no-header mode',()=>{
 const r=clean([['Extra field 2'],['x','y']],true,{...noChanges,nameExtras:true,padRows:true});expect(r.rows[0]).toEqual(['Extra field 2','Extra field 2 (2)']);
 const n=clean([['x'],['y','z']],false,{...noChanges,padRows:true,nameExtras:true});expect(n.rows).toEqual([['x',''],['y','z']]);expect(n.addedHeaderNames).toEqual([]);
});
it.each(Array.from({length:64},(_,i)=>i))('preserves source and extra values across six-option combination %i',mask=>{
 const rows=[['id','value','unused'],[' x ','0',''],['x','0',''],['','',''],['short'],['long','1','','KEEP']];const snapshot=JSON.stringify(rows);
 const r=clean(rows,true,{trim:!!(mask&1),emptyRows:!!(mask&2),emptyColumns:!!(mask&4),duplicates:!!(mask&8),padRows:!!(mask&16),nameExtras:!!(mask&32)});
 expect(JSON.stringify(rows)).toBe(snapshot);expect(r.rows.some(row=>row.includes('KEEP'))).toBe(true);expect(parseCSV(serialize(r.rows,',')).rows).toEqual(r.rows);expect(clean(rows,true,noChanges).rows).toEqual(rows);
 if((mask&48)===48)expect(analyze(r.rows,true).uneven).toEqual([]);
});
