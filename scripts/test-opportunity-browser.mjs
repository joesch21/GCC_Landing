import { createRequire } from 'node:module';
import { mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(import.meta.dirname, '..');
const fixture = await mkdtemp(path.join(tmpdir(), 'gcc-opportunity-test-'));
await cp(path.join(root, 'server.js'), path.join(fixture, 'server.cjs'));
await cp(path.join(root, 'public'), path.join(fixture, 'public'), {recursive: true});
await cp(path.join(root, 'winningNFT.json'), path.join(fixture, 'winningNFT.json'));
const port = process.env.TEST_PORT || '3187';
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [path.join(fixture, 'server.cjs')], {env: {...process.env, PORT: port, NODE_PATH: path.join(root, 'node_modules')}, stdio: 'pipe'});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/network`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'isolated server started');
  browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1280, height: 900}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/network`);
  await page.waitForSelector('html[data-research-ready="true"]');
  assert.equal(await page.locator('h1').textContent(), 'GCC Opportunity Surface');
  assert.equal(await page.locator('.research-card').count(), 11);
  assert.match(await page.locator('#history').innerText(), /4,046/);
  assert.match(await page.locator('#history').innerText(), /85\.0964%/);
  assert.match(await page.locator('#macro').innerText(), /UNRESOLVED_NO_TEMPORAL_OVERLAP/);
  assert.match(await page.locator('#price').innerText(), /UNAVAILABLE/);
  assert.match(await page.locator('#lp').innerText(), /UNAVAILABLE/);
  assert.equal(await page.locator('.network-svg').getAttribute('data-confirmation'), 'unavailable');
  assert.equal(await page.locator('#panels img, #panels svg image').count(), 0, 'all dashboard graphics native');
  await page.locator('[data-json="price"]').click();
  assert.equal(await page.locator('#json-dialog').evaluate(dialog => dialog.open), true);
  assert.match(await page.locator('#json-content').innerText(), /current_score/);
  await page.keyboard.press('Escape');
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({width, height: 844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no page overflow at ${width}`);
  }
  for (const url of ['/about', '/agents', '/network.html', '/data/opportunity-engine.json', '/data/gcc-network-research.json']) {
    const response = await fetch(`${base}${url}`);
    assert.equal(response.status, 200, url);
    if (url.endsWith('.json')) assert.ok(await response.json());
  }
  assert.deepEqual(errors, []);
  await page.route('**/data/opportunity-engine.json', route => route.abort());
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#data-notice').textContent.includes('could not be loaded'));
  assert.equal(await page.locator('.gauge').count(), 0);
  console.log('Browser checks passed: engine evidence, unavailable scores, JSON dialog, mobile overflow, compatibility routes, and fail-closed loading.');
} finally {
  if (browser) await browser.close();
  server.kill();
  await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
  await rm(fixture, {recursive: true, force: true});
}
