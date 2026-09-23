import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const opportunitiesOpen = require('../api/opportunities/open.js');

test('open-opportunity feed exposes Genesis I during the live window', () => {
  const feed = opportunitiesOpen.buildFeed(new Date('2026-09-18T05:00:00.000Z'));

  assert.equal(feed.schema_version, '1.0');
  assert.equal(feed.opportunities.length, 2);

  const opportunity = feed.opportunities.find(
    (item) => item.opportunity_id === 'GCC-GENESIS-001'
  );
  assert.ok(opportunity);
  assert.equal(opportunity.opportunity_id, 'GCC-GENESIS-001');
  assert.equal(opportunity.status, 'OPEN');
  assert.equal(opportunity.reward.asset, 'GCC');
  assert.equal(opportunity.reward.amount_per_valid_submission, '10');
  assert.equal(opportunity.network.chain_id, 56);
  assert.equal(opportunity.submission.method, 'github_issue');
  assert.equal(
    opportunity.tender_url,
    'https://www.goldcondor.info/tenders/GCC-GENESIS-001.json'
  );
});

test('rolling grant program remains open after the Genesis submission deadline', () => {
  const feed = opportunitiesOpen.buildFeed(new Date('2026-10-02T04:00:00.000Z'));
  assert.equal(feed.opportunities.length, 1);
  assert.equal(feed.opportunities[0].opportunity_id, 'GCC-AGENT-GRANTS-001');
  assert.equal(feed.opportunities[0].opportunity_type, 'grant_program');
  assert.equal(feed.opportunities[0].rolling, true);
  assert.equal(feed.opportunities[0].payment_authority, 'human_authorization_required');
});

test('discovery document points agents to the opportunity feed', () => {
  const discovery = require('../public/.well-known/gcc-agent.json');
  assert.equal(
    discovery.opportunities_url,
    'https://www.goldcondor.info/api/opportunities/open'
  );
});
