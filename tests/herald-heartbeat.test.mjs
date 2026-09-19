import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  new URL('../scripts/herald-heartbeat.mjs', import.meta.url),
  'utf8'
);

test('heartbeat is bounded to one discussion comment and never approves DMs', () => {
  assert.match(source, /break;\n  }/);
  assert.doesNotMatch(source, /dm\/requests\/.*approve/);
  assert.match(source, /OWNER_APPROVAL_REQUIRED_FOR_NEW_REQUESTS/);
});

test('heartbeat excludes crypto promotion topics', () => {
  assert.match(source, /'crypto'/);
  assert.match(source, /'cryptocurrency'/);
  assert.match(source, /'token'/);
  assert.match(source, /'gcc'/);
});

test('heartbeat interests match the Herald remit', () => {
  for (const term of [
    'agent identity',
    'machine-readable',
    'multi-agent',
    'verification',
    'sandbox',
    'autonomous agent',
  ]) {
    assert.ok(source.includes(term), `missing interest: ${term}`);
  }
});
