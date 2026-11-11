import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { ResultsStore } from '../../services/results-store';
import { parseGherkin, splitAssumptions } from '../../shared/assumptions';

@Component({
  selector: 'app-improvement',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './improvement.html',
  styles: `
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 48rem) { .cols { grid-template-columns: 1fr; } }
    .cols .panel { margin: 0; }
    .story { font-size: 1.1rem; white-space: pre-wrap; }
    .sel { display: flex; gap: 0.75rem; align-items: center; }
    .sel .field { margin: 0; }
  `,
})
export class Improvement implements OnInit {
  protected readonly store = inject(ResultsStore);
  protected readonly story = this.store.selected;
  protected readonly improved = computed(() => this.story()?.improved ?? null);
  protected readonly improvedParts = computed(() => splitAssumptions(this.improved()?.text ?? ''));
  protected readonly gherkin = computed(() => parseGherkin(this.improved()?.acceptance_criteria_gherkin ?? ''));

  ngOnInit(): void {
    void this.store.ensureLoaded();
  }

  protected onSelect(event: Event): void {
    this.store.select((event.target as HTMLSelectElement).value);
  }
}
