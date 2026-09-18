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


test('Herald introduction is idempotent and non-transactional', () => {
  const source = fs.readFileSync(new URL('../scripts/herald-service.mjs', import.meta.url), 'utf8');
  assert.match(source, /\[goldcondorherald:intro:v1\]/);
  assert.match(source, /HERALD_POST_INTRO_ON_START/);
  assert.match(source, /ALREADY_POSTED/);
  assert.doesNotMatch(source, /INTRO_CONTENT[\s\S]{0,1500}Reward:/);
  assert.doesNotMatch(source, /INTRO_CONTENT[\s\S]{0,1500}10 GCC/);
});
