import Papa from 'papaparse';
export interface QuoteEdit { line: number; reason: string; before: string; after: string }
function wellFormedEnd(text: string, start: number, delimiter: string) {
  for (let i = start; i < text.length; i++) {
    if (text[i] !== '"') continue;
    if (text[i + 1] === '"') { i++; continue; }
    const next = text[i + 1];
    return next === delimiter || next === '\r' || next === '\n' || next === undefined ? i : -1;
  }
  return -1;
}
/** Heuristic proposal only. Callers must show edits and require explicit opt-in. */
export function proposeQuoteRepair(text: string, delimiter: string) {
  const input = text.replace(/^\uFEFF/, '');
  const lines = input.split(/\r\n|\n|\r/);
  const first = Papa.parse<string[]>(lines[0], { delimiter }).data[0];
  const expected = first?.length ?? 0;
  let output = '', quoted = false, atStart = true, fields = 1, line = 1;
  let recordStart = 0;
  let validQuotedEnd = -1;
  const reasons = new Map<number, Set<string>>();
  const mark = (reason: string) => { const set = reasons.get(line) ?? new Set<string>(); set.add(reason); reasons.set(line, set); };
  for (let i = 0; i < input.length; i++) {
    const c = input[i], next = input[i + 1];
    if (c === '"') {
      if (!quoted && atStart) { quoted = true; atStart = false; validQuotedEnd = wellFormedEnd(input, i + 1, delimiter); output += c; }
      else if (quoted && next === '"') { output += '""'; i++; }
      else if (quoted && (next === delimiter || next === '\r' || next === '\n' || next === undefined)) { quoted = false; output += c; }
      else if (quoted) { output += '""'; mark('Escape a quote inside a value'); }
      else output += c; // Literal quotes in unquoted values are left untouched.
      continue;
    }
    if (c === '\r' || c === '\n') {
      const end = c === '\r' && next === '\n' ? '\r\n' : c;
      if (quoted) {
        const candidate = Papa.parse<string[]>(lines[line] ?? '', { delimiter });
        const nextRow = candidate.data[0];
        const firstDelimiter = input.indexOf(delimiter, recordStart);
        const currentFirst = input.slice(recordStart, firstDelimiter < 0 ? i : firstDelimiter);
        const plausible = expected > 1 && fields === expected && !candidate.errors.length && nextRow?.length === expected && nextRow[0].trim() !== '' && (!/^\d+$/.test(currentFirst) || /^\d+$/.test(nextRow[0]));
        if (plausible && validQuotedEnd < 0) { output += '"'; quoted = false; mark('Close a quoted value before a likely new record (check this boundary)'); }
      }
      output += end;
      if (end.length === 2) i++;
      line++;
      if (!quoted) { atStart = true; fields = 1; recordStart = i + 1; }
      continue;
    }
    output += c;
    if (!quoted && c === delimiter) { fields++; atStart = true; }
    else if (!quoted) atStart = false;
  }
  if (quoted) { output += '"'; mark('Close an unterminated quoted value at end of file'); }
  const after = output.split(/\r\n|\n|\r/);
  const edits: QuoteEdit[] = [...reasons].filter(([,r]) => r.size).map(([n,r]) => ({line:n,reason:[...r].join('; '),before:lines[n-1] ?? '',after:after[n-1] ?? ''}));
  return { text: (text.startsWith('\uFEFF') ? '\uFEFF' : '') + output, edits };
}
