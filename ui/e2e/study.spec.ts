import { readFile } from 'node:fs/promises';
import { expect, Page, test } from '@playwright/test';

async function rate(page: Page, question: RegExp, value: number): Promise<void> {
  await page.getByRole('group', { name: question }).getByLabel(String(value), { exact: true }).check();
}

test.describe('User study mode', () => {
  test('validates the start screen', async ({ page }) => {
    await page.goto('/study');
    await page.getByLabel(/Participant code/).fill('Jane');
    await page.getByTestId('start').click();
    await expect(page.getByRole('alert').filter({ hasText: 'participant code' })).toBeVisible();

    await page.getByLabel(/Participant code/).fill('P99');
    await page.getByTestId('start').click();
    await expect(page.getByRole('alert').filter({ hasText: 'consent' })).toBeVisible();

    await page.getByLabel(/Participant code/).fill('P55');
    await page.getByLabel(/I have read the information sheet/).check();
    await page.getByTestId('start').click();
    await expect(page.getByRole('alert').filter({ hasText: 'not in the study config' })).toBeVisible();
  });

  test('runs a full two-story session and downloads CSV and JSON', async ({ page }) => {
    await page.goto('/study');
    await page.getByLabel(/Participant code/).fill('p99');
    await page.getByLabel(/I have read the information sheet/).check();
    await page.getByTestId('start').click();

    // Story 1: findings_only, so no source, evidence or justification.
    await expect(page.getByTestId('progress')).toContainText('Story 1 of 2');
    await expect(page.getByTestId('study-story')).toHaveAttribute('data-condition', 'findings_only');
    await expect(page.getByTestId('finding-row')).not.toHaveCount(0);
    await expect(page.getByRole('button', { name: /Show details/ })).toHaveCount(0);
    await expect(page.getByText('AI-generated justification')).toHaveCount(0);
    await expect(page.getByText('R-AMB-01')).toHaveCount(0);

    // Ratings are required.
    await page.getByTestId('next').click();
    await expect(page.getByRole('alert').filter({ hasText: 'all three rating' })).toBeVisible();

    await page.getByLabel('Your fixed version of the story').fill('As a registered customer, I want the login page to load in 2 s, "fast".');
    await rate(page, /clear to me/, 4);
    await rate(page, /useful for fixing/, 5);
    await rate(page, /I trust the findings/, 2);
    await page.getByTestId('next').click();

    // Story 2: findings_plus_explanation.
    await expect(page.getByTestId('progress')).toContainText('Story 2 of 2');
    await expect(page.getByTestId('study-story')).toHaveAttribute('data-condition', 'findings_plus_explanation');
    await page.getByRole('button', { name: /Show details for D3/ }).click();
    await expect(page.getByText('AI-generated justification')).toBeVisible();
    await expect(page.getByLabel('Your fixed version of the story')).toHaveValue(/export reports/);
    await page.getByLabel('Your fixed version of the story').fill('As an admin, I want to export the monthly report as CSV.');
    await rate(page, /clear to me/, 3);
    await rate(page, /useful for fixing/, 3);
    await rate(page, /I trust the findings/, 5);
    await expect(page.getByTestId('next')).toHaveText('Finish');
    await page.getByTestId('next').click();

    await expect(page.getByTestId('done')).toContainText('Nothing has been sent to any server');

    const [csvDownload] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-csv').click()]);
    expect(csvDownload.suggestedFilename()).toBe('study_P99.csv');
    const csv = await readFile((await csvDownload.path())!, 'utf8');
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe('participant_code,story_id,condition,order,fixed_text,time_ms,clarity,usefulness,trust');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toMatch(/^P99,MOCK-001,findings_only,1,"As a registered customer, I want the login page to load in 2 s, ""fast""\.",\d+,4,5,2$/);
    expect(lines[2]).toMatch(/^P99,MOCK-002,findings_plus_explanation,2,"As an admin, I want to export the monthly report as CSV\.",\d+,3,3,5$/);

    const [jsonDownload] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-json').click()]);
    expect(jsonDownload.suggestedFilename()).toBe('study_P99.json');
    const json = JSON.parse(await readFile((await jsonDownload.path())!, 'utf8'));
    expect(json.participant_code).toBe('P99');
    expect(json.records).toHaveLength(2);
    expect(json.records[0]).toMatchObject({ story_id: 'MOCK-001', condition: 'findings_only', order: 1, clarity: 4, usefulness: 5, trust: 2 });
    expect(json.records[1]).toMatchObject({ story_id: 'MOCK-002', condition: 'findings_plus_explanation', order: 2 });
    expect(json.records[0].time_ms).toBeGreaterThanOrEqual(0);
  });
});
