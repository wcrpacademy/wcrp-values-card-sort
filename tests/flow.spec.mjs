// Full participant run at 375 / 768 / 1280, plus resume and sending (docs/PLAN.md §8).
import { test, expect } from '@playwright/test';
import { sheet, resetSheet, watchExternal, startSorting, sortCards, jumpTo } from './helpers.mjs';

test.beforeEach(async ({ request }) => {
  await resetSheet(request);
});

test('full run: sort 45 cards, review, choose, rank, results; saved exactly once', async ({ page, request }) => {
  const external = watchExternal(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'What matters most to you?' })).toBeVisible();
  await expect.poll(async () => (await sheet(request)).joins.length, { message: 'phone counted as joined' }).toBe(1);

  await page.getByRole('button', { name: 'Start sorting' }).click();
  await expect(page.getByRole('dialog', { name: 'How to sort' })).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.locator('.stepper__text')).toHaveText('Step 1 of 5 · Sort');

  await sortCards(page, 45);
  await expect(page.getByRole('heading', { level: 1, name: 'Review your piles' })).toBeVisible();
  await expect(page.locator('.pile__count')).toHaveText(['15 values', '15 values', '15 values']);

  await page.getByRole('button', { name: 'Choose my top 5' }).click();
  const boxes = page.locator('.check-row input');
  for (let i = 0; i < 5; i++) await boxes.nth(i).check();
  await expect(page.locator('#choose-count')).toHaveText('5 of 5 chosen');
  await page.getByRole('button', { name: 'Continue' }).click();

  const names = await page.locator('.rank-row__name').allTextContents();
  await page.getByRole('button', { name: `Move ${names[0]} down` }).click();
  await page.getByRole('button', { name: 'See my results' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Your top 5 values' })).toBeVisible();
  await expect(page.locator('.top-item__name')).toHaveText([names[1], names[0], names[2], names[3], names[4]]);
  await expect(page.locator('#save-status-text')).toHaveText('Saved');

  const s = await sheet(request);
  expect(s.results).toHaveLength(1);
  const row = s.results[0];
  expect(row[2]).toMatch(/^P-[A-HJKMNP-Z2-9]{4}$/); // participant_code
  expect(row.slice(3, 6)).toEqual(['anonymous', 'miller-2001-v1', 5]); // id_mode, list_version, top_n
  expect(row.slice(6, 11)).toEqual([names[1], names[0], names[2], names[3], names[4]]); // top_1..top_5
  expect(row.slice(11, 16)).toEqual(['', '', '', '', '']); // top_6..top_10 empty
  expect(row[16].split('; ')).toHaveLength(15); // very_important
  expect(row[19]).toBe('online'); // mode

  await page.reload();
  await expect(page.locator('#save-status-text')).toHaveText('Saved');
  await page.waitForTimeout(500);
  expect((await sheet(request)).results).toHaveLength(1);
  expect((await sheet(request)).joins).toHaveLength(1);
  expect(external).toEqual([]);
});

test('refresh mid-sort returns to the same card', async ({ page }) => {
  await startSorting(page);
  await sortCards(page, 6);
  const card = await page.locator('#card-name').textContent();
  await page.reload();
  await expect(page.locator('.sort-head__label')).toHaveText('Card 7 of 45');
  await expect(page.locator('#card-name')).toHaveText(card);
  await expect(page.getByRole('dialog', { name: 'How to sort' })).toBeHidden();
});

test('no internet at the results screen: "Not sent yet", then sent once when back', async ({ page, request, context }) => {
  test.skip(test.info().project.name !== 'phone-375', 'once is enough');
  await jumpTo(page, 'rank');
  await expect.poll(async () => (await sheet(request)).joins.length).toBe(1);

  await context.setOffline(true);
  await page.getByRole('button', { name: 'See my results' }).click();
  await expect(page.locator('#save-status-text')).toHaveText("Not sent yet, we'll keep trying");
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect((await sheet(request)).results).toHaveLength(0);

  await context.setOffline(false); // the page hears "online" and sends
  await expect(page.locator('#save-status-text')).toHaveText('Saved');
  await page.getByRole('button', { name: 'Start again' }).isVisible();
  expect((await sheet(request)).results).toHaveLength(1);
});

test('receiver down: an unsent result survives "Start again" and is sent when the page reopens', async ({ page, request }) => {
  test.skip(test.info().project.name !== 'phone-375', 'once is enough');
  await jumpTo(page, 'rank');
  await request.post('/__test/outage?on=1');
  await page.getByRole('button', { name: 'See my results' }).click();
  await expect(page.locator('#save-status-text')).toHaveText("Not sent yet, we'll keep trying");

  // Start again while the result is still unsent: it stays queued on the phone
  await page.getByRole('button', { name: 'Start again' }).click();
  await page.getByRole('button', { name: 'Yes, start again' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'What matters most to you?' })).toBeVisible();

  await request.post('/__test/outage?on=0');
  await page.reload(); // reopening the page sends what is waiting
  await expect.poll(async () => (await sheet(request)).results.length).toBe(1);
});
