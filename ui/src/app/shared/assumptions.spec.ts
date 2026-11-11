import { countAssumptions, parseGherkin, splitAssumptions } from './assumptions';

describe('splitAssumptions', () => {
  it('returns one plain part when there are no brackets', () => {
    expect(splitAssumptions('plain text')).toEqual([{ text: 'plain text', assumption: false }]);
  });

  it('highlights a bracketed assumption including the brackets', () => {
    expect(splitAssumptions('load in [under 2 seconds] please')).toEqual([
      { text: 'load in ', assumption: false },
      { text: '[under 2 seconds]', assumption: true },
      { text: ' please', assumption: false },
    ]);
  });

  it('finds multiple assumptions, adjacent ones and ones at the edges', () => {
    const parts = splitAssumptions('[a][b] mid [c]');
    expect(parts.filter((p) => p.assumption).map((p) => p.text)).toEqual(['[a]', '[b]', '[c]']);
    expect(parts.map((p) => p.text).join('')).toBe('[a][b] mid [c]');
  });

  it('leaves unmatched and empty brackets as plain text', () => {
    expect(countAssumptions('open [ only')).toBe(0);
    expect(countAssumptions('close ] only')).toBe(0);
    expect(countAssumptions('empty [] here')).toBe(0);
  });

  it('does not span across lines', () => {
    expect(countAssumptions('[first\nsecond]')).toBe(0);
  });

  it('uses the innermost brackets for nested input', () => {
    expect(splitAssumptions('[outer [inner] x]').filter((p) => p.assumption).map((p) => p.text)).toEqual(['[inner]']);
  });

  it('returns no parts for empty text', () => {
    expect(splitAssumptions('')).toEqual([]);
  });
});

describe('parseGherkin', () => {
  const src = 'Feature: Login\n  Scenario: Fast\n    Given a page over [broadband]\n    When opened\n    Then shown in [2 seconds]\n\n    And ok';
  const lines = parseGherkin(src);

  it('keeps one entry per line, including blank lines', () => {
    expect(lines).toHaveLength(7);
    expect(lines[5]).toMatchObject({ keyword: null, parts: [] });
  });

  it('detects keywords and preserves indentation', () => {
    expect(lines.map((l) => l.keyword)).toEqual(['Feature', 'Scenario', 'Given', 'When', 'Then', null, 'And']);
    expect(lines[2].indent).toBe('    ');
  });

  it('highlights assumptions after the keyword', () => {
    expect(lines[2].parts.filter((p) => p.assumption).map((p) => p.text)).toEqual(['[broadband]']);
    expect(lines[4].parts.filter((p) => p.assumption).map((p) => p.text)).toEqual(['[2 seconds]']);
  });

  it('does not treat words that merely start with a keyword as keywords', () => {
    expect(parseGherkin('Thenceforth it works')[0].keyword).toBeNull();
    expect(parseGherkin('Android app')[0].keyword).toBeNull();
  });

  it('prefers "Scenario Outline" over "Scenario" and handles CRLF', () => {
    expect(parseGherkin('Scenario Outline: x')[0].keyword).toBe('Scenario Outline');
    expect(parseGherkin('Given a\r\nWhen b').map((l) => l.keyword)).toEqual(['Given', 'When']);
  });
});
