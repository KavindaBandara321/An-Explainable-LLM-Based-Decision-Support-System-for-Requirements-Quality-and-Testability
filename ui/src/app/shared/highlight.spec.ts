import { Finding } from '../models/story-result';
import { buildSegments, isCounted } from './highlight';

function f(over: Partial<Finding>): Finding {
  return {
    defect: 'D4',
    span_text: '',
    span_start: 0,
    span_end: 0,
    source: 'rule',
    confidence: 'High',
    label: 'rule only',
    evidence: 'e',
    ...over,
  };
}

describe('buildSegments', () => {
  const text = 'As a user, I want the login page to be fast and user-friendly.';

  it('returns one plain segment when there are no findings', () => {
    const segs = buildSegments(text, []);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ text, defects: [], counted: false });
  });

  it('splits text around a single span', () => {
    const segs = buildSegments(text, [f({ span_start: 39, span_end: 43 })]);
    expect(segs.map((s) => s.text)).toEqual(['As a user, I want the login page to be ', 'fast', ' and user-friendly.']);
    expect(segs[1].defects).toEqual(['D4']);
    expect(segs[0].findings).toHaveLength(0);
  });

  it('always reproduces the original text when joined', () => {
    const segs = buildSegments(text, [f({ span_start: 39, span_end: 43 }), f({ defect: 'D5', span_start: 39, span_end: 61 })]);
    expect(segs.map((s) => s.text).join('')).toBe(text);
  });

  it('handles overlapping spans of different defects', () => {
    const segs = buildSegments(text, [
      f({ defect: 'D4', span_start: 39, span_end: 43 }),
      f({ defect: 'D5', span_start: 39, span_end: 61 }),
    ]);
    const fast = segs.find((s) => s.text === 'fast');
    const rest = segs.find((s) => s.text === ' and user-friendly');
    expect(fast?.defects).toEqual(['D4', 'D5']);
    expect(rest?.defects).toEqual(['D5']);
  });

  it('handles partially overlapping spans', () => {
    const segs = buildSegments('abcdef', [f({ defect: 'D1', span_start: 0, span_end: 4 }), f({ defect: 'D2', span_start: 2, span_end: 6 })]);
    expect(segs.map((s) => [s.text, s.defects.join('')])).toEqual([
      ['ab', 'D1'],
      ['cd', 'D1D2'],
      ['ef', 'D2'],
    ]);
  });

  it('lists a defect once when two findings of the same defect overlap', () => {
    const segs = buildSegments('abcd', [f({ span_start: 0, span_end: 4 }), f({ span_start: 1, span_end: 3 })]);
    expect(segs.find((s) => s.text === 'bc')?.defects).toEqual(['D4']);
    expect(segs.find((s) => s.text === 'bc')?.findings).toHaveLength(2);
  });

  it('clamps out-of-range offsets and ignores empty or inverted spans', () => {
    const segs = buildSegments('abcd', [
      f({ defect: 'D1', span_start: -5, span_end: 2 }),
      f({ defect: 'D2', span_start: 3, span_end: 99 }),
      f({ defect: 'D3', span_start: 2, span_end: 2 }),
      f({ defect: 'D6', span_start: 3, span_end: 1 }),
    ]);
    expect(segs.map((s) => [s.text, s.defects.join('')])).toEqual([
      ['ab', 'D1'],
      ['c', ''],
      ['d', 'D2'],
    ]);
  });

  it('supports a span at the very start and the very end', () => {
    const segs = buildSegments('abc', [f({ span_start: 0, span_end: 3 })]);
    expect(segs).toHaveLength(1);
    expect(segs[0].text).toBe('abc');
  });

  it('marks segments covered only by Low-confidence possible issues as not counted', () => {
    const segs = buildSegments('abcd', [
      f({ span_start: 0, span_end: 2 }),
      f({ defect: 'D6', span_start: 2, span_end: 4, confidence: 'Low', label: 'possible issue' }),
    ]);
    expect(segs[0].counted).toBe(true);
    expect(segs[1].counted).toBe(false);
  });

  it('counts a segment when a counted and an uncounted finding overlap', () => {
    const segs = buildSegments('abcd', [
      f({ span_start: 0, span_end: 4 }),
      f({ defect: 'D6', span_start: 0, span_end: 4, confidence: 'Low', label: 'possible issue' }),
    ]);
    expect(segs[0].counted).toBe(true);
  });

  it('works on an empty text', () => {
    expect(buildSegments('', [f({ span_start: 0, span_end: 3 })])).toEqual([]);
  });
});

describe('isCounted', () => {
  it('excludes Low confidence and possible issues only', () => {
    expect(isCounted({ confidence: 'High', label: 'confirmed' })).toBe(true);
    expect(isCounted({ confidence: 'Medium', label: 'AI only' })).toBe(true);
    expect(isCounted({ confidence: 'Low', label: 'possible issue' })).toBe(false);
    expect(isCounted({ confidence: 'Low', label: 'rule only' })).toBe(false);
    expect(isCounted({ confidence: 'Medium', label: 'possible issue' })).toBe(false);
  });
});
