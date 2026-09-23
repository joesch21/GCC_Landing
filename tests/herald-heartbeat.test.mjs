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

test('heartbeat allows technical crypto discussion but blocks promotion and GCC solicitation', () => {
  assert.match(source, /PROMOTIONAL_PATTERNS/);
  assert.match(source, /PROJECT_GUARD_PATTERNS/);
  assert.match(source, /where to buy/);
  assert.match(source, /price target/);
  assert.match(source, /airdrop/);
  assert.match(source, /\\bgcc\\b/);
  assert.match(source, /crypto payments/);
  assert.match(source, /smart contract/);
});

test('heartbeat interests match the Herald remit', () => {
  for (const term of [
    'agent identity',
    'machine-readable',
    'multi-agent',
    'verification',
    'sandbox',
    'autonomous agent',
    'agent economy',
    'agent grants',
    'grant proposal',
    'decentralized',
    'machine payments',
    'self-custody',
  ]) {
    assert.ok(source.includes(term), `missing interest: ${term}`);
  }
});
