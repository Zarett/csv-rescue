import type { Rows } from './parse';
import { blank } from './analyze';
export interface Options { trim: boolean; emptyRows: boolean; emptyColumns: boolean; duplicates: boolean; padRows?: boolean; nameExtras?: boolean }
export const noChanges: Options = { trim: false, emptyRows: false, emptyColumns: false, duplicates: false, padRows: false, nameExtras: false };
// Original → trim → empty rows → empty columns → extend header → pad → duplicates.
export function clean(rows: Rows, header: boolean, options: Options) {
  let modifiedCells = 0;
  let data = rows.slice(header ? 1 : 0).map((r, i) => ({ record: i + (header ? 2 : 1), cells: r.map(v => { const next = options.trim ? v.trim() : v; if (next !== v) modifiedCells++; return next; }) }));
  if (options.emptyRows) data = data.filter(r => !r.cells.every(blank));
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const removedColumns = options.emptyColumns && data.length ? Array.from({length: width}, (_, c) => c).filter(c => data.every(r => blank(r.cells[c] ?? ''))) : [];
  const keep = (r: readonly string[]) => r.filter((_, c) => !removedColumns.includes(c));
  data = data.map(r => ({ ...r, cells: keep(r.cells) }));
  const heading = header && rows.length ? keep(rows[0]) : null;
  const addedHeaderNames: string[] = [];
  const usedNames = new Set(heading ?? []);
  const currentWidth = data.reduce((max,r)=>Math.max(max,r.cells.length),heading?.length ?? 0);
  if (heading && options.nameExtras) {
    while (heading.length < currentWidth) {
      const base = `Extra field ${heading.length + 1}`;
      let name = base, suffix = 2;
      while (usedNames.has(name)) name = `${base} (${suffix++})`;
      heading.push(name); usedNames.add(name); addedHeaderNames.push(name);
    }
  }
  let addedEmptyFields = 0;
  let alignmentWarning = '';
  if (options.padRows) {
    const target = heading?.length ?? currentWidth;
    const added = data.reduce((n,r)=>n+Math.max(0,target-r.cells.length),0);
    const projected = data.reduce((n,r)=>n+Math.max(target,r.cells.length),0);
    if (added > 0 && projected > 2_000_000) alignmentWarning = 'Padding was not applied: the expanded result would exceed 2 million data fields. Existing values are retained; structural issues may remain.';
    else data = data.map(r=>{ const cells=[...r.cells]; while(cells.length < target) {cells.push('');addedEmptyFields++;} return {...r,cells}; });
  }
  if (options.duplicates) { const seen = new Set<string>(); data = data.filter(r => { if (r.cells.every(blank)) return true; const key = JSON.stringify(r.cells); if (seen.has(key)) return false; seen.add(key); return true; }); }
  const output = [...(heading ? [heading] : []), ...data.map(r => r.cells)];
  return { rows: output, records: data.map(r => r.record), removedRows: rows.length - output.length, removedColumns: removedColumns.length, modifiedCells, addedEmptyFields, addedHeaderNames, alignmentWarning };
}
