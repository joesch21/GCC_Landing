import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  new URL('../scripts/herald-service.mjs', import.meta.url),
  'utf8'
);

test('Herald exposes isolated GCCGoldCondor user OAuth without opening Chat reads or replies', () => {
  assert.match(source, /herald-x-chat-oauth\.mjs/);
  assert.match(source, /herald-x-chat-token-store\.mjs/);
  assert.match(source, /url\.pathname === '\/x\/chat\/auth\/status'/);
  assert.match(source, /url\.pathname === '\/x\/chat\/auth\/start'/);
  assert.match(source, /isPendingXChatOAuthState\(url\)/);
  assert.match(source, /persistChatTokenBundle/);
  assert.match(source, /loadChatTokenBundle/);
  assert.match(source, /inbox_read_enabled:\s*false/);
  assert.match(source, /reply_enabled:\s*false/);
  assert.doesNotMatch(source, /\/2\/chat\/conversations/);
  assert.doesNotMatch(source, /sendChatMessage|createDmMessage/);
});
