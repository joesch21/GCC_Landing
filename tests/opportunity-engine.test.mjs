import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const snapshot = read('public/data/opportunity-engine.json');
const scarcityObservation = read('public/data/gcc-scarcity-observation.json');
const html = readFileSync('public/opportunity.html', 'utf8');
const adapter = readFileSync('public/js/opportunity-engine-surface.mjs', 'utf8');

const metric = id => snapshot.engine.evidence_matrix.find(item => item.metric_id === id);

test('production Opportunity Engine snapshot records canonical provenance', () => {
  assert.equal(snapshot.schema_version, 'gold-condor-opportunity-engine-snapshot-v1');
  assert.equal(snapshot.provenance.source_commit, '0faaac61dcfbf0f1752b7c13d0df7f8da2ec7772');
  assert.match(snapshot.provenance.source_sha256, /^[a-f0-9]{64}$/);
  assert.ok(snapshot.provenance.source_file.includes('opportunity-engine.json'));
  assert.equal(snapshot.engine.research_status.alignment, 'UNRESOLVED_NO_TEMPORAL_OVERLAP');
});

test('production snapshot exposes required historical evidence and withholds live scores', () => {
  assert.equal(metric('network.gcc.reconstructed_treasury_transactions').value, 4046);
  assert.equal(metric('network.gcc.multi_pool_share').value, 85.09639149777558);
  assert.equal(metric('network.gcc.canonical_pool_count').value, 5);
  assert.ok(snapshot.engine.pool_dispersion.metrics.some(item => item.metric_id === 'gcc.pool_dispersion.compression_share'));
  assert.ok(snapshot.engine.pool_leadership.metrics.length > 0);
  assert.ok(snapshot.engine.pool_bias.metrics.length > 0);
  assert.equal(snapshot.engine.gcc_price_environment.current_score.value, null);
  assert.equal(snapshot.engine.gcc_lp_environment.current_score.value, null);
  const scarcity = id => snapshot.engine.scarcity.metrics.find(item => item.metric_id === id);
  assert.equal(scarcity('gcc.scarcity.dead_address_balance').evidence_status, 'ESTABLISHED');
  assert.equal(scarcity('gcc.scarcity.nominal_total_supply').value, 1000000);
  assert.equal(scarcity('gcc.scarcity.dead_address_share').value, 5.077510545149);
  assert.equal(scarcity('gcc.reflection.dead_address_accumulation').evidence_status, 'PARTIAL');
  assert.equal(snapshot.provenance.enrichments[0].source_file, 'public/data/gcc-scarcity-observation.json');
  assert.equal(scarcityObservation.raw.dead_code, '0x');
});

test('network page uses the engine adapter and retains compatibility data', () => {
  assert.match(html, /opportunity-engine\.css/);
  assert.match(html, /opportunity-engine-surface\.mjs/);
  assert.match(html, /data\/opportunity-engine\.json/);
  assert.match(html, /engine-hero/);
  assert.match(adapter, /CURRENT OBSERVATION · BOUNDED SNAPSHOT/);
  assert.match(adapter, /No contemporaneous observation window exists yet/);
  assert.match(adapter, /current-gcc-observation-v1\.json/);
  assert.doesNotMatch(adapter, /eth_sendTransaction|personal_sign|privateKey|signer|wallet|swap/i);
  assert.ok(read('public/data/gcc-network-research.json'));
});
