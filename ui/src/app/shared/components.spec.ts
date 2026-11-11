import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Finding } from '../models/story-result';
import { FindingsTable } from './findings-table';
import { StoryHighlight } from './story-highlight';

const base: Finding = {
  defect: 'D4',
  span_text: 'fast',
  span_start: 0,
  span_end: 4,
  source: 'both',
  rule_id: 'R-AMB-01',
  llm_agreement: 0.8,
  confidence: 'High',
  label: 'confirmed',
  evidence: 'matched "fast"',
  justification: 'too vague',
};
const low: Finding = { ...base, defect: 'D6', span_text: 'x', confidence: 'Low', label: 'possible issue', source: 'llm', rule_id: undefined, llm_agreement: 0.2 };

@Component({
  imports: [FindingsTable],
  template: `<app-findings-table [findings]="findings" [explain]="explain" />`,
})
class Host {
  findings = [base, low];
  explain = true;
}

describe('FindingsTable', () => {
  function render(explain: boolean): HTMLElement {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.explain = explain;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('puts possible issues in a collapsed section marked as not counted', () => {
    const el = render(true);
    const details = el.querySelector('details.uncounted') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details.textContent).toContain('not counted');
    expect(el.querySelectorAll('[data-testid="finding-row"]')).toHaveLength(2);
  });

  it('shows evidence and a labelled AI justification separately when expanded', () => {
    const el = render(true);
    (el.querySelector('button[aria-expanded]') as HTMLButtonElement).click();
    TestBed.tick();
    const detail = el.querySelector('[data-testid="finding-detail"]') as HTMLElement;
    expect(detail.querySelector('.evidence')?.textContent).toContain('matched "fast"');
    expect(detail.querySelector('.ai h3')?.textContent).toContain('AI-generated justification');
    expect(detail.querySelector('.ai')?.textContent).toContain('may not faithfully');
    expect(detail.querySelector('.evidence')?.textContent).not.toContain('too vague');
  });

  it('hides source, evidence and justification when explain is false', () => {
    const el = render(false);
    expect(el.textContent).not.toContain('R-AMB-01');
    expect(el.querySelector('button')).toBeNull();
    expect(el.textContent).not.toContain('Evidence');
  });
});

describe('StoryHighlight', () => {
  it('renders a mark with a visible defect code for every flagged span', () => {
    const fixture = TestBed.createComponent(StoryHighlight);
    fixture.componentRef.setInput('text', 'a fast app');
    fixture.componentRef.setInput('findings', [{ ...base, span_start: 2, span_end: 6 }]);
    fixture.detectChanges();
    const mark = (fixture.nativeElement as HTMLElement).querySelector('mark') as HTMLElement;
    expect(mark.textContent).toContain('fast');
    expect(mark.querySelector('.tag')?.textContent).toBe('D4');
  });
});
