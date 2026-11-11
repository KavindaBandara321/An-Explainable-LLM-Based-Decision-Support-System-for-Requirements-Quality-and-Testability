import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { Confidence, DEFECT_NAMES, Finding } from '../models/story-result';
import { confidenceRank, isCounted } from './highlight';

interface Row {
  f: Finding;
  id: number;
}

let nextUid = 0;

@Component({
  selector: 'app-findings-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './findings-table.html',
  styles: `
    .detail-body { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
    .detail-body section { border: 1px solid var(--line); border-radius: 6px; padding: 0.5rem 0.75rem; background: #fff; }
    .detail-body .ai { border-style: dashed; }
    .note { font-size: 0.85rem; color: #7c2d12; margin: 0 0 0.35rem; }
    .offsets { font-size: 0.8rem; }
    details.uncounted { margin-top: 1rem; }
    details.uncounted summary { cursor: pointer; font-weight: 600; }
    caption { text-align: left; font-weight: 600; padding-bottom: 0.25rem; }
  `,
})
export class FindingsTable {
  /** When false (study condition "findings_only") source, evidence and justification are hidden. */
  readonly explain = input(true);
  readonly findings = input.required<readonly Finding[]>();

  protected readonly uid = nextUid++;
  protected readonly expanded = linkedSignal<readonly Finding[], ReadonlySet<number>>({
    source: this.findings,
    computation: () => new Set<number>(),
  });

  private readonly rows = computed<Row[]>(() =>
    this.findings()
      .map((f, id) => ({ f, id }))
      .sort((a, b) => a.f.span_start - b.f.span_start || confidenceRank(a.f.confidence) - confidenceRank(b.f.confidence)),
  );
  protected readonly counted = computed(() => this.rows().filter((r) => isCounted(r.f)));
  protected readonly uncounted = computed(() => this.rows().filter((r) => !isCounted(r.f)));
  protected readonly colCount = computed(() => (this.explain() ? 6 : 4));

  protected toggle(id: number): void {
    const next = new Set(this.expanded());
    if (!next.delete(id)) next.add(id);
    this.expanded.set(next);
  }

  protected detailId(id: number): string {
    return `finding-detail-${this.uid}-${id}`;
  }

  protected defectName(f: Finding): string {
    return DEFECT_NAMES[f.defect];
  }

  protected conf(c: Confidence): string {
    return `conf-${c.toLowerCase()}`;
  }

  protected symbol(c: Confidence): string {
    return c === 'High' ? '▲' : c === 'Medium' ? '◆' : '▽';
  }

  protected source(f: Finding): string {
    const pct = f.llm_agreement === undefined ? '' : `${Math.round(f.llm_agreement * 100)}%`;
    const rule = f.rule_id ? `Rule ${f.rule_id}` : 'Rule';
    if (f.source === 'rule') return rule;
    if (f.source === 'llm') return pct ? `AI, ${pct} agreement` : 'AI';
    return pct ? `${rule} + AI, ${pct} agreement` : `${rule} + AI`;
  }
}
