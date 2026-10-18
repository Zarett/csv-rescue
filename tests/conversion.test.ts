import { describe, it, expect } from 'vitest';
import { conversionRows, validateConversionFile, CONVERSION_LIMITS } from '../src/conversion/csv';
import { textWorkbook } from '../src/conversion/workbook';
import { independentCells, unzip } from './helpers/xlsx';
describe('CSV conversion stays independent and preserves text', () => {
 it.each(['_x0041_x0042_', '_x005F_x0041_', '_x0041_x0042_x0043_', '_x0041__x0042_', '_X0041_x000D_', '_x005F_', 'plain_underscores'])('preserves overlapping OOXML-like text %j', value => {
  expect(independentCells(new Uint8Array(textWorkbook([[value]])))).toEqual([{address:'A1',value}]);
 });
 it.each([0,1,2,3])('normalizes only one of %i leading BOM characters', count => {
  const text='\uFEFF'.repeat(count)+'00123,note\n';
  const expected='\uFEFF'.repeat(Math.max(0,count-1))+'00123';
  expect(conversionRows(text).rows[0][0]).toBe(expected);
  expect(independentCells(new Uint8Array(textWorkbook(conversionRows(text).rows)))[0].value).toBe(expected);
 });
 it('retains U+FEFF inside quoted and later fields',()=>{
  expect(conversionRows('\uFEFF"\uFEFF00123",\uFEFFnote\n').rows).toEqual([['\uFEFF00123','\uFEFFnote']]);
 });
 it('independently verifies XLSX ZIP/XML text cells and their positions', () => {
  const rows=[['00123','12345678901234567890','01/02/2026','-12.50','  edge  ','=SUM(A1:A2)','+1','@name','Español 😀','line\nnext','a,b','<tag>&"','','a\rb','a\r\nb','_x0041_','_x005F_','\ttext'],['duplicate','duplicate'],[],['last']];
  const before=JSON.stringify(rows), bytes=new Uint8Array(textWorkbook(rows));
  expect(independentCells(bytes).map(c=>c.value)).toEqual(rows.flat());
  expect(independentCells(bytes).at(-1)?.address).toBe('A4');
  expect(unzip(bytes)['xl/workbook.xml']).toContain('CSV data');
  expect(JSON.stringify(rows)).toBe(before);
 });
 it.each([',',';','\t','|'])('handles delimiter %j with quoted and multiline values', delimiter => {
  const text=`\uFEFFid${delimiter}note\r\n001${delimiter}"a${delimiter}b\nnext"\r\n`;
  expect(conversionRows(text,delimiter).rows).toEqual([['id','note'],['001',`a${delimiter}b\nnext`]]);
 });
 it('retains whitespace, duplicates, empty records and extra fields without cleaning', () => {
  expect(conversionRows('a,b\n 1 ,\n 1 ,\n\nx,y,z\n').rows).toEqual([['a','b'],[' 1 ',''],[' 1 ',''],[''],['x','y','z']]);
 });
 it('supports CR record separators and quoted CRLF values without adding a trailing record',()=>{
  expect(conversionRows('a,b\r1,"line\r\nnext"\r').rows).toEqual([['a','b'],['1','line\r\nnext']]);
 });
 it('rejects bad quoting without invoking heuristic repairs', () => { expect(()=>conversionRows('a,b\n1,"unclosed')).toThrow(/Malformed/); });
 it('rejects unsafe dimensions, long cells and unsupported controls without truncation', () => {
  expect(()=>conversionRows('x,'.repeat(256)+'x')).toThrow(/limit/);
  expect(()=>conversionRows('x'.repeat(32768))).toThrow(/truncated/);
  expect(()=>conversionRows('a,\0')).toThrow(/control/);
  expect(()=>conversionRows('x\n'.repeat(100001))).toThrow(/limit/);
  expect(()=>conversionRows(Array(1000).fill(Array(201).fill('x').join(',')).join('\n'))).toThrow(/limit/);
 });
 it('validates empty, unsupported and large inputs', () => {
  expect(()=>validateConversionFile({name:'a.xlsx',size:10})).toThrow(/not supported/);
  expect(()=>validateConversionFile({name:'a.csv',size:CONVERSION_LIMITS.bytes+1})).toThrow(/2 MB/);
  expect(()=>validateConversionFile({name:'a.csv',size:0})).toThrow(/empty/);
  expect(()=>conversionRows(' \n')).toThrow(/empty/);
  expect(()=>conversionRows('a',':')).toThrow(/delimiter/);
 });
 it('accepts exact row and field limits with a final newline',()=>{
  expect(conversionRows('x\n'.repeat(100000)).rows).toHaveLength(100000);
  expect(conversionRows(('x,x\n').repeat(100000)).fields).toBe(200000);
 });
 it('rejects escape-expanded oversized cells rather than altering or truncating them',()=>{expect(()=>textWorkbook([['_x0041_'.repeat(4000)]])).toThrow(/No values were truncated/);});
});
