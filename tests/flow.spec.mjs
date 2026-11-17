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
  await allowRetakes(page);
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

test('one entry per phone: no "Start again" on Results, and reopening shows the same results', async ({ page, request }) => {
  test.skip(test.info().project.name !== 'phone-375', 'once is enough');
  await jumpTo(page, 'rank');
  await page.getByRole('button', { name: 'See my results' }).click();
  await expect(page.locator('#save-status-text')).toHaveText('Saved');
  await expect(page.getByRole('button', { name: 'Start again' })).toBeHidden();
  await expect(page.getByText('Thanks for taking part. Each phone can send one set of answers.')).toBeVisible();

  await page.reload();
  await expect(page.locator('[data-screen="results"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start again' })).toBeHidden();
  expect((await sheet(request)).results).toHaveLength(1);
});

test('French: the flag menu switches the page; the choice is kept; the Sheet still gets English names', async ({ page, request }) => {
  test.skip(test.info().project.name !== 'phone-375', 'once is enough');
  const external = watchExternal(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Language: English' }).click();
  await page.getByRole('button', { name: 'Français' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { level: 1, name: /Qu’est-ce qui compte le plus pour vous/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Langue.*Français/ })).toBeFocused();

  await page.reload(); // kept on this phone
  await page.getByRole('button', { name: 'Commencer le tri' }).click();
  await page.getByRole('button', { name: 'Compris' }).click();
  await expect(page.locator('.sort-head__label')).toHaveText('Carte 1 sur 45');
  await expect(page.locator('.stepper__text')).toHaveText('Étape 1 sur 5 · Trier');

  // The card is shown in French
  const fr = await page.evaluate(async () => {
    const all = (await (await fetch('values.json')).json()).values;
    const s = JSON.parse(localStorage.getItem('wcrp-cardsort-v1'));
    const v = all.find((x) => x.id === s.order[0]);
    return { fr: v.fr.name, en: v.name };
  });
  await expect(page.locator('#card-name')).toHaveText(fr.fr);

  // Switching back mid-sort keeps the place
  await page.getByRole('button', { name: /Langue/ }).click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('#card-name')).toHaveText(fr.en);
  await expect(page.locator('.sort-head__label')).toHaveText('Card 1 of 45');
  await page.getByRole('button', { name: /Language/ }).click();
  await page.getByRole('button', { name: 'Français' }).click();

  await jumpTo(page, 'rank');
  await expect(page.getByRole('heading', { level: 1, name: 'Classez-les' })).toBeVisible();
  await page.getByRole('button', { name: 'Voir mes résultats' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vos 5 valeurs les plus importantes' })).toBeVisible();
  await expect(page.locator('#save-status-text')).toHaveText('Enregistré');

  const shown = await page.locator('.top-item__name').allTextContents();
  const row = (await sheet(request)).results[0];
  const english = await page.evaluate(async (names) => {
    const all = (await (await fetch('values.json')).json()).values;
    return names.map((n) => all.find((v) => v.fr.name === n).name);
  }, shown);
  expect(row.slice(6, 11)).toEqual(english); // top_1..top_5 in English
  expect(external).toEqual([]);
});

test('header fits at 320 px in both languages (no sideways scroll)', async ({ page }) => {
  test.skip(test.info().project.name !== 'phone-375', 'once is enough');
  await page.setViewportSize({ width: 320, height: 640 });
  for (const lang of ['en', 'fr']) {
    await page.goto('/');
    await page.evaluate((l) => localStorage.setItem('wcrp-cardsort-lang', l), lang);
    for (const step of ['start', 'sort', 'results']) {
      await jumpTo(page, step === 'sort' ? 'start' : step);
      if (step === 'sort') {
        await page.locator('#start-btn').click();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${lang} ${step}`).toBe(true);
    }
  }
});

/** Turns config.oneEntryPerDevice off for this page, so "Start again" is offered on Results. */
async function allowRetakes(page) {
  await page.route('**/config.js', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace(/oneEntryPerDevice:\s*true/, 'oneEntryPerDevice: false');
    await route.fulfill({ response: res, body });
  });
}
