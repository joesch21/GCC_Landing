import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildXDraft } from '../scripts/herald-x.mjs';

const source = fs.readFileSync(
  new URL('../scripts/herald-x.mjs', import.meta.url),
  'utf8'
);

test('X Stage 1 is structurally dry-run only', () => {
  const draft = buildXDraft();

  assert.equal(draft.status, 'X_STAGE1_DRY_RUN');
  assert.equal(draft.stage, 1);
  assert.equal(draft.posting_enabled, false);
  assert.equal(draft.network_write_capability, false);
  assert.equal(draft.credentials_required, false);

  assert.doesNotMatch(source, /api\.x\.com/i);
  assert.doesNotMatch(source, /twitter\.com\/2\/tweets/i);
  assert.doesNotMatch(source, /X_CLIENT_SECRET|X_ACCESS_TOKEN|X_REFRESH_TOKEN/);
  assert.doesNotMatch(source, /Authorization:/);
  assert.doesNotMatch(source, /method:\s*['"]POST['"]/);
  assert.doesNotMatch(source, /fetch\s*\(/);
});

test('X Stage 1 produces a bounded two-post Genesis I thread', () => {
  const draft = buildXDraft();

  assert.equal(draft.campaign, 'GCC-GENESIS-001');
  assert.equal(draft.posts.length, 2);
  assert.equal(draft.posts[0].sequence, 1);
  assert.equal(draft.posts[1].sequence, 2);
  assert.equal(draft.posts[1].reply_to, 'POST_1');

  for (const post of draft.posts) {
    assert.ok(post.text.length <= 280, `post ${post.sequence} exceeds X limit`);
  }

  assert.match(draft.posts[0].text, /#AIAgents/);
  assert.match(draft.posts[0].text, /#AgentEconomy/);
  assert.match(draft.posts[0].text, /#OpenTender/);

  const machine = JSON.parse(draft.posts[1].text);
  assert.equal(machine.type, 'open_tender');
  assert.equal(machine.id, 'GCC-GENESIS-001');
  assert.equal(machine.reward, '10 GCC');
  assert.equal(machine.deadline, '2026-10-02T04:00:00.000Z');
  assert.equal(
    machine.discover,
    'https://www.goldcondor.info/.well-known/gcc-agent.json'
  );
});
