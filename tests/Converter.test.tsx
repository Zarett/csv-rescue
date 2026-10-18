import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import Converter from '../src/conversion/Converter';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('makes the sample available and rejects workbook imports',()=>{
 render(<Converter/>);fireEvent.click(screen.getByRole('button',{name:'Try sample CSV'}));expect(screen.getByText('sample.csv')).toBeVisible();expect(screen.getByRole('button',{name:'Convert to XLSX'})).toBeVisible();
 fireEvent.change(screen.getByLabelText('Select CSV for Excel conversion'),{target:{files:[new File(['x'],'a.xlsx')]}});expect(screen.getByRole('alert')).toHaveTextContent('not supported');
});
it('cancels and terminates local workers',()=>{
 const terminate=vi.fn();vi.stubGlobal('Worker',class{terminate=terminate;postMessage=vi.fn();});render(<Converter/>);fireEvent.click(screen.getByRole('button',{name:'Try sample CSV'}));fireEvent.click(screen.getByRole('button',{name:'Convert to XLSX'}));fireEvent.click(screen.getByRole('button',{name:'Cancel conversion'}));expect(terminate).toHaveBeenCalled();expect(screen.getByRole('alert')).toHaveTextContent('cancelled');
});
it('times out workers and terminates on unmount',async()=>{
 vi.useFakeTimers();const terminate=vi.fn();vi.stubGlobal('Worker',class{terminate=terminate;postMessage=vi.fn();});const view=render(<Converter/>);fireEvent.click(screen.getByRole('button',{name:'Try sample CSV'}));fireEvent.click(screen.getByRole('button',{name:'Convert to XLSX'}));
 const {act}=await import('@testing-library/react');act(()=>vi.advanceTimersByTime(30001));expect(screen.getByRole('alert')).toHaveTextContent('30 seconds');fireEvent.click(screen.getByRole('button',{name:'Convert to XLSX'}));view.unmount();expect(terminate).toHaveBeenCalledTimes(2);vi.useRealTimers();
});
it('reports unsupported workers clearly',async()=>{render(<Converter/>);vi.stubGlobal('Worker',undefined);fireEvent.click(screen.getByRole('button',{name:'Try sample CSV'}));fireEvent.click(screen.getByRole('button',{name:'Convert to XLSX'}));await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('could not start'));});

const filenames=['test.csv','csv_rescue_stress_test.csv','csv_rescue_stress_test_cleaned.csv','csv_rescue_stress_test_cleaned (1).csv','very-long-csv-filename-with-multiple-sections.csv','müşteri_verileri_2026.csv','report.CSV','report.csv.csv'];
it.each(filenames.flatMap(name=>['text/csv','text/plain','application/octet-stream',''].map(type=>({name,type}))))('accepts supported filename $name with provider MIME "$type"',({name,type})=>{
 render(<Converter/>);const input=screen.getByLabelText('Select CSV for Excel conversion');expect(input).not.toHaveAttribute('accept');
 fireEvent.change(input,{target:{files:[new File(['id\n00123'],name,{type})]}});expect(screen.getByText(name)).toBeVisible();expect(screen.queryByRole('alert')).toBeNull();
});
it('preserves selection, busy worker and finished result on empty picker events; resets replacements and ignores stale workers',()=>{
 const workers:{onmessage?: (event:unknown)=>void;terminate:ReturnType<typeof vi.fn>}[]=[];
 vi.stubGlobal('Worker',class{onmessage?: (event:unknown)=>void;terminate=vi.fn();postMessage=vi.fn();constructor(){workers.push(this);}});
 render(<Converter/>);const input=screen.getByLabelText('Select CSV for Excel conversion');
 const choose=(name:string)=>fireEvent.change(input,{target:{files:[new File(['id\n00123'],name)]}});
 choose('first.csv');fireEvent.click(screen.getByRole('button',{name:'Convert to XLSX'}));
 fireEvent.change(input,{target:{files:[]}});expect(workers[0].terminate).not.toHaveBeenCalled();expect(screen.getByText('first.csv')).toBeVisible();
 const result={bytes:new ArrayBuffer(1),rows:2,columns:1,fields:2,preview:[['id'],['00123']]};
 // Worker messages originate outside React's event handlers.
 fireEvent.click(screen.getByRole('button',{name:'Cancel conversion'}));expect(screen.getByRole('alert')).toHaveTextContent('cancelled');
 fireEvent.change(input,{target:{files:[]}});expect(screen.getByRole('alert')).toHaveTextContent('cancelled');
 choose('second.csv');expect(screen.queryByRole('alert')).toBeNull();expect(screen.queryByText('first.csv')).toBeNull();
 workers[0].onmessage?.({data:result});expect(screen.queryByRole('button',{name:'Download Excel (.xlsx)'})).toBeNull();
 choose('second.csv');expect(screen.getByText('second.csv')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Convert to XLSX'}));act(()=>workers[1].onmessage?.({data:result}));
 expect(screen.getByRole('button',{name:'Download Excel (.xlsx)'})).toBeVisible();
 fireEvent.change(input,{target:{files:[]}});expect(screen.getByRole('button',{name:'Download Excel (.xlsx)'})).toBeVisible();
 choose('third.csv');expect(screen.queryByRole('button',{name:'Download Excel (.xlsx)'})).toBeNull();expect(screen.getByRole('status')).toBeEmptyDOMElement();
});
