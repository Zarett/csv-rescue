import type { Rows } from './parse';
export const blank = (value: string) => value.trim() === '';
export function analyze(rows: Rows, header: boolean) {
  const data = rows.slice(header ? 1 : 0);
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const expected = rows[0]?.length ?? 0;
  const emptyRows: number[] = [], duplicates: number[] = [], uneven: number[] = [], shortRows: number[] = [], longRows: number[] = [];
  const missing: string[] = [], whitespace: string[] = [];
  const missingColumns = new Set<number>();
  const seen = new Set<string>();
  data.forEach((row, i) => {
    const record = i + (header ? 2 : 1);
    const empty = row.every(blank);
    if (empty) emptyRows.push(record);
    else {
      const key = JSON.stringify(row);
      if (seen.has(key)) duplicates.push(record);
      seen.add(key);
      row.forEach((v, c) => { if (blank(v)) { missing.push(`${record}:${c}`); missingColumns.add(c); } if (v !== v.trim()) whitespace.push(`${record}:${c}`); });
    }
    if (row.length !== expected) uneven.push(record);
    if (row.length < expected) shortRows.push(record);
    if (row.length > expected) longRows.push(record);
  });
  const emptyColumns = Array.from({length: width}, (_, i) => i).filter(c => data.length > 0 && data.every(r => blank(r[c] ?? '')));
  const duplicateHeaders = header ? (rows[0] ?? []).filter((v, i, a) => a.indexOf(v) !== i) : [];
  return { data, width, expected, emptyRows, duplicates, uneven, shortRows, longRows, missing, whitespace, missingColumns: [...missingColumns], emptyColumns, duplicateHeaders,
    total: emptyRows.length + duplicates.length + missing.length + whitespace.length + emptyColumns.length + uneven.length + duplicateHeaders.length };
}
