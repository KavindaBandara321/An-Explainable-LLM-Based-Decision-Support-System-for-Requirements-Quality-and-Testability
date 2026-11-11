import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StudyConfig, StudyItem, StudyRecord } from '../../models/study';
import { downloadFile, toCsv, toJson } from '../../services/export';
import { parseStudyConfig } from '../../services/parsers';
import { ResultsStore } from '../../services/results-store';
import { DefectLegend } from '../../shared/defect-legend';
import { FindingsTable } from '../../shared/findings-table';
import { StoryHighlight } from '../../shared/story-highlight';

export const MOCK_STUDY_URL = 'assets/mock/study.sample.json';
const CODE_RE = /^P\d{2,3}$/;

type RatingKey = 'clarity' | 'usefulness' | 'trust';

@Component({
  selector: 'app-study',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DefectLegend, FindingsTable, StoryHighlight],
  templateUrl: './study.html',
  styles: `
    .narrow { max-width: 38rem; }
    textarea { min-height: 6rem; }
    fieldset.likert { border: 1px solid var(--line); border-radius: 6px; margin: 0 0 0.75rem; padding: 0.5rem 0.75rem; }
    fieldset.likert legend { font-weight: 600; padding: 0 0.25rem; }
    .scale { display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; }
    .scale label { display: inline-flex; gap: 0.35rem; align-items: center; cursor: pointer; }
    .scale input { width: 1.15rem; height: 1.15rem; }
    .check { display: flex; gap: 0.5rem; align-items: flex-start; margin-bottom: 0.75rem; }
    .check input { margin-top: 0.3rem; width: 1.1rem; height: 1.1rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    h1:focus, h2:focus { outline: none; }
  `,
})
export class Study implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  protected readonly store = inject(ResultsStore);

  protected readonly config = signal<StudyConfig | null>(null);
  protected readonly configSource = signal('');
  protected readonly configError = signal<string | null>(null);

  protected readonly stage = signal<'start' | 'running' | 'done'>('start');
  protected readonly code = signal('');
  protected readonly consent = signal(false);
  protected readonly startError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);

  protected readonly participant = signal('');
  protected readonly items = signal<StudyItem[]>([]);
  protected readonly index = signal(0);
  protected readonly records = signal<StudyRecord[]>([]);

  protected readonly fixedText = signal('');
  protected readonly ratings = signal<Record<RatingKey, number | null>>({ clarity: null, usefulness: null, trust: null });
  private startedAt = 0;

  protected readonly scale = [1, 2, 3, 4, 5];
  protected readonly questions: { key: RatingKey; text: string }[] = [
    { key: 'clarity', text: 'The findings were clear to me.' },
    { key: 'usefulness', text: 'The findings were useful for fixing the story.' },
    { key: 'trust', text: 'I trust the findings shown for this story.' },
  ];

  protected readonly item = computed(() => this.items()[this.index()] ?? null);
  protected readonly story = computed(() => {
    const it = this.item();
    return it ? (this.store.stories().find((s) => s.story_id === it.story_id) ?? null) : null;
  });
  protected readonly isLast = computed(() => this.index() === this.items().length - 1);
  protected readonly participantCount = computed(() => Object.keys(this.config()?.participants ?? {}).length);
  protected readonly csv = computed(() => toCsv(this.records()));
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  ngOnInit(): void {
    void this.store.ensureLoaded();
    void this.loadMockConfig();
  }

  protected async loadMockConfig(): Promise<void> {
    try {
      const json = await firstValueFrom(this.http.get<unknown>(MOCK_STUDY_URL));
      this.config.set(parseStudyConfig(json));
      this.configSource.set('study.sample.json');
      this.configError.set(null);
    } catch (e) {
      this.configError.set(`Could not load the sample study config. ${this.msg(e)}`);
    }
  }

  protected async onConfigFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      try {
        this.config.set(parseStudyConfig(JSON.parse(await file.text())));
        this.configSource.set(file.name);
        this.configError.set(null);
      } catch (e) {
        this.configError.set(`Could not read "${file.name}". ${this.msg(e)}`);
      }
    }
    input.value = '';
  }

  protected onCode(event: Event): void {
    this.code.set((event.target as HTMLInputElement).value);
  }

  protected start(): void {
    const code = this.code().trim().toUpperCase();
    const cfg = this.config();
    const error = this.validateStart(code, cfg);
    if (error || !cfg) {
      this.startError.set(error ?? 'No study config loaded.');
      return;
    }
    this.startError.set(null);
    this.participant.set(code);
    this.items.set(cfg.participants[code]);
    this.index.set(0);
    this.records.set([]);
    this.beginStory();
    this.stage.set('running');
  }

  protected setRating(key: RatingKey, value: number): void {
    this.ratings.update((r) => ({ ...r, [key]: value }));
  }

  protected onFixed(event: Event): void {
    this.fixedText.set((event.target as HTMLTextAreaElement).value);
  }

  protected next(): void {
    const r = this.ratings();
    const it = this.item();
    if (!it || r.clarity === null || r.usefulness === null || r.trust === null) {
      this.submitError.set('Please answer all three rating questions before continuing.');
      return;
    }
    const time_ms = Math.round(performance.now() - this.startedAt);
    this.records.update((all) => [
      ...all,
      {
        participant_code: this.participant(),
        story_id: it.story_id,
        condition: it.condition,
        order: this.index() + 1,
        fixed_text: this.fixedText(),
        time_ms,
        clarity: r.clarity as number,
        usefulness: r.usefulness as number,
        trust: r.trust as number,
      },
    ]);
    this.submitError.set(null);
    if (this.isLast()) {
      this.stage.set('done');
    } else {
      this.index.update((i) => i + 1);
      this.beginStory();
    }
    afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
  }

  protected downloadJson(): void {
    downloadFile(`study_${this.participant()}.json`, toJson(this.participant(), this.records()), 'application/json');
  }

  protected downloadCsv(): void {
    downloadFile(`study_${this.participant()}.csv`, this.csv(), 'text/csv');
  }

  protected restart(): void {
    this.stage.set('start');
    this.code.set('');
    this.consent.set(false);
    this.records.set([]);
  }

  /** Resets the form and starts the per-story timer. */
  private beginStory(): void {
    this.fixedText.set(this.story()?.text ?? '');
    this.ratings.set({ clarity: null, usefulness: null, trust: null });
    this.submitError.set(null);
    this.startedAt = performance.now();
  }

  private validateStart(code: string, cfg: StudyConfig | null): string | null {
    if (!CODE_RE.test(code)) return 'Enter your participant code, for example P07. Do not enter your name.';
    if (!this.consent()) return 'Please tick the consent box to continue.';
    if (!cfg) return 'No study config is loaded.';
    const items = cfg.participants[code];
    if (!items) return `Participant code ${code} is not in the study config.`;
    const known = new Set(this.store.stories().map((s) => s.story_id));
    const missing = items.filter((i) => !known.has(i.story_id)).map((i) => i.story_id);
    if (missing.length > 0) return `These stories are missing from the loaded results: ${missing.join(', ')}.`;
    return null;
  }

  private msg(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }
}
