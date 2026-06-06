/**
 * Browser debug: branch admin login + navigation should not logout.
 * Run: node scripts/debug-branch-admin-login.mjs
 */
import puppeteer from 'puppeteer';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = 'branch@bingchunsrilanka.lk';
const PASSWORD = 'Branch@123';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(step, data) {
  console.log(`\n[${step}]`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

async function readStorage(page) {
  return page.evaluate(() => ({
    url: location.href,
    bc_admin: localStorage.getItem('bc_admin'),
    bc_admin_token: localStorage.getItem('bc_admin_token') ? 'present' : null,
  }));
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') log('BROWSER ERROR', msg.text());
  });

  try {
    log('1', `Open ${BASE}/admin/login`);
    await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle2', timeout: 60000 });

    log('2', 'Fill login form');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', EMAIL, { delay: 20 });
    await page.type('input[type="password"]', PASSWORD, { delay: 20 });

    log('3', 'Submit login');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
      page.click('button[type="submit"]'),
    ]);

    let storage = await readStorage(page);
    log('4 AFTER LOGIN', storage);

    if (storage.url.includes('/admin/login')) {
      throw new Error('Still on login page after submit');
    }
    if (!storage.bc_admin || !storage.bc_admin_token) {
      throw new Error('Session not stored in localStorage after login');
    }

    await sleep(1500);
    storage = await readStorage(page);
    log('5 AFTER 1.5s', storage);

    if (storage.url.includes('/admin/login')) {
      throw new Error('Redirected back to login within 1.5s');
    }

    log('6', 'Navigate to Wallet via sidebar link');
    const walletHref = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a')];
      const wallet = links.find((a) => a.textContent?.trim() === 'Wallet');
      return wallet?.getAttribute('href') || null;
    });
    log('6 wallet href', walletHref);

    if (walletHref) {
      await page.goto(`${BASE}${walletHref}`, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(1500);
      storage = await readStorage(page);
      log('7 AFTER WALLET', storage);

      if (storage.url.includes('/admin/login')) {
        throw new Error('Logged out when opening wallet');
      }
      if (!storage.bc_admin) {
        throw new Error('bc_admin cleared when opening wallet');
      }
    }

    log('8', 'Navigate to /admin/stock');
    await page.goto(`${BASE}/admin/stock`, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(1500);
    storage = await readStorage(page);
    log('9 AFTER STOCK', storage);

    if (storage.url.includes('/admin/login')) {
      throw new Error('Logged out when opening stock');
    }

    log('10', 'Navigate to /admin dashboard');
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(1500);
    storage = await readStorage(page);
    log('11 AFTER DASHBOARD', storage);
    if (storage.url.includes('/admin/login')) throw new Error('Logged out on dashboard');

    log('12', 'Hard reload on wallet page');
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1500);
    storage = await readStorage(page);
    log('13 AFTER RELOAD', storage);
    if (storage.url.includes('/admin/login')) throw new Error('Logged out after hard reload');

    console.log('\n✅ PASS: Branch admin stayed logged in through all routes');
  } catch (err) {
    const storage = await readStorage(page).catch(() => ({}));
    console.error('\n❌ FAIL:', err.message);
    console.error('Final state:', storage);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
