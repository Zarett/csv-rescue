import { useEffect, useRef, useState } from 'react';
import { download } from '../csv/export';
import { SAMPLE_CSV, validateConversionFile } from './csv';
type Result = { bytes: ArrayBuffer; rows: number; columns: number; fields: number; preview: string[][] };
export default function Converter() {
  const [file, setFile] = useState<File | null>(null), [delimiter, setDelimiter] = useState('');
  const [result, setResult] = useState<Result | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [dragging, setDragging] = useState(false);
  const worker = useRef<Worker | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null), picker = useRef<HTMLInputElement>(null);
  function stop() { worker.current?.terminate(); worker.current = null; if (timer.current) clearTimeout(timer.current); timer.current = null; }
  useEffect(() => () => stop(), []);
  function choose(candidate?: File) {
    // A dismissed picker (or empty drop) is not a replacement selection.
    if (!candidate) return;
    stop(); setBusy(false); setResult(null); setError(''); setFile(null);
    try { validateConversionFile(candidate); setFile(candidate); } catch (e) { setError((e as Error).message); }
  }
  function convert() {
    if (!file || busy) return;
    stop(); setResult(null); setError(''); setBusy(true);
    try {
      const current = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      worker.current = current;
      current.onmessage = ({ data }: MessageEvent<Result & { error?: string }>) => {
        if (worker.current !== current) return;
        stop(); setBusy(false); if (data.error) setError(data.error); else setResult(data);
      };
      current.onerror = event => { event.preventDefault(); if (worker.current !== current) return; stop(); setBusy(false); setError('Conversion could not complete. Your original file has not changed.'); };
      timer.current = setTimeout(() => { stop(); setBusy(false); setError('Conversion stopped after 30 seconds. Try a smaller file.'); }, 30_000);
      current.postMessage({ file, delimiter });
    } catch { stop(); setBusy(false); setError('This browser could not start local conversion. Try a current browser.'); }
  }
  return <section className={`conversion-tool panel ${dragging ? 'dragging' : ''}`} aria-label="CSV to Excel converter" onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length > 1) { setError('Choose one file at a time.'); return; } choose(e.dataTransfer.files[0]); }}>
    <h2>Convert your CSV to Excel</h2><p>Drop one file here or select it below. Your file stays on this device.</p>
    <div className="converter-actions"><button className="primary" onClick={() => picker.current?.click()}>Choose CSV file</button><button className="secondary" onClick={() => choose(new File([SAMPLE_CSV], 'sample.csv', { type: 'text/csv' }))}>Try sample CSV</button></div>
    {/* Android providers may report CSV as plain text, binary, or without a MIME type.
        Validate the chosen file in-app instead of filtering it in the native picker. */}
    <input className="sr-only" ref={picker} type="file" aria-label="Select CSV for Excel conversion" onChange={e => { choose(e.target.files?.[0]); e.target.value = ''; }}/>
    <p className="muted">UTF-8 CSV, TSV or TXT · up to 2 MB · 100,000 rows · 256 columns · 200,000 fields</p>
    {file && <><p className="selected-file"><strong>Selected:</strong> {file.name}</p><label className="converter-delimiter">Delimiter <select aria-label="Delimiter" value={delimiter} disabled={busy} onChange={e => { setDelimiter(e.target.value); setResult(null); setError(''); }}><option value="">Auto-detect</option><option value=",">Comma</option><option value=";">Semicolon</option><option value={'\t'}>Tab</option><option value="|">Pipe</option></select></label><p>Every field, including the first row, is stored as text. No cleanup or formula execution is applied.</p><div className="converter-actions"><button className="primary" onClick={convert} disabled={busy}>{busy ? 'Converting locally…' : 'Convert to XLSX'}</button>{busy && <button className="secondary" onClick={() => { stop(); setBusy(false); setError('Conversion cancelled. Your original file has not changed.'); }}>Cancel conversion</button>}<button className="text-button" onClick={() => download(file, file.name)}>Download original unchanged</button></div></>}
    <p role="status">{busy ? 'Converting in your browser. You can cancel at any time.' : result ? `Ready: ${result.rows} rows, ${result.columns} maximum columns, ${result.fields} text fields. No cleaning applied.` : ''}</p>
    {error && <p className="converter-warning" role="alert">{error} <a href="/csv-repair/">Open CSV repair</a></p>}
    {result && <><button className="primary" onClick={() => download(new Blob([result.bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${file!.name.replace(/\.[^.]+$/, '')}.xlsx`)}>Download Excel (.xlsx)</button><details><summary>Preview text values</summary><div className="table-scroll" tabIndex={0} aria-label="Scrollable conversion preview"><table><caption>First 5 rows and up to 8 columns. The workbook includes every supported field.</caption><tbody>{result.preview.map((row, i) => <tr key={i}>{row.map((value, j) => <td key={j}>{value === '' ? <span className="cell-note">Empty</span> : value}</td>)}</tr>)}</tbody></table></div></details></>}
  </section>;
}
