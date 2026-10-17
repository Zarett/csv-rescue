import Papa from 'papaparse';
export const MAX_BYTES = 10 * 1024 * 1024;
export type Rows = readonly (readonly string[])[];
export interface Dataset { rows: Rows; delimiter: string; warnings: string[]; structural: boolean }
export function validateFile(file: Pick<File, 'name' | 'size' | 'type'>) {
  if (file.size > MAX_BYTES) throw new Error('This file exceeds the 10 MB limit.');
  if (!/\.(csv|txt|tsv)$/i.test(file.name) && !['text/plain','text/csv','text/tab-separated-values'].includes(file.type)) throw new Error('Choose a CSV, TSV, or plain-text file.');
}
export function parseCSV(text: string, delimiter = ''): Dataset {
  if (!text.trim()) throw new Error('This file is empty. Choose a file containing CSV data.');
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { delimiter, delimitersToGuess: [',',';','\t','|'], skipEmptyLines: false });
  const rows = result.data;
  // A final record separator is formatting, not an additional blank record.
  if (/\r?\n$/.test(text) && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === '') rows.pop();
  const errors = result.errors.filter(e => e.code !== 'UndetectableDelimiter');
  const warnings = errors.map(e => `CSV parsing warning${e.row === undefined ? '' : ` near record ${e.row + 1}`}: ${e.message}`);
  if (text.includes('\uFFFD') || text.includes('\0')) warnings.push('This content may use an unsupported encoding. Only UTF-8 is supported; no encoding repair has been applied.');
  return { rows: Object.freeze(rows.map(r => Object.freeze([...r]))), delimiter: result.meta.delimiter || delimiter || ',', warnings, structural: errors.length > 0 };
}
