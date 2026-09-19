import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const snapshot = read('public/data/current-gcc-observation-v1.json');
const schema = read('public/data/current-gcc-observation-v1.schema.json');
const html = readFileSync('public/opportunity.html', 'utf8');
const adapter = readFileSync('public/js/opportunity-engine-surface.mjs', 'utf8');
const renderer = readFileSync('public/js/current-observation.mjs', 'utf8');

test('current observation snapshot is frozen, provenance-backed, and schema-shaped', () => {
  assert.equal(snapshot.schema_version, schema.properties.schema_version.const);
  assert.equal(snapshot.backup_snapshot.id, '9f80f84f');
  assert.equal(snapshot.backup_snapshot.verification, 'PASS');
  assert.equal(snapshot.backup_snapshot.contains_research_root, true);
  assert.equal(snapshot.provenance.status, 'PASS');
  assert.equal(snapshot.observation_cutoff, '2026-09-18T23:31:39.523Z');
  assert.equal(snapshot.counts.scout.baseline_established, true);
  assert.equal(snapshot.counts.co1.complete_five_pool_cycles, 593);
  assert.equal(snapshot.dispersion.dispersion_observation_count, 592);
  assert.equal(snapshot.historical_boundary.raw_source_reproducibility, 'UNAVAILABLE_SOURCE_LOSS');
  assert.equal(snapshot.historical_boundary.historical_archive_changed, false);
  assert.equal(snapshot.gcc_network.pools['gcc-icc'].normalized_gcc_usd_price, null);
  for (const group of Object.values(snapshot.provenance.source_hashes)) {
    for (const hash of Object.values(group)) assert.match(hash, /^[a-f0-9]{64}$/);
  }
});

test('current presentation has automatic freshness states and no execution boundary', async () => {
  const { resolveFreshnessState } = await import('../public/js/current-observation.mjs');
  const cutoff = Date.parse(snapshot.observation_cutoff);
  assert.equal(resolveFreshnessState(snapshot, cutoff + 1000), 'PARTIAL');
  assert.equal(resolveFreshnessState(snapshot, cutoff + (snapshot.freshness.threshold_seconds + 1) * 1000), 'STALE');
  assert.match(html, /id="current-observation"/);
  assert.match(html, /current-gcc-observation-v1\.json/);
  assert.match(adapter, /fetch\('\/data\/current-gcc-observation-v1\.json'/);
  assert.doesNotMatch(`${html}\n${adapter}\n${renderer}`, /\/var\/lib\/tower-recovery|eth_sendTransaction|personal_sign|privateKey|window\.ethereum|signTransaction|sendTransaction|approve\(|swap\(/i);
});

test('publication wording withholds unsupported causal and profit claims', () => {
  const text = `${JSON.stringify(snapshot)}\n${html}\n${renderer}`;
  assert.match(text, /Observed price dispersion is descriptive and does not establish arbitrage, profitability, or trading intent\./);
  assert.match(text, /The similarity does not establish causation\./);
  assert.match(text, /ECONOMICALLY INACCESSIBLE BALANCE/);
  assert.match(text, /ICC\/USD NORMALIZATION = UNAVAILABLE/);
  assert.doesNotMatch(text, /LIVE TRADING SIGNAL|ARBITRAGE AVAILABLE|\bBUY\b|\bSELL\b|PROFIT OPPORTUNITY/);
});
