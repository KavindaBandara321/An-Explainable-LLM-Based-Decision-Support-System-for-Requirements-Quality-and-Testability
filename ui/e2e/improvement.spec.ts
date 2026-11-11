import { expect, test } from '@playwright/test';

test.describe('Improvement view', () => {
  test('shows original and improved side by side with highlighted assumptions', async ({ page }) => {
    await page.goto('/improvement');

    await expect(page.getByTestId('original-text')).toHaveText('As a user, I want the login page to be fast and user-friendly.');
    const improved = page.getByTestId('improved-text');
    await expect(improved).toContainText('As a registered customer');

    const marks = improved.getByTestId('assumption');
    await expect(marks).toHaveCount(2);
    await expect(marks.nth(0)).toHaveText('[under 2 seconds]');
    await expect(marks.nth(1)).toHaveText('[a typical broadband connection]');

    const gherkin = page.getByTestId('gherkin');
    await expect(gherkin).toHaveCSS('font-family', /mono|Consolas|Courier/i);
    await expect(gherkin.locator('.kw', { hasText: /^Given$/ }).first()).toBeVisible();
    await expect(gherkin.locator('.kw', { hasText: /^When$/ }).first()).toBeVisible();
    await expect(gherkin.locator('.kw', { hasText: /^Then$/ }).first()).toBeVisible();
    await expect(gherkin.getByTestId('assumption')).toHaveCount(2);

    await expect(page.getByTestId('assumption-list').getByRole('listitem')).toHaveCount(3);
  });

  test('handles a story without an improved version', async ({ page }) => {
    await page.goto('/improvement');
    await page.getByLabel('Story').selectOption('MOCK-004');
    await expect(page.getByRole('status')).toContainText('No improved version');
  });
});
