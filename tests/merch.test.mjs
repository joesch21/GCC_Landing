import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const merchPath = new URL('../public/merch.html', import.meta.url);
const waitlistPath = new URL('../api/merch-waitlist.js', import.meta.url);

test('merch page exposes prelaunch waitlist and four preorder products', async () => {
  const html = await readFile(merchPath, 'utf8');

  assert.match(html, /id="merch-waitlist"/);
  assert.match(html, /Notify me at launch/);

  for (const product of [
    'Operator Crest Tee',
    'Operator Cap',
    'Founders Seal Tee',
    'Vault Hoodie'
  ]) {
    assert.match(html, new RegExp(product));
  }

  assert.equal(
    (html.match(/https:\/\/schema\.org\/PreOrder/g) || []).length,
    4
  );
});

test('merch product photography avoids generic emblem placeholders', async () => {
  const html = await readFile(merchPath, 'utf8');

  assert.match(html, /condor-seal-tee-model\.webp/);
  assert.match(html, /condor-vault-hoodie\.webp\?v=20260915a/);

  const operatorSection = html.slice(
    html.indexOf('<section id="operator">'),
    html.indexOf('<section id="lab"')
  );

  assert.doesNotMatch(operatorSection, /src="\/no_mask\.png"/);
});

test('below-hero merch images are lazy loaded and dimensioned', async () => {
  const html = await readFile(merchPath, 'utf8');

  const operatorSection = html.slice(
    html.indexOf('<section id="operator">'),
    html.indexOf('<section id="lab"')
  );

  assert.match(operatorSection, /width="800" height="1000" loading="lazy"/);
  assert.match(operatorSection, /width="1024" height="1024" loading="lazy"/);
});

test('waitlist endpoint fails closed without persistence configuration', async () => {
  const source = await readFile(waitlistPath, 'utf8');

  assert.match(source, /MERCH_WAITLIST_WEBHOOK_URL/);
  assert.match(source, /return res\.status\(503\)/);
  assert.match(source, /url\.protocol !== 'https:'/);
  assert.doesNotMatch(source, /writeFile|appendFile|console\.log\(email/);
});
