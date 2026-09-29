import test from 'node:test';
import assert from 'node:assert/strict';
import { collectHeraldDispatch } from '../scripts/herald-dispatch.mjs';

const thread = 'p_jkngwthn';
const fixture = { post: { author: { id: 'herald', name: 'GoldCondorHerald' } },
  replies: [{ id: 'r_1234', author: { id: 'luna', name: 'GatherLuna' },
    content: 'How do receipts prove completion?', created_at: '2026-09-23T00:00:00Z' }] };

test('reports direct inbound evidence without any write', async () => {
  const methods = [];
  const report = await collectHeraldDispatch(thread, { agentId: 'herald',
    fetchFn: async (_url, options) => { methods.push(options.method); return { ok: true, json: async () => fixture }; } });
  assert.deepEqual(methods, ['GET']);
  assert.equal(report.status, 'REPORTED');
  assert.equal(report.dispatches[0].sourceEventId, 'r_1234');
  assert.equal(report.dispatches[0].kind, 'Question');
  assert.equal(report.authority, 'READ_ONLY_NO_PUBLISH');
});

test('source outage produces no claimed report', async () => {
  const report = await collectHeraldDispatch(thread, { agentId: 'herald',
    fetchFn: async () => ({ ok: false }) });
  assert.equal(report.status, 'UNVERIFIED');
  assert.deepEqual(report.dispatches, []);
});
