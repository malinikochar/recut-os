import { expect, test, type Page } from '@playwright/test';

async function navigateViaAppNav(page: Page, label: string) {
  const mobileMenuBtn = page.getByRole('button', {
    name: 'Open navigation menu',
  });
  if (await mobileMenuBtn.isVisible()) {
    await mobileMenuBtn.click();
    await page
      .getByRole('dialog')
      .getByRole('link', { name: label })
      .click();
    return;
  }
  await page
    .getByRole('navigation', { name: 'Workspace navigation' })
    .getByRole('link', { name: label })
    .click();
}

test.describe('ReCut OS — End-to-End Verification Suite', () => {
  test('defaults to light theme on first visit and supports persistent dark/light theme switching across routes', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto('/');

    // 1. Default theme must be 'light' (#fcfaf7 warm stone canvas) when no localStorage preference exists
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const lightBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor
    );
    expect(lightBg).toBe('rgb(252, 250, 247)');

    const switchToDark = page.getByRole('button', {
      name: 'Switch to dark theme',
    });
    await expect(switchToDark).toBeVisible();

    // 2. Toggle to dark theme (#413830 Evreghen Command Center dark canvas)
    await switchToDark.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(
      page.getByRole('button', { name: 'Switch to light theme' })
    ).toBeVisible();

    const darkBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor
    );
    expect(darkBg).toBe('rgb(65, 56, 48)');

    const storedDark = await page.evaluate(() =>
      window.localStorage.getItem('recut-theme')
    );
    expect(storedDark).toBe('dark');

    // 3. Navigate to /demo and reload — dark theme persists without reverting
    await page.getByRole('link', { name: /Try the live demo/i }).click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 4. Toggle back to light theme on /demo
    const demoSwitchToLight = page.getByRole('button', {
      name: 'Switch to light theme',
    });
    await expect(demoSwitchToLight).toBeVisible();
    await demoSwitchToLight.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const storedLight = await page.evaluate(() =>
      window.localStorage.getItem('recut-theme')
    );
    expect(storedLight).toBe('light');
  });

  test('public landing reaches interactive /demo in 1 click, renders verified SVG & cut sequence, and reports infeasible fixtures honestly', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', {
        name: /Cut from the offcuts you already own/i,
      })
    ).toBeVisible();

    // 1 click from landing page to /demo
    await page.getByRole('link', { name: /Try the live demo/i }).click();
    await expect(page).toHaveURL(/\/demo$/);

    // Mandatory illustrative disclaimer & honest impact qualifier
    await expect(
      page.getByText(
        'Illustrative workshop example — results are computed from sample inputs.'
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        'Estimated from these inputs. No physical material has been verified as saved.'
      )
    ).toBeVisible();

    // ReCut OS plan uses 3 remnants & 0 new sheets vs 1 sheet baseline
    await expect(
      page.getByRole('button', { name: /ReCut OS Plan \(3 sheets\)/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: /Compare New-Sheet Baseline \(1 sheet\)/i,
      })
    ).toBeVisible();

    // Accessible SVG layout diagram is present and does not overflow viewport horizontally
    const svgDiagram = page.locator('main svg[role="img"]').first();
    await expect(svgDiagram).toBeVisible();

    const docOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 2
      );
    });
    expect(docOverflow).toBe(true);

    // Switch to impossible-oversized-part-v1 fixture -> explicit infeasibility error
    await page
      .getByRole('button', { name: /impossible-oversized-part-v1/i })
      .click();
    await expect(
      page.getByText('Job Infeasible Under Current Constraints')
    ).toBeVisible();
    await expect(page.getByText(/\[part_exceeds_stock\]/i)).toBeVisible();
  });

  test('unauthenticated requests to /app redirect cleanly to /login', async ({
    page,
  }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText('Sign in to your workshop')
    ).toBeVisible();
  });

  test('authenticated workshop flow: signup, material, remnant, draft plans, atomic commit, pending remnant verification, and stale plan conflict guard', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const email = `recut-e2e-${uniqueId}@gmail.com`;
    const password = `ReCutE2E!${uniqueId}`;

    // 1. Sign up on /login
    await page.goto('/login');
    await page.getByRole('tab', { name: 'Create account' }).click();
    await page.getByLabel('Workshop Email').fill(email);
    await page.getByLabel(/Password/i).fill(password);
    await page
      .getByRole('button', { name: 'Create workshop account' })
      .click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(
      page.getByRole('heading', { name: 'Workshop Recovery Console' })
    ).toBeVisible();

    // Verify AppShell starts in default light theme and toggles cleanly on both desktop & mobile
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // 2. Create Material in Catalog
    await navigateViaAppNav(page, 'Material Catalog');
    await expect(page).toHaveURL(/\/app\/materials$/);
    await page.getByLabel('Material Name').fill('E2E Birch Plywood 18mm');
    await page.getByRole('button', { name: 'Save Material' }).click();
    await expect(
      page.getByText(/Added material "E2E Birch Plywood 18mm" to catalog\./i)
    ).toBeVisible();

    // 3. Record 1 physical remnant (1000 x 600 mm)
    await navigateViaAppNav(page, 'Sheet & Remnant Stock');
    await expect(page).toHaveURL(/\/app\/inventory$/);
    await page.getByLabel('Rack Label / Tag').fill('E2E-REM-01');
    await page.getByLabel('Width W (mm)').fill('1000');
    await page.getByLabel('Height H (mm)').fill('600');
    await page.getByRole('button', { name: 'Add to Rack Inventory' }).click();
    await expect(
      page.getByText(/Recorded physical stock "E2E-REM-01"\./i)
    ).toBeVisible();

    // 4. Create Job Alpha & generate Draft Plan 1 allocating E2E-REM-01
    await navigateViaAppNav(page, 'Cutting Jobs');
    await page.getByRole('link', { name: 'New Cutting Job' }).click();
    await expect(page).toHaveURL(/\/app\/jobs\/new$/);

    await page
      .getByLabel('Job Title / Order Reference')
      .fill('E2E Batch Alpha');
    await page.getByLabel('Part Label').first().fill('Alpha Panel');
    await page.getByLabel('Width (mm)').first().fill('600');
    await page.getByLabel('Height (mm)').first().fill('500');
    await page.getByLabel('Quantity').first().fill('1');
    await page.getByRole('button', { name: 'Save Cutting Job' }).click();

    await expect(page).toHaveURL(/\/app\/jobs\/[0-9a-f-]+$/);
    await page.getByRole('button', { name: 'Generate Cutting Plan' }).click();
    await expect(page).toHaveURL(/\/app\/plans\/[0-9a-f-]+$/);
    const plan1Url = page.url();
    await expect(
      page.getByText('Draft Cutting Plan — Ready for Shop Commit')
    ).toBeVisible();

    // 5. Create Job Beta & generate Draft Plan 2 BEFORE committing Plan 1 (so both reference E2E-REM-01)
    await navigateViaAppNav(page, 'Cutting Jobs');
    await page.getByRole('link', { name: 'New Cutting Job' }).click();
    await page
      .getByLabel('Job Title / Order Reference')
      .fill('E2E Batch Beta (Stale)');
    await page.getByLabel('Part Label').first().fill('Beta Panel');
    await page.getByLabel('Width (mm)').first().fill('600');
    await page.getByLabel('Height (mm)').first().fill('500');
    await page.getByLabel('Quantity').first().fill('1');
    await page.getByRole('button', { name: 'Save Cutting Job' }).click();

    await expect(page).toHaveURL(/\/app\/jobs\/[0-9a-f-]+$/);
    await page.getByRole('button', { name: 'Generate Cutting Plan' }).click();
    await expect(page).toHaveURL(/\/app\/plans\/[0-9a-f-]+$/);
    const plan2Url = page.url();

    // 6. Commit Plan 1 -> succeeds atomically & stages 1 pending_confirmation remnant (397x600)
    await page.goto(plan1Url, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Commit Cutting Plan' }).click();
    await expect(page.getByText('Committed Production Plan')).toBeVisible();
    await expect(page.getByText('Audit Locked')).toBeVisible();

    // 7. Attempt to commit stale Plan 2 -> blocked atomically with Inventory Conflict recovery CTA
    await page.goto(plan2Url, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Commit Cutting Plan' }).click();
    await expect(
      page.getByText('Inventory Conflict — Stale Plan Blocked')
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: 'Return to Job & Generate Fresh Plan',
      })
    ).toBeVisible();

    // 8. Verify pending remnant in /app/inventory and confirm it into available rack stock
    await page.goto('/app/inventory?state=pending_confirmation', {
      waitUntil: 'networkidle',
    });
    await expect(
      page.getByRole('button', { name: 'Confirm Available' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Available' }).click();
    await expect(
      page.getByText(/as available on rack\./i)
    ).toBeVisible();
  });
});
