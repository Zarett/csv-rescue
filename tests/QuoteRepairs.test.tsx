import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import QuoteRepairs from '../src/components/QuoteRepairs';
afterEach(cleanup);
const proposal={text:'fixed',edits:[{line:2,reason:'Close quote',before:'1,"note',after:'1,"note"'},{line:4,reason:'Escape quote',before:'"bad "quote""',after:'"bad ""quote"""'}]};
it('requires opening details and reviewing every line before approval; closing disables new approval',()=>{
  const onChange=vi.fn();const {container}=render(<QuoteRepairs proposal={proposal} approved={false} onChange={onChange}/>);
  const approve=screen.getByLabelText(/Apply suggested quote repairs/);
  expect(approve).toBeDisabled();
  const details=container.querySelector('details')!;
  details.open=true;fireEvent(details,new Event('toggle'));
  expect(approve).toBeDisabled();
  fireEvent.click(screen.getByLabelText('I reviewed line 2'));expect(approve).toBeDisabled();
  fireEvent.click(screen.getByLabelText('I reviewed line 4'));expect(approve).toBeEnabled();
  details.open=false;fireEvent(details,new Event('toggle'));expect(approve).toBeDisabled();
  details.open=true;fireEvent(details,new Event('toggle'));fireEvent.click(approve);expect(onChange).toHaveBeenLastCalledWith(true);
});
it('resets review eligibility for a different proposal and always permits reverting approved edits',()=>{
  const onChange=vi.fn();const {rerender}=render(<QuoteRepairs proposal={proposal} approved={true} onChange={onChange}/>);
  const approve=screen.getByLabelText(/Apply suggested quote repairs/);expect(approve).toBeEnabled();fireEvent.click(approve);expect(onChange).toHaveBeenLastCalledWith(false);
  rerender(<QuoteRepairs proposal={{...proposal}} approved={false} onChange={onChange}/>);expect(approve).toBeDisabled();expect(screen.getByText(/0 of 2 lines reviewed/)).toBeInTheDocument();
});
