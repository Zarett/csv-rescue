import Papa from 'papaparse';
import type { Rows } from './parse';
export const formulaLike = (value: string) => /^[=+\-@\t\r\n]|^\s+[=+\-@]/.test(value);
export const formulaChanges = (rows: Rows) => rows.reduce((count, row) => count + row.filter(formulaLike).length, 0);
export function serialize(rows: Rows, delimiter: string, safe = false) {
  // Quote empty values so a final empty record is not mistaken for a line ending.
  return Papa.unparse(rows.map(r => [...r]), { delimiter, newline: '\r\n', quotes: value => value === '', escapeFormulae: safe ? /^[=+\-@\t\r\n]|^\s+[=+\-@]/ : false });
}
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
