import { it, expect } from 'vitest';
import { proposeQuoteRepair } from '../src/csv/repair';
import { parseCSV } from '../src/csv/parse';
it('closes a missing quote before a plausible record and escapes inner quotes', () => {
  const raw = 'id,name,note\r\n11,Test,"Unclosed quote\r\n12,Next,Following record\r\n17,Other,"Multi-line\r\nnote that is valid"\r\n20,Last,"Bad "quote" inside field"\r\n';
  const proposed = proposeQuoteRepair(raw, ',');
  expect(proposed.edits.map(e => e.line)).toEqual([2,6]);
  expect(parseCSV(proposed.text).structural).toBe(false);
  expect(parseCSV(proposed.text).rows).toEqual([['id','name','note'],['11','Test','Unclosed quote'],['12','Next','Following record'],['17','Other','Multi-line\r\nnote that is valid'],['20','Last','Bad "quote" inside field']]);
  expect(raw).toContain('"Unclosed quote\r\n');
});
it.each([',',';','\t','|'])('supports delimiter %s', d => { const p = proposeQuoteRepair(`id${d}note\n1${d}"open\n2${d}next`,d); expect(parseCSV(p.text,d).rows).toHaveLength(3); });
it('keeps valid quoted, escaped and multiline fields byte-identical', () => { const raw = '\uFEFFid,note\n1,"hello, ""friend"""\n2,"first\nsecond"\n'; const p = proposeQuoteRepair(raw,','); expect(p.text).toBe(raw); expect(p.edits).toEqual([]); });
it('closes at end of file and is idempotent', () => { const p = proposeQuoteRepair('id,note\n1,"unfinished',','); expect(p.text).toBe('id,note\n1,"unfinished"'); expect(proposeQuoteRepair(p.text,',').edits).toEqual([]); });
it('does not pad short rows or truncate long ones', () => { const p = proposeQuoteRepair('id,note\n1,"open\n2,next\n3,extra,value\n4',','); expect(parseCSV(p.text,',').rows.slice(-2)).toEqual([['3','extra','value'],['4']]); });
it('keeps unquoted literal quotes intact', () => expect(proposeQuoteRepair('id,note\n1,an inch"',',').text).toBe('id,note\n1,an inch"'));
