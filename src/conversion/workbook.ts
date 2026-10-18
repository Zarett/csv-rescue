import { utils, write } from 'xlsx';
export function textWorkbook(rows: readonly (readonly string[])[]): ArrayBuffer {
  // OOXML interprets _xNNNN_ sequences as character escapes. Protect literal
  // sequences before the writer's XML encoding, without changing working values.
  const sheet = utils.aoa_to_sheet(rows.map(row => row.map(value => {
    // Consume only the underscore: adjacent escape-like tokens can share it.
    const encoded = value.replace(/_(?=x[\da-f]{4}_)/gi, '_x005F_');
    if (encoded.length > 32767) throw new Error('A value exceeds Excel’s text limit after escape encoding. No values were truncated.');
    return encoded;
  })));
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, sheet, 'CSV data');
  // Explicit strings, shared strings (including empty strings), no formula/type inference.
  return write(workbook, { type: 'array', bookType: 'xlsx', compression: true, bookSST: true }) as ArrayBuffer;
}
