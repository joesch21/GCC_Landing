import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Herald service keeps Moltbook credentials out of source', () => {
  const source = fs.readFileSync(new URL('../scripts/herald-service.mjs', import.meta.url), 'utf8');
  assert.match(source, /process\.env\.MOLTBOOK_API_KEY/);
  assert.match(source, /process\.env\.HERALD_BOOTSTRAP_TOKEN/);
  assert.doesNotMatch(source, /moltbook_sk_[A-Za-z0-9_-]+/);
});

test('Herald service uses the official www Moltbook API host', () => {
  const source = fs.readFileSync(new URL('../scripts/herald-service.mjs', import.meta.url), 'utf8');
  assert.match(source, /https:\/\/www\.moltbook\.com\/api\/v1/);
});
