import { useEffect, useRef, useState } from 'react';
import { download } from '../csv/export';
import { validateExcelFile, type SheetInfo, type SheetResult, type ValueMode } from './types';

export default function ExcelConverter() {
  const [file,setFile]=useState<File|null>(null),[sheets,setSheets]=useState<SheetInfo[]>([]),[index,setIndex]=useState(0);
  const [mode,setMode]=useState<ValueMode>('formatted'),[delimiter,setDelimiter]=useState(','),[safe,setSafe]=useState(false);
  const [result,setResult]=useState<SheetResult|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[dragging,setDragging]=useState(false);
  const worker=useRef<Worker|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),picker=useRef<HTMLInputElement>(null),sequence=useRef(0);
  function clearTimer(){if(timer.current)clearTimeout(timer.current);timer.current=null;}
  function stop(){clearTimer();worker.current?.terminate();worker.current=null;sequence.current++;}
  useEffect(()=>()=>stop(),[]);
  function startRequest(message:object){
    clearTimer();setResult(null);setError('');setBusy(true);const id=++sequence.current;
    timer.current=setTimeout(()=>{stop();setBusy(false);setSheets([]);setError('Processing stopped after 30 seconds. Choose the workbook again or try a smaller file. No partial CSV was created.');},30_000);
    worker.current!.postMessage({id,...message});
  }
  function choose(candidate?:File){
    stop();setFile(null);setSheets([]);setResult(null);setError('');setBusy(false);setMode('formatted');setDelimiter(',');setSafe(false);setIndex(0);
    if(!candidate)return;
    try{
      validateExcelFile(candidate);setFile(candidate);
      const current=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});worker.current=current;
      current.onmessage=({data}:MessageEvent<{id:number;sheets?:SheetInfo[];result?:SheetResult;error?:string}>)=>{
        if(worker.current!==current||data.id!==sequence.current)return;
        clearTimer();setBusy(false);
        if(data.error){setResult(null);setError(data.error);}
        else if(data.sheets){setSheets(data.sheets);setIndex(Math.max(0,data.sheets.findIndex(sheet=>!sheet.hidden)));}
        else if(data.result)setResult(data.result);
      };
      current.onerror=event=>{event.preventDefault();if(worker.current!==current)return;stop();setBusy(false);setSheets([]);setResult(null);setError('This workbook could not be processed. Your original file has not changed. Try a smaller workbook in a current browser.');};
      startRequest({file:candidate});
    }catch(e){stop();setBusy(false);setError(e instanceof Error?e.message:'This browser could not start local conversion. Try a current browser.');}
  }
  function invalidate(){setResult(null);setError('');}
  const canDownload=result&&!result.empty&&!result.missingResults;
  return <section className={`conversion-tool panel ${dragging?'dragging':''}`} aria-label="Excel to CSV converter" onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);if(e.dataTransfer.files.length!==1){setError('Choose one workbook at a time.');return;}choose(e.dataTransfer.files[0]);}}>
    <h2>Convert an Excel worksheet to CSV</h2><p>Drop one XLSX or XLS workbook here, or choose a file. All processing stays on this device.</p>
    <div className="converter-actions"><button className="primary" onClick={()=>picker.current?.click()}>Choose Excel file</button>{file&&<button className="text-button" onClick={()=>download(file,file.name)}>Download original unchanged</button>}</div>
    <input className="sr-only" ref={picker} type="file" accept=".xlsx,.xls" aria-label="Select Excel workbook" onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/>
    <p className="muted">XLSX and Excel 97–2003 XLS · up to 5 MB · 50 worksheets · 200,000 fields per exported sheet</p>
    {file&&<p className="selected-file"><strong>Selected:</strong> {file.name}</p>}
    {!!sheets.length&&<><label className="converter-delimiter">Worksheet <select aria-label="Worksheet" disabled={busy} value={index} onChange={e=>{setIndex(Number(e.target.value));invalidate();}}>{sheets.map((sheet,i)=><option key={i} value={i}>{sheet.name}{sheet.hidden?' (hidden)':''}</option>)}</select></label>
      <p>Only this worksheet is exported. Hidden rows and columns are included. Hidden sheets are marked in the selector.</p>
      <label className="converter-delimiter">Values <select aria-label="Values" value={mode} disabled={busy} onChange={e=>{setMode(e.target.value as ValueMode);invalidate();}}><option value="formatted">Formatted text (default)</option><option value="raw">Underlying values</option></select></label>
      <p>{mode==='formatted'?'Exports formatted text as interpreted by the reader, including displayed leading zeros and dates. Locale-specific and custom formats may differ from Excel; review the preview.':'Exports stored text, numeric values and TRUE/FALSE. Numeric dates become Excel serial numbers. Numeric identifiers cannot regain digits already lost in Excel.'}</p>
      <label className="converter-delimiter">CSV delimiter <select aria-label="CSV delimiter" value={delimiter} disabled={busy} onChange={e=>{setDelimiter(e.target.value);invalidate();}}><option value=",">Comma</option><option value=";">Semicolon</option><option value={'\t'}>Tab</option><option value="|">Pipe</option></select></label>
      <label className="excel-safe"><input type="checkbox" checked={safe} disabled={busy} onChange={e=>{setSafe(e.target.checked);invalidate();}}/> Spreadsheet-safe export: prefix formula-like text with an apostrophe</label>
      <p>{safe?'This intentionally changes exported values. Ordinary numeric negatives remain unchanged; formula-like text, including text starting with a minus sign, may be prefixed.':'Data-preserving export is selected. CSV cannot retain text cell types: opening it directly in a spreadsheet can reinterpret dates, identifiers or formula-like text.'} Original workbook bytes are never changed.</p>
      <div className="converter-actions"><button className="primary" disabled={busy} onClick={()=>{try{startRequest({index,mode,delimiter,safe});}catch{stop();setBusy(false);setSheets([]);setError('Choose the workbook again to restart local conversion.');}}}>Prepare CSV preview</button></div>
    </>}
    {busy&&<button className="secondary" onClick={()=>{stop();setBusy(false);setSheets([]);setResult(null);setError('Processing cancelled. Choose the workbook again to restart. Your original file has not changed.');}}>Cancel processing</button>}
    <p role="status">{busy?'Processing locally. You can cancel at any time.':result?`${result.rows} rows × ${result.columns} columns in selected worksheet. ${result.changed} values prefixed for spreadsheet safety.`:sheets.length?`${sheets.length} worksheets found. Select a sheet and prepare a preview.`:''}</p>
    {error&&<p role="alert" className="converter-warning">{error}</p>}
    {result&&<><div className="converter-warning" aria-label="Export notes"><p>CSV contains one sheet’s values only. Formatting, formulas, images, comments and links are not retained. Formula results are saved values, possibly stale; nothing is recalculated.</p>
      <p>{result.formulas} formula cells · {result.errors} Excel error cells · {result.merges} merged ranges · {result.risky} formula-like values before export protection.</p>
      {!!result.merges&&<p>Merged ranges are not filled down or across. Only stored cell values are exported; other positions remain empty.</p>}
      {!!result.errors&&<p>Excel error values are exported as their error text. They have not been repaired.</p>}
      {!!result.missingResults&&<p role="alert">{result.missingResults} formula cells have no saved result. Download is blocked to avoid silently losing values. Recalculate and save the original workbook in Excel or LibreOffice, then choose it again.</p>}
      {result.empty&&<p role="alert">This worksheet is empty. Choose another worksheet.</p>}
    </div><div className="table-scroll" tabIndex={0} aria-label="Scrollable CSV preview"><table><caption>First 5 rows and up to 8 columns of the proposed CSV, including export protection.</caption><tbody>{result.preview.map((row,r)=><tr key={r}>{row.map((value,c)=><td key={c}>{value===''?<span className="cell-note">Empty</span>:value}</td>)}</tr>)}</tbody></table></div>
    {canDownload&&<button className="primary" onClick={()=>{const sheet=sheets[index].name.replace(/[^\p{L}\p{N}_.-]/gu,'_').slice(0,60)||'sheet';download(new Blob([result.csv],{type:'text/csv;charset=utf-8'}),`${file!.name.replace(/\.[^.]+$/,'')}-${sheet}.csv`);}}>Download CSV</button>}</>}
  </section>;
}
