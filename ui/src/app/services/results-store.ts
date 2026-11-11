import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StoryResult } from '../models/story-result';
import { parseResults } from './parsers';

export const MOCK_RESULTS_URL = 'assets/mock/results.sample.json';

/** Holds the loaded StoryResult[] (mock file or user upload) and the selected story, shared by all pages. */
@Injectable({ providedIn: 'root' })
export class ResultsStore {
  private readonly http = inject(HttpClient);

  readonly stories = signal<StoryResult[]>([]);
  readonly sourceName = signal('');
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly selectedId = signal<string | null>(null);

  readonly selected = computed<StoryResult | null>(() => {
    const list = this.stories();
    return list.find((s) => s.story_id === this.selectedId()) ?? list[0] ?? null;
  });

  async ensureLoaded(): Promise<void> {
    if (this.stories().length > 0 || this.loading()) return;
    await this.loadMock();
  }

  async loadMock(): Promise<void> {
    this.loading.set(true);
    try {
      const json = await firstValueFrom(this.http.get<unknown>(MOCK_RESULTS_URL));
      this.set(parseResults(json), 'mock data (results.sample.json)');
    } catch (e) {
      this.error.set(`Could not load mock data. ${this.message(e)}`);
    } finally {
      this.loading.set(false);
    }
  }

  async loadFile(file: File): Promise<void> {
    try {
      const json: unknown = JSON.parse(await file.text());
      this.set(parseResults(json), `uploaded file (${file.name})`);
    } catch (e) {
      this.error.set(`Could not read "${file.name}". ${this.message(e)}`);
    }
  }

  select(id: string): void {
    this.selectedId.set(id);
  }

  private set(stories: StoryResult[], source: string): void {
    this.stories.set(stories);
    this.sourceName.set(source);
    this.selectedId.set(stories[0]?.story_id ?? null);
    this.error.set(stories.length === 0 ? 'The file contains no stories.' : null);
  }

  private message(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }
}
