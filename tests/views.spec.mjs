// Live view (projector), admin view and the newsletter form.
import { test, expect } from '@playwright/test';
import { sheet, resetSheet, watchExternal } from './helpers.mjs';

test.beforeEach(async ({ request }) => {
  await resetSheet(request);
});

test.describe('live view', () => {
  test.use({ viewport: { width: 1920, height: 1080 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });

  test('joined counter rises; chart hidden until 5 finish, then shows the top 10', async ({ page, request }) => {
    const external = watchExternal(page);
    for (let i = 0; i < 4; i++) await request.post('/exec', { data: JSON.stringify({ type: 'join', device_id: `d${i}`, mode: 'online' }) });
    await page.goto('/live.html');
    await expect(page.locator('#joined')).toHaveText('4');
    await expect(page.getByText('Results appear after 5 people finish')).toBeVisible();
    await expect(page.locator('#bars')).toBeHidden();

    await request.post('/__test/seed?n=3');
    await expect(page.locator('#finished')).toHaveText('3', { timeout: 8000 });
    await expect(page.locator('#waiting-left')).toHaveText('2 more to go');

    await request.post('/__test/seed?n=6');
    await expect(page.locator('#bars li')).toHaveCount(10, { timeout: 8000 });
    await expect(page.locator('#joined')).toHaveText('13');
    await expect(page.locator('#status')).toHaveText(/^Updated \d+ s ago$/);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    expect(external).toEqual([]);
  });

  test('keeps the last numbers and says "Reconnecting…" when the receiver is down', async ({ page, request }) => {
    await request.post('/__test/seed?n=6');
    await page.goto('/live.html');
    await expect(page.locator('#bars li')).toHaveCount(10);
    await request.post('/__test/outage?on=1');
    await expect(page.locator('#status')).toHaveText(/^Reconnecting…/, { timeout: 8000 });
    await expect(page.locator('#bars li')).toHaveCount(10);
    await request.post('/__test/outage?on=0');
    await expect(page.locator('#status')).toHaveText(/^Updated/, { timeout: 8000 });
  });

  test('the QR opens full screen; Esc or a click closes it; the address stays clear of the chart', async ({ page }) => {
    await page.goto('/live.html');
    const url = await page.locator('#join-url').boundingBox();
    const chart = await page.locator('.live__chart').boundingBox();
    expect(url.x + url.width).toBeLessThanOrEqual(chart.x);

    const btn = page.getByRole('button', { name: /QR code/ });
    const full = page.getByRole('dialog', { name: 'Scan to join' });
    await btn.click();
    await expect(full).toBeVisible();
    const img = await page.locator('#qr-full-img').boundingBox();
    expect(img.height).toBeGreaterThan(600); // fills most of a 1080 px screen
    await page.keyboard.press('Escape');
    await expect(full).toBeHidden();
    await expect(btn).toBeFocused();

    await btn.click();
    await full.click();
    await expect(full).toBeHidden();
  });
});

test.describe('admin view', () => {
  test('wrong PIN is refused; right PIN shows counts; Lock hides them again', async ({ page, request }) => {
    await request.post('/__test/seed?n=7');
    await page.goto('/admin.html');
    await expect(page.locator('#dash')).toBeHidden();
    await page.getByLabel('PIN', { exact: true }).fill('0000');
    await page.getByRole('button', { name: 'Unlock' }).click();
    await expect(page.getByText("That PIN isn't right.")).toBeVisible();
    await expect(page.locator('#dash')).toBeHidden();

    await page.getByLabel('PIN', { exact: true }).fill('1234'); // test server PIN
    await page.getByRole('button', { name: 'Unlock' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Group results' })).toBeVisible();
    await expect(page.locator('#t-finished')).toHaveText('7');
    await expect(page.locator('#t-joined')).toHaveText('7');
    const rows = page.locator('#counts-body tr');
    expect(await rows.count()).toBeGreaterThan(5);
    const total = await page.locator('#counts-body td:nth-child(3)').allTextContents();
    expect(total.map(Number).reduce((a, b) => a + b, 0)).toBe(35); // 7 people × 5 values

    await page.reload(); // still unlocked in this tab
    await expect(page.locator('#dash')).toBeVisible();
    await page.getByRole('button', { name: 'Lock' }).click();
    await expect(page.locator('#lock')).toBeVisible();
  });

  test('counts stay hidden under 5 results', async ({ page, request }) => {
    await request.post('/__test/seed?n=2');
    await page.goto('/admin.html');
    await page.getByLabel('PIN', { exact: true }).fill('1234');
    await page.getByRole('button', { name: 'Unlock' }).click();
    await expect(page.locator('#counts-note')).toHaveText(/Counts appear once 5 people have finished \(3 to go\)/);
    await expect(page.locator('#table-wrap')).toBeHidden();
  });
});

test.describe('newsletter', () => {
  test('sign-up goes to MailerLite only, never to the Sheet, and carries no card-sort data', async ({ page, request }) => {
    await page.goto('/');
    await expect.poll(async () => (await sheet(request)).joins.length).toBe(1);
    await page.getByRole('button', { name: 'Join the newsletter' }).click();
    const form = page.getByRole('dialog', { name: 'Join the WCRP Academy newsletter' });
    await expect(form).toBeVisible();

    await form.getByRole('button', { name: 'Subscribe' }).click();
    await expect(form.getByText('Enter your first name.')).toBeVisible();

    await form.getByLabel('First name').fill('Thandi');
    await form.getByLabel('Last name').fill('Nkosi');
    await form.getByLabel('Email address').fill('thandi@example.org');
    await form.getByLabel('Country').selectOption('South Africa');
    await form.getByLabel('Researcher').check();
    await form.getByRole('checkbox', { name: /I agree to receive communications/ }).check();
    await form.getByRole('button', { name: 'Subscribe' }).click();
    await expect(form.getByText('Thank you for signing up!')).toBeVisible();

    const s = await sheet(request);
    expect(s.mailerlite).toHaveLength(1);
    const sent = s.mailerlite[0].body;
    expect(sent.email).toBe('thandi@example.org');
    expect(sent.groups).toEqual(['test-group']);
    expect(sent.fields).toMatchObject({ name: 'Thandi', last_name: 'Nkosi', country: 'South Africa', are_you_aan: 'Researcher' });
    expect(sent.fields.i_agree_to_receive_communications_from_the_wcrp_academy_and_accept_the_data_privacy_statement).toBe('on');
    expect(JSON.stringify(sent)).not.toMatch(/device|submission|P-[A-Z0-9]{4}/);
    expect(s.results).toHaveLength(0);
    expect(JSON.stringify(s.joins)).not.toContain('thandi');
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/thandi|nkosi/i);
  });
});
