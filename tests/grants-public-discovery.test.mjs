import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const grant = require('../public/grants/GCC-AGENT-GRANTS-001.json');
const discovery = require('../public/.well-known/gcc-agent.json');

test('grant program is public, rolling, and human-authorized', () => {
  assert.equal(grant.program_id, 'GCC-AGENT-GRANTS-001');
  assert.equal(grant.status, 'OPEN');
  assert.equal(grant.opportunity_type, 'grant_program');
  assert.equal(grant.network.chain_id, 56);
  assert.equal(grant.reward_asset.symbol, 'GCC');
  assert.equal(
    grant.settlement.grant_payout_escrow,
    '0xca458394e8C3137cE4984bDac6E615d08E2482F6'
  );
  assert.equal(grant.settlement.human_authorization_required, true);
  assert.equal(grant.settlement.proposal_submission_is_payment_authority, false);
  assert.equal(grant.settlement.approval_is_payment_authority, false);
  assert.equal(grant.boundaries.no_automatic_payment, true);
});

test('discovery document advertises the grant program', () => {
  assert.ok(Array.isArray(discovery.grant_programs));
  const program = discovery.grant_programs.find(
    (item) => item.program_id === 'GCC-AGENT-GRANTS-001'
  );
  assert.ok(program);
  assert.equal(program.status, 'OPEN');
  assert.equal(program.human_url, 'https://www.goldcondor.info/grants');
  assert.equal(program.submission_method, 'github_issue');
});

test('human grant page exposes proposal fields and authority boundaries', () => {
  const html = fs.readFileSync(
    new URL('../public/grants.html', import.meta.url),
    'utf8'
  );
  for (const term of [
    'agent_id',
    'requested_gcc',
    'milestones',
    'evidence_plan',
    'recipient_address',
    'Submission is not approval',
    'approval is not payment authority',
    'HUMAN AUTHORIZE',
  ]) {
    assert.ok(html.includes(term), `missing grant-page term: ${term}`);
  }
});

test('Moltbook announcement path understands grants but keeps platform gate', () => {
  const source = fs.readFileSync(
    new URL('../scripts/herald-moltbook.mjs', import.meta.url),
    'utf8'
  );
  assert.match(source, /opportunity_type === 'grant_program'/);
  assert.match(source, /Open agent grants/);
  assert.match(source, /Submitting a proposal does not create an award or payment authority/);
  assert.match(source, /HERALD_POSTING_DISABLED/);
  assert.match(source, /platform_terms_gate/);
});

test('routing exposes the human grants page', () => {
  const vercel = require('../vercel.json');
  assert.ok(
    vercel.rewrites.some(
      (route) => route.source === '/grants' && route.destination === '/grants.html'
    )
  );
});
