import { EvidenceBadge, Gauge, topology } from './opportunityVisuals.mjs';
import { renderCurrentObservation } from './current-observation.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fmt = (value, digits = 2) => typeof value === 'number' ? value.toLocaleString('en-US', {maximumFractionDigits: digits, minimumFractionDigits: digits}) : esc(value ?? 'UNAVAILABLE');
const fmtPercent = (value, digits = 4) => typeof value === 'number' ? `${value.toLocaleString('en-US', {maximumFractionDigits: digits})}%` : 'UNAVAILABLE';

let panelData = {};
let blobUrl = null;

function card(id, title, kicker, content, cls = '') {
  return `<article class="research-card ${esc(cls)}" id="${esc(id)}"><header class="card-head"><div><p class="eyebrow">${esc(kicker)}</p><h2>${esc(title)}</h2></div><button class="json-button" data-json="${esc(id)}" aria-label="View JSON: ${esc(title)}">View JSON ↗</button></header>${content}</article>`;
}

function metricIndex(engine) {
  const sections = ['network_state','external_market_regime','scarcity','solver_economics','pool_dispersion','pool_leadership','pool_bias','macro_alignment'];
  return new Map(sections.flatMap(section => (engine[section]?.metrics || [])).map(metric => [metric.metric_id, metric]));
}

function status(metric) {
  return EvidenceBadge(metric?.evidence_status || 'UNAVAILABLE');
}

function value(metric, digits = 2) {
  if (!metric) return 'UNAVAILABLE';
  if (metric.unit === 'percent') return fmtPercent(metric.value);
  if (metric.unit === 'boolean') return metric.value === true ? 'YES' : metric.value === false ? 'NO' : 'UNAVAILABLE';
  return typeof metric.value === 'number' ? fmt(metric.value, digits) : metric.value ?? 'UNAVAILABLE';
}

function line(metric, digits = 2) {
  if (!metric) return '<div class="engine-line"><span>UNAVAILABLE</span><small>No evidence record is available.</small></div>';
  return `<div class="engine-line"><div><strong>${esc(value(metric, digits))}</strong><span>${esc(metric.label)}</span></div>${status(metric)}<small>${esc(metric.historical_or_live || 'unknown')} · ${esc(metric.freshness || 'unknown')} · ${esc(metric.methodology_ref || 'no methodology reference')}</small></div>`;
}

function scoreView(score) {
  return {score: score?.value ?? null, label: score?.value == null ? 'UNAVAILABLE' : 'RESEARCH SCORE', confidence: score?.confidence ?? 'UNAVAILABLE', evidence_status: score?.evidence_status || 'UNAVAILABLE'};
}

function scoreDetails(environment) {
  const current = environment.current_score;
  const historical = environment.historical_score;
  return `<div class="engine-score-grid"><div><strong>Historical research score</strong><span>${historical?.value == null ? 'UNAVAILABLE' : esc(historical.value)}</span>${status(historical)}<small>${esc(historical?.confidence_reason || historical?.limitations || 'No explanation available.')}</small></div><div><strong>Current score</strong><span>${current?.value == null ? 'UNAVAILABLE' : esc(current.value)}</span>${status(current)}<small>${esc(current?.confidence_reason || current?.limitations || 'No current input is connected.')}</small></div></div><details class="research-tooltip"><summary>Inspect score components and weights</summary><div class="engine-component-list">${(environment.components || []).map(component => `<div><span>${esc(component.label)}</span><strong>${component.value == null ? 'UNAVAILABLE' : esc(component.value)}</strong><small>${esc(component.weight == null ? 'weight unavailable' : `${component.weight * 100}% weight`)} · ${esc(component.evidence_status)} · ${esc(component.confidence_reason || '')}</small></div>`).join('')}</div></details>`;
}

function evidenceGroups(engine) {
  const groups = {ESTABLISHED: [], PARTIAL: [], UNRESOLVED: [], NOT_SUPPORTED: []};
  for (const metric of engine.evidence_matrix || []) {
    if (metric.evidence_status === 'UNRESOLVED' && /scout/i.test(`${metric.metric_id} ${metric.source} ${metric.label}`)) continue;
    const group = groups[metric.evidence_status] || (groups[metric.evidence_status] = []);
    group.push(`${metric.label}: ${metric.value == null ? 'UNAVAILABLE' : value(metric, 4)}`);
  }
  return groups;
}

