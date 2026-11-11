import { ChangeDetectionStrategy, Component, inject, OnInit, computed } from '@angular/core';
import { DefectLegend } from '../../shared/defect-legend';
import { FindingsTable } from '../../shared/findings-table';
import { isCounted } from '../../shared/highlight';
import { StoryHighlight } from '../../shared/story-highlight';
import { StoryResult } from '../../models/story-result';
import { ResultsStore } from '../../services/results-store';

@Component({
  selector: 'app-analysis',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DefectLegend, FindingsTable, StoryHighlight],
  templateUrl: './analysis.html',
  styles: `
    .layout { display: grid; grid-template-columns: minmax(13rem, 18rem) 1fr; gap: 1rem; align-items: start; }
    @media (max-width: 52rem) { .layout { grid-template-columns: 1fr; } }
    ul.stories { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
    ul.stories button { width: 100%; text-align: left; font: inherit; padding: 0.5rem; background: #fff; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; color: inherit; }
    ul.stories button[aria-current='true'] { border: 2px solid var(--accent); background: #eef3ff; font-weight: 600; }
    .snippet { display: block; font-size: 0.85rem; font-weight: 400; color: var(--muted); }
    .src { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; justify-content: space-between; }
  `,
})
export class Analysis implements OnInit {
  protected readonly store = inject(ResultsStore);
  protected readonly selected = this.store.selected;
  protected readonly counts = computed(
    () => new Map(this.store.stories().map((s) => [s.story_id, s.findings.filter(isCounted).length])),
  );

  ngOnInit(): void {
    void this.store.ensureLoaded();
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) await this.store.loadFile(file);
    input.value = '';
  }

  protected snippet(s: StoryResult): string {
    return s.text.length > 60 ? `${s.text.slice(0, 57)}…` : s.text;
  }
}
