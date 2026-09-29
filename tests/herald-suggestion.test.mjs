import test from 'node:test';
import assert from 'node:assert/strict';
import { useTowerSuggestion } from '../scripts/herald-suggestion.mjs';
const input = { requestId: '11111111-1111-4111-8111-111111111111', threadId: 'p_jkngwthn',
  sourceEventId: 'r_abcdef', expectedText: 'How should verification evidence distinguish artifact integrity?',
  content: 'Separating verification evidence from artifact integrity helps clarify acceptance criteria.' };
function fixture(overrides = {}) {
  const calls = [];
  const deps = { enabled: true, read: async (path) => path === 'ACTIVITY'
    ? { recent_replies: [] } : { topic_id: 'dev', replies: [{ id: input.sourceEventId,
      content: input.expectedText, author: { name: 'GatherLuna' }, created_at: '2026-09-23T08:31:03Z' }] },
    write: async (path, body, capability) => { calls.push({ path, body, capability }); return { id: 'r_created' }; },
    score: () => ({ score: 7 }), ownReply: () => false, cooldown: () => false, ...overrides };
  return { deps, calls };
}
test('selected contextual suggestion uses only the bounded reply path', async () => {
  const { deps, calls } = fixture();
  const result = await useTowerSuggestion(input, deps);
  assert.equal(result.status, 'SENT'); assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/v1/posts/p_jkngwthn/replies');
  assert.equal(calls[0].capability, 'reply');
  assert.match(calls[0].body.content, /GatherLuna/);
  assert.equal(result.verification, 'WRITE_ACKNOWLEDGED_PUBLIC_READBACK_PENDING');
});
for (const [name, overrides, reason] of [
  ['unavailable source', { read: async () => { throw Error('500'); } }, 'SOURCE_UNAVAILABLE'],
  ['cooldown', { cooldown: () => true }, 'REPLY_COOLDOWN'],
  ['off-project message', { score: () => ({ score: 0 }) }, 'OUTSIDE_PROJECT_DISCUSSION'],
  ['already answered', { ownReply: (item) => item.id !== input.sourceEventId }, null],
]) {
  if (!reason) continue;
  test(name + ' never writes', async () => {
    const { deps, calls } = fixture(overrides);
    const result = await useTowerSuggestion(input, deps);
    assert.equal(result.reason, reason); assert.equal(calls.length, 0);
  });
}
test('changed context and unrelated draft are held', async () => {
  const { deps, calls } = fixture();
  assert.equal((await useTowerSuggestion({ ...input, expectedText: 'Changed' }, deps)).reason, 'CONVERSATION_CHANGED');
  assert.equal((await useTowerSuggestion({ ...input, content: 'Hello lovely weather today.' }, deps)).reason, 'INSUFFICIENT_CONTEXT_MATCH');
  assert.equal(calls.length, 0);
});
test('failed write is uncertain and cannot be called verified', async () => {
  const { deps } = fixture({ write: async () => { throw Error('timeout'); } });
  assert.equal((await useTowerSuggestion(input, deps)).status, 'UNKNOWN');
});


test('existing Herald reply and authority promise are held without writes', async () => {
  const { deps, calls } = fixture({ read: async (path) => path === 'ACTIVITY'
    ? { recent_replies: [] } : { topic_id: 'dev', replies: [
      { id: input.sourceEventId, content: input.expectedText, author: { name: 'GatherLuna' } },
      { id: 'r_own', content: 'Earlier reply' }] },
    ownReply: (item) => item.id === 'r_own' });
  assert.equal((await useTowerSuggestion(input, deps)).reason, 'HERALD_ALREADY_REPLIED_IN_THREAD');
  assert.equal((await useTowerSuggestion({ ...input, content: 'We will fund this project.' }, deps)).reason, 'AUTHORITY_OR_SECRET_CONTENT');
  assert.equal(calls.length, 0);
});
