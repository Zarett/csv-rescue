import { readFileSync } from 'node:fs';
import { expect,it } from 'vitest';
import { parseCSV } from '../src/csv/parse';
import { proposeQuoteRepair } from '../src/csv/repair';
import { analyze } from '../src/csv/analyze';
import { clean,noChanges } from '../src/csv/clean';
import { serialize,formulaChanges } from '../src/csv/export';
it('explains maximum field count 12 → 8 as parsing correction, with no columns removed',()=>{
  const text=readFileSync('tests/fixtures/quote-width.csv','utf8');const before=parseCSV(text);const proposal=proposeQuoteRepair(text,',');const after=parseCSV(proposal.text,',');
  expect(analyze(before.rows,true).width).toBe(12);expect(analyze(after.rows,true).width).toBe(8);expect(after.structural).toBe(false);
  const result=clean(after.rows,true,noChanges);expect(result.removedColumns).toBe(0);expect(result.rows).toHaveLength(5);expect(result.rows.at(-1)?.at(-1)).toBe('EXTRA');
  expect(parseCSV(serialize(result.rows,',')).rows).toEqual(result.rows);expect(analyze(before.rows,true).width).toBe(12);
});
it('does not split a valid multiline note that resembles a complete record while repairing another row',()=>{
  const raw='id,note\n1,"first\n2,looks like a row\nlast"\n3,"bad "quote" inside"';
  const proposal=proposeQuoteRepair(raw,',');const parsed=parseCSV(proposal.text,',');
  expect(parsed.rows).toEqual([['id','note'],['1','first\n2,looks like a row\nlast'],['3','bad "quote" inside']]);
  expect(proposal.edits.map(e=>e.line)).toEqual([5]);expect(parsed.structural).toBe(false);
});
it('repair only changes quote characters and preserves all other text and physical line endings',()=>{
  const raw='\uFEFFid,note\r\n1,"open\r\n2,next\r\n3,"bad "quote" inside"\r\n';const proposed=proposeQuoteRepair(raw,',');
  expect(proposed.text.replaceAll('"','')).toBe(raw.replaceAll('"',''));expect(proposeQuoteRepair(proposed.text,',').edits).toHaveLength(0);
});
it('reports short and extra records independently without modifying values',()=>{
  const rows=[['id','email','age'],['1'],['2','invalid','twenty','EXTRA']];const a=analyze(rows,true);
  expect(a.shortRows).toEqual([2]);expect(a.longRows).toEqual([3]);expect(clean(rows,true,noChanges).rows).toEqual(rows);
});
it('safe-export feedback counts exactly the intentional value changes, including headers and negatives',()=>{
  const rows=[['=header','age','amount'],['@name','-5','-12.50'],['safe','0','  =1']];expect(formulaChanges(rows)).toBe(5);
  const normal=parseCSV(serialize(rows,','),',').rows;expect(normal).toEqual(rows);
  const safe=parseCSV(serialize(rows,',',true),',').rows;expect(safe).toEqual([["'=header",'age','amount'],["'@name","'-5","'-12.50"],['safe','0',"'  =1"]]);
});
