import { it, expect } from 'vitest';
import { parseCSV } from '../src/csv/parse';
import { clean, noChanges } from '../src/csv/clean';
import { serialize } from '../src/csv/export';
it('preserves trailing blank records through CSV export', () => {
  const rows = parseCSV('name\nAlpha\n\n').rows;
  expect(rows).toEqual([['name'],['Alpha'],['']]);
  expect(parseCSV(serialize(rows,',')).rows).toEqual(rows);
});
it('keeps blank records when only duplicate removal is selected', () => {
  const rows = [['name'],[''],[''],['Alpha'],['Alpha']];
  expect(clean(rows,true,{...noChanges,duplicates:true}).rows).toEqual([['name'],[''],[''],['Alpha']]);
});
it('never pads or truncates uneven records during export', () => {
  const rows = [['a','b'],['one'],['two','three','EXTRA'],['','']];
  expect(parseCSV(serialize(rows,';'),';').rows).toEqual(rows);
});
it.each(Array.from({length:16},(_,i)=>i))('keeps source immutable and restores all values after toggle combination %i', mask => {
  const rows = parseCSV('name,value,unused\n Alpha ,0,\nAlpha,0,\n,,\n,,\nBeta,,\nshort\nExtra,2,,keep').rows;
  const snapshot = JSON.stringify(rows);
  const options = {trim:!!(mask&1),emptyRows:!!(mask&2),emptyColumns:!!(mask&4),duplicates:!!(mask&8)};
  const proposed = clean(rows,true,options);
  expect(JSON.stringify(rows)).toBe(snapshot);
  expect(clean(rows,true,noChanges).rows).toEqual(rows);
  expect(proposed.rows.some(r=>r.includes('keep'))).toBe(true);
  expect(proposed.rows.some(r=>r.includes('0'))).toBe(true);
  expect(parseCSV(serialize(proposed.rows,',')).rows).toEqual(proposed.rows);
});
it('keeps quoted delimiters, HTML-like text and whitespace when cleanup is off', () => {
  const rows = parseCSV('name,note\n" A, B ","<script>alert(1)</script>"').rows;
  expect(clean(rows,true,noChanges).rows[1]).toEqual([' A, B ','<script>alert(1)</script>']);
});
it.each(['','\n','\uFEFF','  \r\n\t'])('rejects blank input %j', raw => expect(()=>parseCSV(raw)).toThrow('empty'));
