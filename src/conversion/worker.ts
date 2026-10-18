import { conversionRows, CONVERSION_LIMITS } from './csv';
import { textWorkbook } from './workbook';
self.onmessage = async ({ data }: MessageEvent<{ file: File; delimiter: string }>) => {
  try {
    if (data.file.size > CONVERSION_LIMITS.bytes) throw new Error('Conversion supports files up to 2 MB.');
    let text: string;
    // Retain the signature here; Papa normalizes it once during CSV parsing.
    // A second U+FEFF belongs to the first field and must survive conversion.
    try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await data.file.arrayBuffer()); }
    catch { throw new Error('This file is not valid UTF-8. Save it as UTF-8 before converting.'); }
    const parsed = conversionRows(text, data.delimiter);
    const bytes = textWorkbook(parsed.rows);
    if (bytes.byteLength > 20 * 1024 * 1024) throw new Error('The workbook exceeds the 20 MB output limit. No partial download was created.');
    self.postMessage({ bytes, rows: parsed.rows.length, columns: parsed.width, fields: parsed.fields, preview: parsed.rows.slice(0, 5).map(row => row.slice(0, 8)) }, { transfer: [bytes] });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Conversion failed. Your original file has not changed.' });
  }
};
