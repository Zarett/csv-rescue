import { useState } from 'react';
import type { QuoteEdit } from '../csv/repair';
type Proposal = { text: string; edits: QuoteEdit[] };
function changedText(before: string, after: string, proposed: boolean) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = 0;
  while (end < before.length - start && end < after.length - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
  const value = proposed ? after : before;
  const finish = value.length - end;
  return <>{value.slice(0,start)}<mark>{value.slice(start,finish) || (proposed ? '[removed]' : '[insert quote here]')}</mark>{value.slice(finish)}</>;
}
export default function QuoteRepairs({proposal,approved,onChange}:{proposal:Proposal;approved:boolean;onChange:(value:boolean)=>void}) {
  const [open,setOpen] = useState(false);
  const [review,setReview] = useState<{proposal:Proposal;lines:Set<number>}>(()=>({proposal,lines:new Set()}));
  const lines = review.proposal === proposal ? review.lines : new Set<number>();
  const ready = open && lines.size === proposal.edits.length;
  return <section className="quote-panel panel" aria-labelledby="quote-heading"><h2 id="quote-heading">Suggested quote repairs</h2><p>These are heuristic guesses, not guaranteed repairs. Review each original and suggested physical line, especially record boundaries. No email, date, or numeric validation is applied.</p>
    <details open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>Review {proposal.edits.length} changed physical lines</summary>{proposal.edits.map(edit=><article key={edit.line}><strong>Line {edit.line}: {edit.reason}</strong><div className="quote-diff"><div><small>Original physical line</small><pre>{changedText(edit.before,edit.after,false)}</pre></div><div><small>Proposed physical line</small><pre>{changedText(edit.before,edit.after,true)}</pre></div></div><label><input type="checkbox" checked={lines.has(edit.line)} onChange={e=>{const next=new Set(lines);if(e.target.checked)next.add(edit.line);else next.delete(edit.line);setReview({proposal,lines:next});if(approved)onChange(false);}}/>I reviewed line {edit.line}</label></article>)}</details>
    <p id="quote-review-status">{lines.size} of {proposal.edits.length} lines reviewed. Open the details and review every line before approval.</p><label><input type="checkbox" checked={approved} disabled={!approved && !ready} aria-describedby="quote-review-status" onChange={e=>{if(!e.target.checked || ready)onChange(e.target.checked);}}/>Apply suggested quote repairs — I have reviewed the changed lines</label><p>{approved ? 'After includes approved quote repairs and selected cleanup. Before keeps the original parsing. Uncheck approval to reverse repairs.' : 'No quote repairs applied. Original download remains byte-for-byte unchanged.'}</p>
  </section>;
}
