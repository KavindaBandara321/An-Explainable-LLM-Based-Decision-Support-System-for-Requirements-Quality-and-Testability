import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DEFECT_CODES, DEFECT_NAMES } from '../models/story-result';

@Component({
  selector: 'app-defect-legend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="legend" aria-label="Defect legend">
      @for (code of codes; track code) {
        <li><span class="defect-chip" [class]="code.toLowerCase()">{{ code }}</span> {{ names[code] }}</li>
      }
      <li><mark class="hl uncounted d6">dashed outline</mark> low-confidence possible issue (not counted)</li>
    </ul>
  `,
  styles: `
    .legend { list-style: none; display: flex; flex-wrap: wrap; gap: 0.4rem 1.25rem; margin: 0; padding: 0; font-size: 0.9rem; }
  `,
})
export class DefectLegend {
  protected readonly codes = DEFECT_CODES;
  protected readonly names = DEFECT_NAMES;
}
