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


test('Herald introduction uses official Moltbook submolt field and does not match search-query echoes', () => {
  const source = fs.readFileSync(new URL('../scripts/herald-service.mjs', import.meta.url), 'utf8');
  assert.match(source, /submolt: SUBMOLT/);
  assert.doesNotMatch(source, /submolt_name: SUBMOLT/);
  assert.match(source, /\/posts\?sort=new&limit=100/);
  assert.match(source, /post\.content/);
});


test('Herald service exposes the bounded heartbeat runner', () => {
  const source = fs.readFileSync(new URL('../scripts/herald-service.mjs', import.meta.url), 'utf8');
  assert.match(source, /scripts\/herald-heartbeat\.mjs/);
  assert.match(source, /url\.pathname === '\/heartbeat'/);
});


test('Herald Stage 3 one-shot startup path is explicit and never logs the approval token', () => {
  const source = fs.readFileSync(new URL('../scripts/herald-service.mjs', import.meta.url), 'utf8');
  assert.match(source, /X_STAGE3_ONE_SHOT_ENABLED/);
  assert.match(source, /X_STAGE3_ONE_SHOT_APPROVAL_TOKEN/);
  assert.match(source, /HERALD_X_STAGE3_ONE_SHOT_COMPLETE/);
  assert.match(source, /executeApprovedDraft/);
  const completeLog = source.slice(
    source.indexOf("event: 'HERALD_X_STAGE3_ONE_SHOT_COMPLETE'"),
    source.indexOf("event: 'HERALD_X_STAGE3_ONE_SHOT_FAILED'")
  );
  assert.doesNotMatch(completeLog, /X_STAGE3_ONE_SHOT_APPROVAL_TOKEN/);
  assert.doesNotMatch(completeLog, /approvalToken/);
});

test('Herald service exposes X Chat Stage 1B discovery only', () => {
  const source = fs.readFileSync(new URL('../scripts/herald-service.mjs', import.meta.url), 'utf8');
  assert.match(source, /herald-x-chat\.mjs/);
  assert.match(source, /url\.pathname === '\/x\/chat\/status'/);
  assert.match(source, /HERALD_X_CHAT_BOT_DISCOVERED/);
  assert.match(source, /discoverChatBots/);
  assert.match(source, /selectExpectedChatBot/);
  assert.match(source, /publicChatBotStatus/);
  assert.doesNotMatch(source, /sendChatMessage/);
  assert.doesNotMatch(source, /createDmMessage/);
});

test('Herald service exposes bounded X Stage 3 while gates remain explicit', () => {
  const source = fs.readFileSync(new URL('../scripts/herald-service.mjs', import.meta.url), 'utf8');
  assert.match(source, /scripts\/herald-x\.mjs/);
  assert.match(source, /herald-x-oauth\.mjs/);
  assert.match(source, /herald-x-token-store\.mjs/);
  assert.match(source, /herald-x-stage3\.mjs/);
  assert.match(source, /url\.pathname === '\/x\/draft'/);
  assert.match(source, /url\.pathname === '\/x\/auth\/status'/);
  assert.match(source, /url\.pathname === '\/x\/stage3\/status'/);
  assert.match(source, /url\.pathname === '\/x\/approval'/);
  assert.match(source, /url\.pathname === '\/x\/post'/);
  assert.match(source, /url\.pathname === '\/x\/auth\/start'/);
  assert.match(source, /url\.pathname === '\/x\/callback'/);
  assert.match(source, /x_stage: 3/);
  assert.match(source, /stage3Config\(\)\.posting_enabled/);
  assert.match(source, /assertApprovalOperator/);
  assert.match(source, /executeApprovedDraft/);
  assert.match(source, /X_EXPECTED_USERNAME/);
  assert.match(source, /X_OAUTH_SETUP_ENABLED/);
  assert.doesNotMatch(source, /X_ACCESS_TOKEN|X_REFRESH_TOKEN/);
});
