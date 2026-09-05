import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const expectedRoutes = {'/about':'about.html','/agents':'agents.html','/network':'opportunity.html'};

test('registry lists existing artifacts with one authority per path', () => {
  const registry = read('schemas/schema-registry.json');
  const paths = registry.contracts.map(contract => contract.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const contract of registry.contracts) {
    assert.ok(contract.authority);
    assert.ok(read(contract.path));
  }
});

test('Express and Vercel route mappings remain logically identical', () => {
  const server = readFileSync('server.js', 'utf8');
  const vercel = read('vercel.json');
  for (const [route, file] of Object.entries(expectedRoutes)) {
    assert.match(server, new RegExp(`['"]${route}['"]\\s*:\\s*['"]${file}['"]`));
    assert.ok(vercel.rewrites.some(rewrite => rewrite.source === route && rewrite.destination === `/${file}`));
  }
  assert.equal(vercel.rewrites.some(rewrite => rewrite.source === '/(.*)'), false);
});

test('dashboard metric references are present in authoritative research metrics', () => {
  const research = read('public/data/gcc-network-research.json');
  const ids = new Set(research.metrics.map(metric => metric.id));
  const ui = readFileSync('public/js/opportunity.mjs', 'utf8');
  const references = new Set([...ui.matchAll(/m\(['"]([a-z0-9_]+)['"]\)/g)].map(match => match[1]));
  assert.ok(references.size >= 10);
  for (const id of references) assert.ok(ids.has(id), `${id} missing from research metrics`);
});

test('config weights and generated exports retain version and execution boundary', () => {
  const config = read('public/data/gcc-regime-config.json');
  assert.equal(Object.values(config.price_environment).reduce((a,b)=>a+b,0), 1);
  assert.equal(Object.values(config.lp_environment).reduce((a,b)=>a+b,0), 1);
  const regime = read('public/data/agent/regime.json');
  assert.equal(regime.model_version, config.version);
  assert.equal(regime.model_config.version, config.version);
  assert.equal(regime.execution_enabled, false);
});

test('generated agent exports are byte-stable across a repeat build', () => {
  const files = ['regime.json','network-state.json','liquidity.json','research.json','replay-examples.json'].map(name => `public/data/agent/${name}`);
  const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
  const before = files.map(digest);
  execFileSync(process.execPath, ['scripts/build-opportunity.mjs'], {stdio:'ignore'});
  assert.deepEqual(files.map(digest), before);
});
