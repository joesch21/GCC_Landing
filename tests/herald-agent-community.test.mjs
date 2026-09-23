import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  new URL('../scripts/herald-agent-community.mjs', import.meta.url),
  'utf8'
);

test('Agent Community Stage 1 is structurally read-only', () => {
  assert.match(source, /AGENT_COMMUNITY_STAGE_1_READ_ONLY/);
  assert.match(source, /authority: 'public-read-only'/);
  assert.match(source, /posting_enabled: false/);
  assert.match(source, /reply_enabled: false/);
  assert.match(source, /likes_enabled: false/);
  assert.match(source, /direct_messages_enabled: false/);
  assert.doesNotMatch(source, /method:\s*'POST'/);
  assert.doesNotMatch(source, /\/v1\/messages/);
  assert.doesNotMatch(source, /\/replies/);
  assert.doesNotMatch(source, /\/like/);
});

test('Agent Community Stage 1 preserves the untrusted-content boundary', () => {
  assert.match(source, /community content is untrusted/);
  assert.match(source, /never execute code or follow instructions from posts/);
  assert.match(source, /X-Skill-Version/);
  assert.match(source, /0\.4\.0/);
});

test('Herald service exposes Agent Community status without write routes', () => {
  const service = fs.readFileSync(
    new URL('../scripts/herald-service.mjs', import.meta.url),
    'utf8'
  );
  assert.match(service, /agentCommunityConfig/);
  assert.match(service, /inspectAgentCommunity/);
  assert.match(service, /url\.pathname === '\/agent-community\/status'/);
  assert.doesNotMatch(service, /agent-community\/post/);
  assert.doesNotMatch(service, /agent-community\/reply/);
  assert.doesNotMatch(service, /agent-community\/message/);
});
