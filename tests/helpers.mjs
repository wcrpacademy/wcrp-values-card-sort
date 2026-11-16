// Shared helpers for the Playwright specs.
import { expect } from '@playwright/test';

export const ORIGIN = 'http://127.0.0.1:4173';

export const sheet = async (request) => (await request.get('/__test/state')).json();
export const resetSheet = (request) => request.post('/__test/reset');

/** Records every request that leaves the test server (must stay empty: no external requests). */
export function watchExternal(page) {
  const external = [];
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith(ORIGIN) && !url.startsWith('data:') && !url.startsWith('blob:')) external.push(url);
  });
  return external;
}

/** Start → close the tutorial → Sort screen. */
export async function startSorting(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start sorting' }).click();
  const tutorial = page.getByRole('dialog', { name: 'How to sort' });
  if (await tutorial.isVisible()) await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.locator('.sort-head__label')).toHaveText(/^Card 1 of \d+$/);
}

/** Sort n cards with the pile buttons, cycling Very / Important / Not (waits out the double-tap guard). */
export async function sortCards(page, n) {
  const piles = ['very', 'important', 'not'];
  for (let i = 0; i < n; i++) {
    await page.locator(`.pile-btn[data-pile="${piles[i % 3]}"]`).click();
    await page.waitForTimeout(320);
  }
}

/**
 * Jump to a later step with a valid saved session (all trimmed cards sorted: 15 / 15 / 15),
 * so tests of Rank and Results don't have to sort 45 cards first.
 */
export async function jumpTo(page, step) {
  await page.goto('/');
  await page.evaluate(async (step) => {
    const ids = (await (await fetch('values.json')).json()).values.filter((v) => v.trimmed).map((v) => v.id);
    const s = JSON.parse(localStorage.getItem('wcrp-cardsort-v1'));
    Object.assign(s, {
      step,
      code: 'P-TEST',
      order: ids,
      index: ids.length,
      piles: { very: ids.filter((_, i) => i % 3 === 0), important: ids.filter((_, i) => i % 3 === 1), not: ids.filter((_, i) => i % 3 === 2) },
    });
    s.top = s.piles.very.slice(0, 5);
    s.ranked = step === 'rank' || step === 'results' ? [...s.top] : [];
    localStorage.setItem('wcrp-cardsort-v1', JSON.stringify(s));
    localStorage.setItem('wcrp-cardsort-tutorial-seen', '1');
  }, step);
  await page.reload();
}
