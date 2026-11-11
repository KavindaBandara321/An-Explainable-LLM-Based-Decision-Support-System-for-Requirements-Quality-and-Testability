import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DEFECT_NAMES, Finding } from '../models/story-result';
import { HighlightSegment, buildSegments } from './highlight';

@Component({
  selector: 'app-story-highlight',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="story" data-testid="story-text">@for (seg of segments(); track seg.start) {@if (seg.defects.length) {<mark class="hl" [class]="cls(seg)" [attr.title]="title(seg)"><span>{{ seg.text }}</span><span class="tag" aria-hidden="true">{{ seg.defects.join(',') }}</span><span class="visually-hidden"> (flagged: {{ title(seg) }})</span></mark>} @else {<span>{{ seg.text }}</span>}}</p>`,
  styles: `
    .story { white-space: pre-wrap; font-size: 1.1rem; line-height: 2; margin: 0; }
  `,
})
export class StoryHighlight {
  readonly text = input.required<string>();
  readonly findings = input.required<readonly Finding[]>();

  protected readonly segments = computed(() => buildSegments(this.text(), this.findings()));

  protected cls(seg: HighlightSegment): string {
    return `${seg.defects[0].toLowerCase()}${seg.counted ? '' : ' uncounted'}`;
  }

  protected title(seg: HighlightSegment): string {
    return seg.defects.map((d) => `${d} ${DEFECT_NAMES[d]}`).join('; ');
  }
}
