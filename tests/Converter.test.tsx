import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
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
