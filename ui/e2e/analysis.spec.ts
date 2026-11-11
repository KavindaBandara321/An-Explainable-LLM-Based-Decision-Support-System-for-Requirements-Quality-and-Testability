import { expect, test } from '@playwright/test';

test.describe('Analysis view', () => {
  test('loads the mock data and highlights spans', async ({ page }) => {
    await page.goto('/analysis');
    await expect(page.getByTestId('source-name')).toContainText('mock data');
    await expect(page.getByTestId('story-item')).toHaveCount(4);

    const story = page.getByTestId('story-text');
    await expect(story).toContainText('As a user, I want the');
    await expect(story.locator('mark.hl', { hasText: 'fast' }).first()).toContainText('D4');
    await expect(story.locator('mark.hl')).not.toHaveCount(0);
    await expect(story.locator('mark.hl', { hasText: 'user-friendly' }).first()).toBeVisible();
    await expect(story.locator('mark .tag').first()).toBeVisible();

    await expect(page.getByRole('list', { name: 'Defect legend' })).toContainText('D4');
    await expect(page.getByTestId('finding-row')).not.toHaveCount(0);

    await page.getByTestId('story-item').nth(1).click();
    await expect(story).toContainText('As an admin, I want to export');
  });

  test('opens a finding and keeps evidence and AI justification separate', async ({ page }) => {
    await page.goto('/analysis');
    const toggle = page.getByRole('button', { name: /(Show|Hide) details for D4 “fast”/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const detail = page.getByTestId('finding-detail');
    await expect(detail.getByRole('heading', { name: /Evidence/ })).toBeVisible();
    await expect(detail.locator('.evidence')).toContainText('R-AMB-01');
    await expect(detail.getByRole('heading', { name: 'AI-generated justification' })).toBeVisible();
    await expect(detail.locator('.ai')).toContainText('may not faithfully');
    await expect(detail.locator('.ai')).toContainText('no unit or target');
  });

  test('shows possible issues collapsed and marked as not counted', async ({ page }) => {
    await page.goto('/analysis');
    const section = page.getByTestId('possible-issues');
    await expect(section).not.toHaveAttribute('open', '');
    await expect(section.getByText('not counted').first()).toBeVisible();
    await expect(section.getByRole('table')).toBeHidden();
    await section.locator('summary').click();
    await expect(section.getByRole('table')).toBeVisible();
    await expect(section.getByText('possible issue').first()).toBeVisible();
  });

  test('reports an invalid uploaded file', async ({ page }) => {
    await page.goto('/analysis');
    await page.getByLabel(/Load your own results JSON/).setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"not":"an array"}'),
    });
    await expect(page.getByRole('alert')).toContainText('bad.json');
    await expect(page.getByTestId('story-item')).toHaveCount(4);
  });

  test('loads an uploaded results file', async ({ page }) => {
    await page.goto('/analysis');
    const story = [
      {
        story_id: 'UP-1',
        text: 'Make it nice.',
        findings: [
          {
            defect: 'D4',
            span_text: 'nice',
            span_start: 8,
            span_end: 12,
            source: 'rule',
            rule_id: 'R-X',
            confidence: 'High',
            label: 'rule only',
            evidence: 'matched nice',
          },
        ],
      },
    ];
    await page.getByLabel(/Load your own results JSON/).setInputFiles({
      name: 'mine.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(story)),
    });
    await expect(page.getByTestId('source-name')).toContainText('mine.json');
    await expect(page.getByTestId('story-item')).toHaveCount(1);
    await expect(page.getByTestId('story-text').locator('mark')).toContainText('nice');
  });
});