function renderHero(metrics, compression) {
  $('#engine-hero').innerHTML = `<section class="hero-evidence" aria-labelledby="hero-evidence-title"><div class="hero-evidence__copy"><p class="eyebrow">ESTABLISHED HISTORICAL EVIDENCE</p><h2 id="hero-evidence-title">A connected market is already observable.</h2><p>Historical research shows recurring cross-pool activity across the GCC liquidity network. The Opportunity Engine converts that evidence into machine-readable economic intelligence for autonomous agents.</p></div><div class="hero-metric-grid"><div><strong>${fmt(metrics.tx?.value, 0)}</strong><span>reconstructed transactions</span>${status(metrics.tx)}</div><div><strong>${fmtPercent(metrics.multiPool?.value, 1)}</strong><span>multi-pool</span>${status(metrics.multiPool)}</div><div><strong>${fmtPercent(compression?.value, 1)}</strong><span>dispersion compression</span>${status(compression)}</div><div><strong>${fmt(metrics.pools?.value, 0)}</strong><span>canonical GCC pools</span>${status(metrics.pools)}</div></div></section>`;
}

function render(snapshot, currentObservation) {
  const engine = snapshot.engine;
  const metrics = metricIndex(engine);
  const get = id => metrics.get(id);
  const tx = get('network.gcc.reconstructed_treasury_transactions');
  const multiPool = get('network.gcc.multi_pool_share');
  const pools = get('network.gcc.canonical_pool_count');
  const corrective = get('network.gcc.corrective_cross_pool_activity');
  const compression = get('gcc.pool_dispersion.compression_share');
  const dispersion = engine.pool_dispersion.metrics;
  const leadership = engine.pool_leadership.metrics;
  const bias = engine.pool_bias.metrics;
  const statusSummary = engine.research_status;
  const currentStatus = statusSummary.live || 'UNAVAILABLE';
  const groups = evidenceGroups(engine);
  const scarcityMetrics = engine.scarcity.metrics || [];
  const scarcity = {
    balance: get('gcc.scarcity.dead_address_balance'),
    share: get('gcc.scarcity.dead_address_share'),
    supply: get('gcc.scarcity.nominal_total_supply'),
    inaccessible: get('gcc.scarcity.dead_address_inaccessibility'),
    reflection: get('gcc.reflection.mechanics'),
    accumulation: get('gcc.reflection.dead_address_accumulation')
  };
  const network = {confirmation: 'unavailable', dispersion: `${fmt(get('network.gcc.current_snapshot_dispersion')?.value)} bps (HISTORICAL)`, liquidity_health: 'HISTORICAL ONLY', connected_asset_breadth: `${pools?.value ?? 'UNAVAILABLE'} canonical pools`};

  renderHero({tx, multiPool, pools}, compression);
  panelData = {
    'network-state': engine.network_state,
    history: {transactions: tx, multi_pool_share: multiPool, canonical_pools: pools, corrective_activity: corrective, compression},
    price: engine.gcc_price_environment,
    lp: engine.gcc_lp_environment,
    dispersion: engine.pool_dispersion,
    leadership: engine.pool_leadership,
    bias: engine.pool_bias,
    scout: engine.scout_alignment,
    macro: engine.macro_alignment,
    scarcity: engine.scarcity,
    evidence: engine.evidence_matrix,
    provenance: snapshot.provenance
  };

  const history = card('history', 'Historical network activity', 'TA-1I / LE-1B2 EVIDENCE', `<div class="engine-metric-grid"><div><strong>${fmt(tx?.value, 0)}</strong><span>reconstructed treasury transactions</span>${status(tx)}</div><div><strong>${fmtPercent(multiPool?.value)}</strong><span>receipt-visible multi-pool share</span>${status(multiPool)}</div><div><strong>${fmt(pools?.value, 0)}</strong><span>canonical GCC pools</span>${status(pools)}</div><div><strong>${fmt(corrective?.value, 0)}</strong><span>corrective-flow observations</span>${status(corrective)}</div></div><p class="metric-caption">All values are historical evidence, not live network state. Corrective classification does not establish intent, causality, or profit.</p>`, 'history-card');
  const networkCard = card('network-state', 'GCC Network State', 'PROVENANCE-BACKED RESEARCH', `${topology(network)}<div class="network-states"><span>Current observation state: ${esc(currentStatus)}</span><span>Dispersion: ${esc(network.dispersion)}</span><span>Liquidity: ${esc(network.liquidity_health)}</span><span>Breadth: ${esc(network.connected_asset_breadth)}</span></div><p class="metric-caption">The diagram is conceptual. Historical pool identity and activity are sourced from the engine; bounded current evidence is shown above and no live pool feed is connected.</p>`, 'network-card');
  const dispersionCard = card('dispersion', 'Dispersion and compression', 'LE-1B2 / HISTORICAL', dispersion.map(metric => line(metric, 2)).join('') + `<p class="metric-caption">Observed normalized pre/post dispersion and compression are descriptive historical evidence, not executable profit.</p>`, 'liquidity-card');
  const leadershipCard = card('leadership', 'Pool leadership and bias', 'LE-1B2 / HISTORICAL', leadership.map(metric => line(metric, 2)).join('') + bias.map(metric => line(metric, 2)).join('') + '<p class="metric-caption">Leader/follower and signed bias are descriptive historical profiles, not causal price discovery.</p>', 'transmission-card');
  const scarcityCard = card('scarcity', 'Effective scarcity', 'CURRENT BSC READ-ONLY OBSERVATION', `<div class="scarcity-highlight"><strong>${fmt(scarcity.balance?.value, 2)} GCC</strong><span>ECONOMICALLY INACCESSIBLE</span>${status(scarcity.balance)}</div><div class="engine-metric-grid"><div><strong>${fmtPercent(scarcity.share?.value)}</strong><span>of nominal supply</span>${status(scarcity.share)}</div><div><strong>${fmt(scarcity.supply?.value, 0)}</strong><span>nominal GCC supply</span>${status(scarcity.supply)}</div></div>${line(scarcity.inaccessible)}${line(scarcity.reflection)}<div class="engine-status-block"><strong>Reflection accumulation</strong>${status(scarcity.accumulation)}<p>Current contract mechanics and reward eligibility are established; a historical dead-address balance increase is not claimed without an archive observation.</p></div><p class="metric-caption">This is economically inaccessible supply at the recorded block. It does not reduce <code>totalSupply()</code> and is not described as a formal burn.</p>`, 'scarcity-card');
  const macroCard = card('macro', 'External market regime', 'SCOUT / MACRO EVIDENCE', `<div class="engine-status-block"><strong>Scout → GCC alignment</strong>${EvidenceBadge(engine.scout_alignment.status)}<p>No contemporaneous observation window exists yet.</p><small>SCOUT_GCC_ALIGNMENT = ${esc(engine.scout_alignment.status)}</small></div><div class="engine-status-block"><strong>Macro → GCC alignment</strong>${EvidenceBadge(engine.macro_alignment.status)}<p>${esc(engine.macro_alignment.reason)}</p></div><p class="metric-caption">External Scout and XAUT observations remain historical and are not presented as live market signals.</p>`, 'macro-card');
  const evidence = card('evidence', 'What the research supports', 'ENGINE EVIDENCE MATRIX', Object.entries(groups).map(([key, claims]) => `<section class="engine-evidence-group">${EvidenceBadge(key)}${claims.length ? `<ul>${claims.slice(0, key === 'ESTABLISHED' ? 8 : 5).map(claim => `<li>${esc(claim)}</li>`).join('')}</ul>` : '<p class="metric-caption">No public claim in this category.</p>'}</section>`).join('') + `<p class="metric-caption">The complete machine-readable matrix is available at <a href="/data/opportunity-engine.json">/data/opportunity-engine.json</a>.</p>`, 'evidence-card');
  const price = card('price', 'GCC Price Environment', 'ENGINE SCORE / FAIL-CLOSED', `<div class="gauge-meta">${EvidenceBadge(engine.gcc_price_environment.current_score.evidence_status)}<span class="badge">CURRENT INPUT · ${esc(currentStatus)}</span></div><div class="gauge-layout">${Gauge(scoreView(engine.gcc_price_environment.current_score), 'GCC Price Environment')}<div class="gauge-description"><p>Composite scoring activates only when the required evidence is available. The production surface does not calculate or infer a trading opportunity.</p>${scoreDetails(engine.gcc_price_environment)}</div></div>`, 'price-card');
  const lp = card('lp', 'GCC LP Environment', 'ENGINE SCORE / FAIL-CLOSED', `<div class="gauge-meta">${EvidenceBadge(engine.gcc_lp_environment.current_score.evidence_status)}<span class="badge">CURRENT INPUT · ${esc(currentStatus)}</span></div><div class="gauge-layout">${Gauge(scoreView(engine.gcc_lp_environment.current_score), 'GCC LP Environment')}<div class="gauge-description"><p>Composite scoring activates only when the required evidence is available. Historical LP evidence remains visible while fee, depth, and adverse-selection inputs are unresolved.</p>${scoreDetails(engine.gcc_lp_environment)}</div></div>`, 'lp-card');
  const solver = card('solver', 'Direct WBNB Solver', 'ENGINE EVIDENCE', (engine.solver_economics.metrics || []).map(metric => line(metric, 2)).join('') + '<p class="metric-caption">Direct WBNB solver profitability remains NOT_SUPPORTED where the engine records it.</p>', 'solver-card');
  const provenance = card('provenance', 'Evidence provenance', 'CONTROLLED SNAPSHOT', `<div class="engine-status-block"><strong>Source commit</strong><code>${esc(snapshot.provenance.source_commit)}</code></div><div class="engine-status-block"><strong>Source file</strong><code>${esc(snapshot.provenance.source_file)}</code></div><div class="engine-status-block"><strong>Source SHA-256</strong><code>${esc(snapshot.provenance.source_sha256)}</code></div><div class="engine-status-block"><strong>Generated</strong><span>${esc(snapshot.provenance.generated_at)}</span></div>${(snapshot.provenance.enrichments || []).map(item => `<div class="engine-status-block"><strong>Enrichment</strong><span>${esc(item.source_file)} · ${esc(item.observation_block)} · ${esc(item.source_sha256)}</span></div>`).join('')}<p class="metric-caption">This production snapshot is generated from the canonical Opportunity Engine output and a separately recorded read-only chain observation. The Surface is presentation-only.</p>`, 'roadmap-card');
  $('#current-observation-content').innerHTML = renderCurrentObservation(currentObservation);
  $('#data-notice').textContent = 'CURRENT OBSERVATION · BOUNDED SNAPSHOT · HISTORICAL RESEARCH BELOW';
  $('#panels').innerHTML = history + networkCard + dispersionCard + leadershipCard + scarcityCard + macroCard + evidence + price + lp + solver + provenance;
  $('#panels').setAttribute('aria-busy', 'false');
  document.documentElement.dataset.researchReady = 'true';
}

