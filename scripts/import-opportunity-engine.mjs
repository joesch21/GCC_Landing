import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFile = process.env.OPPORTUNITY_ENGINE_SOURCE || path.resolve(root, '../Applications/trial-wallet-keccak-sync/condor_wallet/research/opportunity-engine.json');
const sourceLabel = process.env.OPPORTUNITY_ENGINE_SOURCE_LABEL || 'TrialWalletKeccak@0faaac61dcfbf0f1752b7c13d0df7f8da2ec7772:condor_wallet/research/opportunity-engine.json';
const sourceCommit = process.env.OPPORTUNITY_ENGINE_SOURCE_COMMIT || '0faaac61dcfbf0f1752b7c13d0df7f8da2ec7772';
const generatedAt = process.env.OPPORTUNITY_ENGINE_GENERATED_AT || '2026-09-07T00:00:00Z';
const observationFile = process.env.OPPORTUNITY_SCARCITY_OBSERVATION || path.join(root, 'public/data/gcc-scarcity-observation.json');
const outputFile = path.join(root, 'public/data/opportunity-engine.json');

const sourceBytes = await readFile(sourceFile);
const engine = JSON.parse(sourceBytes);
let observation;
try {
  observation = JSON.parse(await readFile(observationFile, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (observation) {
  const existing = engine.scarcity?.metrics || [];
  const observedMetrics = observation.metrics || [];
  const observedIds = new Set(observedMetrics.map(metric => metric.metric_id));
  engine.scarcity = {...engine.scarcity, metrics: [...existing.filter(metric => !observedIds.has(metric.metric_id)), ...observedMetrics]};
  const existingEvidence = engine.evidence_matrix || [];
  engine.evidence_matrix = [...existingEvidence.filter(metric => !observedIds.has(metric.metric_id)), ...observedMetrics];
}
const payload = {
  schema_version: 'gold-condor-opportunity-engine-snapshot-v1',
  provenance: {
    source_commit: sourceCommit,
    source_file: sourceLabel,
    source_sha256: createHash('sha256').update(sourceBytes).digest('hex'),
    generated_at: generatedAt,
    source_schema_version: engine.schema_version,
    methodology_ref: 'LE1_B25_SCOUT_BRIDGE.md#provenance',
    ...(observation ? {
      enrichments: [{
        type: 'on_chain_observation',
        source_file: path.relative(root, observationFile),
        source_sha256: createHash('sha256').update(JSON.stringify(observation, null, 2) + '\n').digest('hex'),
        observed_at: observation.observed_at,
        observation_block: observation.observation_block,
        methodology_ref: 'gcc-scarcity-observation.json#methodology'
      }]
    } : {})
  },
  engine
};

await writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Imported ${sourceLabel}`);
console.log(`Source SHA-256: ${payload.provenance.source_sha256}`);
console.log(`Wrote ${path.relative(root, outputFile)}`);
