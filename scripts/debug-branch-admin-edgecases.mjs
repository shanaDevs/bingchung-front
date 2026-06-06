/**
 * Edge-case browser debug for branch admin logout.
 */
import puppeteer from 'puppeteer';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = 'branch@bingchunsrilanka.lk';
const PASSWORD = 'Branch@123';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', EMAIL, { delay: 10 });
  await page.type('input[type="password"]', PASSWORD, { delay: 10 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function state(page) {
  return page.evaluate(() => ({
    url: location.href,
    admin: localStorage.getItem('bc_admin'),
    token: !!localStorage.getItem('bc_admin_token'),
  }));
}

async function test(name, fn) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await fn(page);
    console.log(`✅ ${name}`);
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    console.log('   ', await state(page));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

async function main() {
  await test('system wallet page redirects without logout', async (page) => {
    await login(page);
    await page.goto(`${BASE}/admin/wallets`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    const s = await state(page);
    if (s.url.includes('/admin/login')) throw new Error('logged out');
    if (!s.token) throw new Error('token cleared');
    if (!s.url.includes('/admin/wallets/')) throw new Error(`unexpected url ${s.url}`);
  });

  await test('super-admin route redirects to orders not login', async (page) => {
    await login(page);
    await page.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    const s = await state(page);
    if (s.url.includes('/admin/login')) throw new Error('logged out');
    if (!s.url.includes('/admin/orders')) throw new Error(`expected orders, got ${s.url}`);
  });

  await test('leave admin to homepage and return', async (page) => {
    await login(page);
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await sleep(500);
    await page.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle2' });
    await sleep(1000);
    const s = await state(page);
    if (s.url.includes('/admin/login')) throw new Error('logged out after returning from homepage');
  });

  await test('legacy session without id is not infinite logout loop', async (page) => {
    await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      localStorage.setItem('bc_admin_token', 'fake-token');
      localStorage.setItem('bc_admin', JSON.stringify({ name: 'Legacy', role: 'STORE_MANAGER', storeId: 'store-bing-chun---nugegoda' }));
    });
    await page.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle2' });
    await sleep(1000);
    const s = await state(page);
    if (!s.url.includes('/admin/login')) throw new Error('should redirect to login for invalid session');
    // Re-login should work
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', EMAIL, { delay: 10 });
    await page.type('input[type="password"]', PASSWORD, { delay: 10 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]'),
    ]);
    const s2 = await state(page);
    if (s2.url.includes('/admin/login')) throw new Error('could not login after legacy session cleared');
  });
}

main();
