import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const failures = [], warnings = [], checks = [];
const check = (condition, message, severity='P0') => { checks.push({ok:condition,message,severity}); if (!condition) failures.push({message,severity}); };
const warn = message => { warnings.push(message); checks.push({ok:true,message,severity:'P2'}); };
const canonicalEvidence = new Set(['ESTABLISHED','STRONGLY_SUPPORTED','PARTIAL','PARTIALLY_SUPPORTED','HISTORICAL_OBSERVATION','MODEL_RESULT','UNRESOLVED','NOT_SUPPORTED','ILLUSTRATIVE']);
const regimeLabels = new Set(['STRONGLY FAVOURABLE','FAVOURABLE','MIXED','UNFAVOURABLE','STRONGLY UNFAVOURABLE','CAUTIOUS','UNAVAILABLE']);

function typeMatches(value, type) {
  return type === 'null' ? value === null : type === 'array' ? Array.isArray(value) : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : type === 'integer' ? Number.isInteger(value) : typeof value === type;
}
function validateSchema(value, schema, rootSchema=schema, location='$') {
  if (schema.$ref) return validateSchema(value, schema.$ref.startsWith('#/$defs/') ? rootSchema.$defs[schema.$ref.split('/').pop()] : rootSchema, rootSchema, location);
  if (Object.hasOwn(schema,'const')) check(Object.is(value,schema.const), `${location} must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum) check(schema.enum.includes(value), `${location} must be one of ${schema.enum.join(', ')}`);
  if (schema.type) check((Array.isArray(schema.type)?schema.type:[schema.type]).some(type=>typeMatches(value,type)), `${location} has type ${typeof value}, expected ${schema.type}`);
  if (typeof value === 'number') { if (schema.minimum !== undefined) check(value >= schema.minimum, `${location} below minimum`); if (schema.maximum !== undefined) check(value <= schema.maximum, `${location} above maximum`); }
  if (schema.format === 'date-time' && value !== null) check(Number.isFinite(Date.parse(value)), `${location} is not date-time`);
  if (schema.required && value && typeof value === 'object') for (const field of schema.required) check(Object.hasOwn(value,field), `${location}.${field} required`);
  if (schema.properties && value && typeof value === 'object') for (const [field, child] of Object.entries(schema.properties)) if (Object.hasOwn(value,field)) validateSchema(value[field],child,rootSchema,`${location}.${field}`);
  if (schema.items && Array.isArray(value)) value.forEach((item,index)=>validateSchema(item,schema.items,rootSchema,`${location}[${index}]`));
}
function hash(file) { return createHash('sha256').update(readFileSync(path.join(root,file))).digest('hex'); }
function resolveLocalHref(href) {
  if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/')) return null;
  const clean = href.split(/[?#]/)[0];
  if (/^\/(about|agents|network)$/.test(clean)) return null;
  return clean.slice(1);
}

const registry = read('schemas/schema-registry.json');
check(registry.version === 1, 'schema registry version must be 1');
check(Array.isArray(registry.contracts) && registry.contracts.length >= 10, 'schema registry must contain all public contracts');
const registered = new Set();
for (const contract of registry.contracts || []) {
  check(Boolean(contract.id && contract.path && contract.authority && Array.isArray(contract.consumer)), `registry entry ${contract.id || '<unknown>'} missing ownership metadata`);
  check(!registered.has(contract.path), `duplicate registry path ${contract.path}`); registered.add(contract.path);
  check(existsSync(path.join(root,contract.path)), `registered file missing: ${contract.path}`);
  if (contract.schema) check(existsSync(path.join(root,contract.schema)), `schema missing for ${contract.path}: ${contract.schema}`);
  if (existsSync(path.join(root,contract.path))) { try { read(contract.path); check(true,`JSON parses: ${contract.path}`); } catch (error) { check(false,`invalid JSON ${contract.path}: ${error.message}`); } }
}

const config = read('public/data/gcc-regime-config.json');
for (const key of ['price_environment','lp_environment']) {
  const weights = config[key];
  check(weights && Math.abs(Object.values(weights).reduce((a,b)=>a+b,0)-1) < 1e-9, `${key} weights must sum to 1`);
  check(weights && Object.values(weights).every(value=>Number.isFinite(value) && value >= 0), `${key} weights must be nonnegative numbers`);
}
check(typeof config.version === 'string' && config.version.length > 0, 'regime config version is required');
check(Array.isArray(config.lp_penalties), 'LP penalty list is required');
check(new Set(config.price_thresholds.map(([min])=>min)).size === config.price_thresholds.length, 'price thresholds must have unique minima');
check(new Set(config.lp_thresholds.map(([min])=>min)).size === config.lp_thresholds.length, 'LP thresholds must have unique minima');

const research = read('public/data/gcc-network-research.json');
check(Array.isArray(research.metrics) && research.metrics.length > 0, 'research metrics must be present');
const metricIds = new Set((research.metrics || []).map(metric=>metric.id));
for (const metric of research.metrics || []) {
  for (const field of ['id','value','unit','status','source','period','description','updated_at']) check(Object.hasOwn(metric,field), `research metric ${metric.id || '<unknown>'} missing ${field}`);
  check(canonicalEvidence.has(metric.status), `unknown research evidence status ${metric.status} on ${metric.id}`);
}
const opportunitySource = read('public/data/gcc-opportunity-research.json');
for (const [status, claims] of Object.entries(opportunitySource.evidence || {})) { check(canonicalEvidence.has(status), `unknown opportunity evidence group ${status}`); check(Array.isArray(claims), `evidence group ${status} must be an array`); }

const ui = readFileSync(path.join(root,'public/js/opportunity.mjs'),'utf8');
const uiMetricIds = new Set([...ui.matchAll(/(?:\bm|metrics\.find\([^)]*?)\(?(?:'|\")([a-z0-9_]+)(?:'|\")/g)].map(match=>match[1]));
for (const id of uiMetricIds) check(metricIds.has(id), `UI metric reference missing from research JSON: ${id}`, 'P0');
check(uiMetricIds.size >= 13, `UI metric reference scan found ${uiMetricIds.size}; expected the dashboard's direct metric set`);

const output = read('public/data/agent/regime.json');
const regimeSchema = read('public/data/gcc-regime-schema.json');
validateSchema(output,regimeSchema); for (const record of read('public/data/agent/replay-examples.json').records) validateSchema(record,regimeSchema);
check(output.model_version === config.version, 'generated regime model_version must match config version');
check(output.model_config?.version === config.version, 'generated regime model_config version must match config version');
check(output.execution_enabled === false, 'agent regime execution boundary must remain false');
check(output.price_environment?.score === null && output.lp_environment?.score === null, 'current generated scores must remain withheld without live inputs');
for (const label of [output.price_environment?.label,output.lp_environment?.label]) check(regimeLabels.has(label), `unknown regime output label ${label}`);
for (const status of [...(research.metrics||[]).map(metric=>metric.status), ...Object.keys(opportunitySource.evidence||{})]) check(canonicalEvidence.has(status), `unknown evidence status ${status}`);

const expectedRoutes = {'/about':'about.html','/agents':'agents.html','/network':'opportunity.html'};
const server = readFileSync(path.join(root,'server.js'),'utf8');
for (const [route,file] of Object.entries(expectedRoutes)) check(new RegExp(`['"]${route}['"]\\s*:\\s*['"]${file}['"]`).test(server), `Express route parity missing ${route} -> ${file}`);
const vercel = read('vercel.json');
for (const [route,file] of Object.entries(expectedRoutes)) check(vercel.rewrites?.some(rewrite=>rewrite.source===route && rewrite.destination===`/${file}`), `Vercel route parity missing ${route} -> ${file}`);
check(!vercel.rewrites?.some(rewrite=>rewrite.source === '/(.*)' && String(rewrite.destination).startsWith('/public/')), 'Vercel public-prefix catch-all must not return');

const requiredLocalFiles = ['public/white-paper/Gold-Condor-Agent-Economy-White-Paper-v1.0.pdf','public/white-paper/Gold-Condor-Agent-Economy-White-Paper-v1.0.html','public/data/gcc-regime-schema.json','public/data/gcc-opportunity-schema.json','public/data/gcc-network-research.json','public/data/agent/regime.json','public/data/agent/network-state.json','public/data/agent/liquidity.json','public/data/agent/research.json'];
for (const file of requiredLocalFiles) check(existsSync(path.join(root,file)), `required local resource missing: ${file}`);
for (const htmlFile of ['public/index.html','public/about.html','public/agents.html','public/opportunity.html']) {
  const html=readFileSync(path.join(root,htmlFile),'utf8');
  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) { const local=resolveLocalHref(match[1]); if (local) check(existsSync(path.join(root,'public',local)), `local link missing in ${htmlFile}: ${match[1]}`); }
}

const generated = ['public/data/agent/regime.json','public/data/agent/network-state.json','public/data/agent/liquidity.json','public/data/agent/research.json','public/data/agent/replay-examples.json'];
const before = Object.fromEntries(generated.map(file=>[file,hash(file)]));
execFileSync(process.execPath,['scripts/build-opportunity.mjs'],{cwd:root,stdio:'ignore'});
const after = Object.fromEntries(generated.map(file=>[file,hash(file)]));
for (const file of generated) check(before[file] === after[file], `generated output changed on repeat build: ${file}`);
check(after['public/data/agent/regime.json'] === hash('public/data/agent/regime.json'), 'generated regime hash recorded');

console.log(`Schema drift checks: ${checks.filter(item=>item.ok).length} passed, ${failures.length} failed, ${warnings.length} warnings.`);
if (failures.length) { for (const failure of failures) console.error(`${failure.severity} ${failure.message}`); process.exitCode=1; }
else console.log('PASS: contracts, config, generated outputs, routes, local links and UI metric references are aligned.');