$('#panels').addEventListener('click', event => {
  const button = event.target.closest('[data-json]');
  if (!button) return;
  const id = button.dataset.json;
  $('#json-title').textContent = `${id} · Opportunity Engine evidence`;
  const json = JSON.stringify(panelData[id], null, 2);
  $('#json-content').textContent = json;
  if (blobUrl) URL.revokeObjectURL(blobUrl);
  blobUrl = URL.createObjectURL(new Blob([json], {type: 'application/json'}));
  $('#download-json').href = blobUrl;
  $('#download-json').download = `gcc-${id}-engine.json`;
  $('#json-dialog').showModal();
});
$('#close-json').addEventListener('click', () => $('#json-dialog').close());

try {
  const responses = await Promise.all([
    fetch('/data/opportunity-engine.json', {cache: 'no-store'}),
    fetch('/data/current-gcc-observation-v1.json', {cache: 'no-store'})
  ]);
  if (!responses[0].ok) throw new Error(`Could not load Opportunity Engine JSON (${responses[0].status})`);
  if (!responses[1].ok) throw new Error(`Could not load current observation JSON (${responses[1].status})`);
  const snapshot = await responses[0].json();
  const currentObservation = await responses[1].json();
  if (!snapshot?.provenance?.source_sha256 || !snapshot?.engine?.research_status) throw new Error('Opportunity Engine snapshot is missing provenance or research status.');
  if (currentObservation?.schema_version !== 'gcc-research-engine-v2.current-observation.v1' || currentObservation?.provenance?.status !== 'PASS' || currentObservation?.backup_snapshot?.id !== '9f80f84f') throw new Error('Current observation snapshot is missing publication provenance.');
  render(snapshot, currentObservation);
} catch (error) {
  $('#data-notice').textContent = 'Publication evidence could not be loaded. Research panels are unavailable.';
  $('#panels').setAttribute('aria-busy', 'false');
  console.error(error);
}
