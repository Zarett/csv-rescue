import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import ExcelConverter from '../src/excel/ExcelConverter';
import type {SheetResult} from '../src/excel/types';
class WorkerMock {
 static instances:WorkerMock[]=[];
 onmessage:((event:{data:object})=>void)|null=null;
 terminate=vi.fn();postMessage=vi.fn();
 constructor(){WorkerMock.instances.push(this);}
 respond(data:object){const id=this.postMessage.mock.lastCall![0].id;act(()=>this.onmessage?.({data:{id,...data}}));}
}
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers();WorkerMock.instances=[];});
function choose(){fireEvent.change(screen.getByLabelText('Select Excel workbook'),{target:{files:[new File(['synthetic'],'a.xlsx')]}});return WorkerMock.instances.at(-1)!;}
const result:SheetResult={rows:2,columns:1,preview:[['id'],['00123']],formulas:0,missingResults:0,errors:0,merges:0,risky:0,changed:0,csv:'id\r\n00123',empty:false};
it('does not start spreadsheet workers before file choice, then requires sheet preview',()=>{
 vi.stubGlobal('Worker',WorkerMock);render(<ExcelConverter/>);expect(WorkerMock.instances).toHaveLength(0);const worker=choose();expect(screen.queryByRole('button',{name:'Download CSV'})).toBeNull();worker.respond({sheets:[{name:'First',hidden:false},{name:'Hidden',hidden:true}]});expect(screen.getByRole('option',{name:'Hidden (hidden)'})).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Prepare CSV preview'}));worker.respond({result});expect(screen.getByRole('button',{name:'Download CSV'})).toBeVisible();fireEvent.change(screen.getByLabelText('Values'),{target:{value:'raw'}});expect(screen.queryByRole('button',{name:'Download CSV'})).toBeNull();
});
it('blocks missing cached results and clears old results when worksheet, delimiter or safety changes',()=>{
 vi.stubGlobal('Worker',WorkerMock);render(<ExcelConverter/>);const worker=choose();worker.respond({sheets:[{name:'First',hidden:false}]});fireEvent.click(screen.getByRole('button',{name:'Prepare CSV preview'}));worker.respond({result:{...result,missingResults:1,csv:''}});expect(screen.getByRole('alert')).toHaveTextContent('no saved result');expect(screen.queryByRole('button',{name:'Download CSV'})).toBeNull();fireEvent.click(screen.getByRole('checkbox'));expect(screen.queryByRole('alert')).toBeNull();expect(screen.getByText(/intentionally changes/)).toBeVisible();
});
it('cancels, ignores stale workers, terminates on replacement and unmount',()=>{
 vi.stubGlobal('Worker',WorkerMock);const view=render(<ExcelConverter/>);const first=choose();fireEvent.click(screen.getByRole('button',{name:'Cancel processing'}));expect(first.terminate).toHaveBeenCalled();first.respond({sheets:[{name:'Stale',hidden:false}]});expect(screen.queryByLabelText('Worksheet')).toBeNull();const second=choose();view.unmount();expect(second.terminate).toHaveBeenCalled();
});
it('times out and preserves the original download choice',()=>{
 vi.useFakeTimers();vi.stubGlobal('Worker',WorkerMock);render(<ExcelConverter/>);const worker=choose();act(()=>vi.advanceTimersByTime(30001));expect(worker.terminate).toHaveBeenCalled();expect(screen.getByRole('alert')).toHaveTextContent('30 seconds');expect(screen.getByRole('button',{name:'Download original unchanged'})).toBeVisible();
});
it('rejects unsupported inputs without loading a reader',()=>{
 vi.stubGlobal('Worker',WorkerMock);render(<ExcelConverter/>);fireEvent.change(screen.getByLabelText('Select Excel workbook'),{target:{files:[new File(['x'],'wrong.csv')]}});expect(screen.getByRole('alert')).toHaveTextContent('not supported');expect(WorkerMock.instances).toHaveLength(0);
});
