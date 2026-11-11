export interface TextPart {
  text: string;
  /** True for a "[bracketed assumption]" (brackets included in `text`). */
  assumption: boolean;
}

const ASSUMPTION_RE = /\[[^[\]\r\n]+\]/g;

/** Splits text into plain and [bracketed assumption] parts. Unmatched or empty brackets stay plain. */
export function splitAssumptions(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(ASSUMPTION_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ text: text.slice(last, idx), assumption: false });
    parts.push({ text: m[0], assumption: true });
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), assumption: false });
  return parts;
}

export function countAssumptions(text: string): number {
  return splitAssumptions(text).filter((p) => p.assumption).length;
}

export const GHERKIN_KEYWORDS = ['Feature', 'Background', 'Scenario Outline', 'Scenario', 'Given', 'When', 'Then', 'And', 'But'] as const;
export type GherkinKeyword = (typeof GHERKIN_KEYWORDS)[number];

export interface GherkinLine {
  indent: string;
  keyword: GherkinKeyword | null;
  /** Text after the keyword (including a leading ":" or space), as parts with assumption flags. */
  parts: TextPart[];
}

const KEYWORD_RE = new RegExp(`^(${GHERKIN_KEYWORDS.join('|')})(?=[\\s:]|$)`);

export function parseGherkin(source: string): GherkinLine[] {
  return source.split(/\r?\n/).map((line) => {
    const indent = /^\s*/.exec(line)?.[0] ?? '';
    const body = line.slice(indent.length);
    const kw = KEYWORD_RE.exec(body);
    if (!kw) return { indent, keyword: null, parts: splitAssumptions(body) };
    return {
      indent,
      keyword: kw[1] as GherkinKeyword,
      parts: splitAssumptions(body.slice(kw[1].length)),
    };
  });
}
