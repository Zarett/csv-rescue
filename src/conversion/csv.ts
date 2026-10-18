import Papa from 'papaparse';
export const CONVERSION_LIMITS = { bytes: 2 * 1024 * 1024, rows: 100_000, columns: 256, cells: 200_000, cellLength: 32_767 } as const;
export const SAMPLE_CSV = 'id,name,date,amount,note\r\n00123,Español 😀,01/02/2026,-12.50,"  keep spaces  "\r\n12345678901234567890,Alice,2026-10-18,-5,"=SUM(A1:A2)"\r\n';
export function validateConversionFile(file: Pick<File, 'name' | 'size'>) {
  if (!/\.(csv|tsv|txt)$/i.test(file.name)) throw new Error('Choose a CSV, TSV, or UTF-8 text file. Excel imports are not supported.');
  if (file.size > CONVERSION_LIMITS.bytes) throw new Error('Conversion supports files up to 2 MB. Your original file has not changed.');
  if (!file.size) throw new Error('This file is empty. Choose a CSV containing values.');
}
export function conversionRows(text: string, delimiter = '') {
  if (!['', ',', ';', '\t', '|'].includes(delimiter)) throw new Error('Unsupported delimiter.');
  if (!text.trim()) throw new Error('This file is empty. Choose a CSV containing values.');
  const rows: string[][] = [];
  let fields = 0, detected = delimiter || ',', problem = '';
  // Papa removes exactly one leading signature. Do not strip another here.
  Papa.parse<string[]>(text, {
    delimiter, delimitersToGuess: [',', ';', '\t', '|'], skipEmptyLines: false,
    step(result, parser) {
      detected = result.meta.delimiter || detected;
      if (result.errors.some(e => e.code !== 'UndetectableDelimiter')) problem = 'Malformed CSV quoting. Review and repair the file in CSV Rescue before converting.';
      const row = result.data;
      fields += row.length;
      // Allow one possible final separator record; check exact counts after removing it.
      if (row.length > CONVERSION_LIMITS.columns || rows.length > CONVERSION_LIMITS.rows || fields > CONVERSION_LIMITS.cells + 1) problem = 'Conversion limit exceeded: 100,000 rows, 256 columns, or 200,000 fields. No partial workbook was created.';
      if (row.some(value => value.length > CONVERSION_LIMITS.cellLength)) problem = 'A value exceeds Excel’s 32,767-character cell limit. No values were truncated.';
      if (row.some(value => /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u.test(value))) problem = 'Unsupported control characters found. No characters were removed.';
      if (problem) { parser.abort(); return; }
      rows.push([...row]);
    }
  });
  if (problem) throw new Error(problem);
  if (/[\r\n]$/.test(text) && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === '') rows.pop();
  if (rows.length > CONVERSION_LIMITS.rows || rows.reduce((n, row) => n + row.length, 0) > CONVERSION_LIMITS.cells) throw new Error('Conversion limit exceeded. No partial workbook was created.');
  return { rows, delimiter: detected, width: rows.reduce((n, row) => Math.max(n, row.length), 0), fields: rows.reduce((n, row) => n + row.length, 0) };
}
