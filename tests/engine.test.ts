import { describe, it, expect } from 'vitest';
import { parseCSV, validateFile, MAX_BYTES } from '../src/csv/parse';
import { analyze } from '../src/csv/analyze';
import { clean, noChanges } from '../src/csv/clean';
import { serialize } from '../src/csv/export';
describe('CSV parser', () => {
  it.each([',',';','\t','|'])('detects delimiter %s', d => expect(parseCSV(`a${d}b\n1${d}2`).rows).toEqual([['a','b'],['1','2']]));
  it('handles BOM, CRLF, escaped quotes and multiline fields', () => expect(parseCSV('\uFEFFname,note\r\nAda,"line 1\n""quoted"""\r\n').rows).toEqual([['name','note'],['Ada','line 1\n"quoted"']]));
  it('allows overriding detection and keeps trailing empty fields', () => expect(parseCSV('a;b;\n1;2;',';').rows[1]).toEqual(['1','2','']));
  it('reports malformed quotes without discarding records', () => { const p = parseCSV('a,b\n1,"unfinished'); expect(p.structural).toBe(true); expect(p.rows[1]).toEqual(['1','unfinished']); });
  it('rejects empty input', () => expect(() => parseCSV(' \n')).toThrow('empty'));
  it('warns about suspicious encoding', () => expect(parseCSV('a\n�').warnings.length).toBe(1));
  it('validates file size and type', () => { expect(() => validateFile({name:'x.csv',type:'',size:MAX_BYTES+1})).toThrow('10 MB'); expect(() => validateFile({name:'x.exe',type:'',size:1})).toThrow('Choose'); expect(() => validateFile({name:'x.txt',type:'text/plain',size:2})).not.toThrow(); });
});
describe('analysis and immutable cleaning', () => {
  const rows = parseCSV('name,value,unused\n Ada ,0,\nAda,0,\nAda,0,\n , ,\nBea,,\nshort').rows;
  it('detects issues across all rows, excludes empty rows from missing/duplicates', () => { const a = analyze(rows,true); expect(a.data).toHaveLength(6); expect(a.width).toBe(3); expect(a.duplicates).toEqual([4]); expect(a.emptyRows).toEqual([5]); expect(a.emptyColumns).toEqual([2]); expect(a.uneven).toEqual([7]); expect(a.missing).toHaveLength(5); expect(a.whitespace).toEqual(['2:0']); expect(a.missing).not.toContain('2:1'); });
  it('treats all rows as data without a header', () => { expect(analyze([['a'],['a']],false).duplicates).toEqual([2]); expect(analyze([['a'],['a']],true).duplicates).toEqual([]); });
  it('reports duplicate headers', () => expect(analyze([['a','a'],['1','2']],true).duplicateHeaders).toEqual(['a']));
  it('uses documented order and restores original when disabled', () => { const result = clean(rows,true,{trim:true,emptyRows:true,emptyColumns:true,duplicates:true}); expect(result.rows).toEqual([['name','value'],['Ada','0'],['Bea',''],['short']]); expect(result.removedRows).toBe(3); expect(result.removedColumns).toBe(1); expect(result.modifiedCells).toBe(3); expect(result.records).toEqual([2,6,7]); expect(clean(rows,true,noChanges).rows).toEqual(rows); expect(rows[1][0]).toBe(' Ada '); });
  it('retains partial rows and zero', () => expect(clean([['0',''],['',''],[' x ','0']],false,{...noChanges,emptyRows:true}).rows).toEqual([['0',''],[' x ','0']]));
  it('preserves header values when trimming', () => expect(clean([[' name '],[' x ']],true,{...noChanges,trim:true}).rows).toEqual([[' name '],['x']]));
  it('deduplicates after empty-column removal', () => expect(clean([['a',''],['a']],false,{...noChanges,emptyColumns:true,duplicates:true}).rows).toEqual([['a']]));
  it('handles a large row count', () => expect(analyze(Array.from({length:150000}, () => ['0']),false).data.length).toBe(150000));
});
describe('exports', () => {
  it('round trips data including quotes, missing values and multiline strings', () => { const rows = [['x','y'],['a,b','line\n"quote"'],['0','']]; expect(parseCSV(serialize(rows,',')).rows).toEqual(rows); });
  it('preserves formulas normally and neutralizes them only when opted in', () => { const rows = [['=1+1','+1','-2','@x','\tcmd',' safe','  =1']]; expect(parseCSV(serialize(rows,',')).rows).toEqual(rows); expect(parseCSV(serialize(rows,',',true)).rows[0]).toEqual(["'=1+1","'+1","'-2","'@x","'\tcmd",' safe',"'  =1"]); });
});
