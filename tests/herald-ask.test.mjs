import test from 'node:test';
import assert from 'node:assert/strict';
import { answerHeraldQuestion, parseAskHeraldQuestion } from '../scripts/herald-ask.mjs';

const question = 'Did you reply to GatherLuna in thread p_jkngwthn? Return IDs and text.';
const gather = { id: 'r_gather', author: { name: 'GatherLuna' }, content: 'What is the evidence?', created_at: '2026-09-25T00:00:00Z' };
const herald = { id: 'r_herald', author: { id: 'herald-1', name: 'GoldCondorHerald' },
  parent_reply_id: 'r_gather', content: 'Here is the evidence.', created_at: '2026-09-26T00:00:00Z' };
test('Ask Herald is a bounded read of its own reply with exact thread evidence', async () => {
  const methods = [];
  const fetchFn = async (url, options) => {
    methods.push(options.method);
    const body = String(url).includes('/activity')
      ? { recent_replies: [{ id: 'r_herald', post_id: 'p_jkngwthn' }] }
      : { replies: [gather, herald] };
    return { ok: true, json: async () => body };
  };
  const answer = await answerHeraldQuestion(question, { agentId: 'herald-1', fetchFn,
    now: () => new Date('2026-09-29T13:00:00Z') });
  assert.equal(answer.status, 'REPORTED_REPLY');
  assert.deepEqual(answer.targetEventIds, ['r_gather']);
  assert.equal(answer.replies[0].text, 'Here is the evidence.');
  assert.equal(answer.replies[0].parentEventId, 'r_gather');
  assert.deepEqual(methods, ['GET', 'GET']);
});
test('unsupported question and source failure never invent an answer', async () => {
  assert.equal(parseAskHeraldQuestion('Publish a reply in p_jkngwthn'), null);
  assert.equal((await answerHeraldQuestion('Publish a reply in p_jkngwthn')).status, 'UNSUPPORTED_QUESTION');
  const answer = await answerHeraldQuestion(question, { agentId: 'herald-1',
    fetchFn: async () => ({ ok: false, status: 500 }) });
  assert.equal(answer.status, 'UNVERIFIED');
  assert.deepEqual(answer.replies, []);
});

test('missing activity or incomplete exact text stays unverified', async () => {
  for (const [activity, ownReply, reason] of [
    [{ recent_replies: [] }, herald, 'ACTIVITY_NOT_CORROBORATED'],
    [{ recent_replies: [{ id: 'r_herald', post_id: 'p_jkngwthn' }] },
      { ...herald, content: 'X'.repeat(8001) }, 'EXACT_EVIDENCE_MISSING'],
  ]) {
    const answer = await answerHeraldQuestion(question, { agentId: 'herald-1',
      fetchFn: async (url) => ({ ok: true, json: async () =>
        String(url).includes('/activity') ? activity : { replies: [gather, ownReply] } }) });
    assert.equal(answer.status, 'UNVERIFIED');
    assert.equal(answer.reason, reason);
  }
});
