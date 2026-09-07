import { EvidenceBadge, Gauge, topology, AssetIcon } from './opportunityVisuals.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fmt = (value, digits = 2) => typeof value === 'number' ? value.toLocaleString('en-US', {maximumFractionDigits: digits, minimumFractionDigits: digits}) : esc(value ?? 'UNAVAILABLE');
const fmtPercent = value => typeof value === 'number' ? `${value.toLocaleString('en-US', {maximumFractionDigits: 4})}%` : 'UNAVAILABLE';

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

function line(metric, digits = 2) {
  if (!metric) return '<div class="engine-line"><span>UNAVAILABLE</span><small>No evidence record is available.</small></div>';
  const value = metric.unit === 'percent' ? fmtPercent(metric.value) : typeof metric.value === 'number' ? fmt(metric.value, digits) : metric.value ?? 'UNAVAILABLE';
  return `<div class="engine-line"><div><strong>${esc(value)}</strong><span>${esc(metric.label)}</span></div>${status(metric)}<small>${esc(metric.historical_or_live || 'unknown')} · ${esc(metric.freshness || 'unknown')} · ${esc(metric.methodology_ref || 'no methodology reference')}</small></div>`;
}

function scoreView(score) {
  return {score: score?.value ?? null, label: score?.value == null ? 'UNAVAILABLE' : 'RESEARCH SCORE', confidence: score?.confidence ?? 'UNAVAILABLE', evidence_status: score?.evidence_status || 'UNAVAILABLE'};
}

function scoreDetails(environment) {
  const current = environment.current_score;
  const historical = environment.historical_score;
  return `<div class="engine-score-grid"><div><strong>Historical research score</strong><span>${historical?.value == null ? 'UNAVAILABLE' : esc(historical.value)}</span>${status(historical)}<small>${esc(historical?.confidence_reason || historical?.limitations || 'No explanation available.')}</small></div><div><strong>Current live score</strong><span>${current?.value == null ? 'UNAVAILABLE' : esc(current.value)}</span>${status(current)}<small>${esc(current?.confidence_reason || current?.limitations || 'No live input is connected.')}</small></div></div><details class="research-tooltip"><summary>Inspect score components and weights</summary><div class="engine-component-list">${(environment.components || []).map(component => `<div><span>${esc(component.label)}</span><strong>${component.value == null ? 'UNAVAILABLE' : esc(component.value)}</strong><small>${esc(component.weight == null ? 'weight unavailable' : `${component.weight * 100}% weight`)} · ${esc(component.evidence_status)} · ${esc(component.confidence_reason || '')}</small></div>`).join('')}</div></details>`;
}

function evidenceGroups(engine) {
  const groups = {ESTABLISHED: [], PARTIAL: [], UNRESOLVED: [], NOT_SUPPORTED: []};
  for (const metric of engine.evidence_matrix || []) {
    const group = groups[metric.evidence_status] || (groups[metric.evidence_status] = []);
    group.push(`${metric.label}: ${metric.value == null ? 'UNAVAILABLE' : typeof metric.value === 'number' ? fmt(metric.value, 4) : metric.value}`);
  }
  return groups;
}

function render(snapshot) {
  const engine = snapshot.engine;
  const metrics = metricIndex(engine);
  const networkMetrics = engine.network_state.metrics;
  const get = id => metrics.get(id);
  const tx = get('network.gcc.reconstructed_treasury_transactions');
  const multiPool = get('network.gcc.multi_pool_share');
  const pools = get('network.gcc.canonical_pool_count');
  const corrective = get('network.gcc.corrective_cross_pool_activity');
  const dispersion = engine.pool_dispersion.metrics;
  const leadership = engine.pool_leadership.metrics;
  const bias = engine.pool_bias.metrics;
  const statusSummary = engine.research_status;
  const network = {confirmation: 'unavailable', dispersion: `${fmt(get('network.gcc.current_snapshot_dispersion')?.value)} bps (STALE)`, liquidity_health: 'HISTORICAL ONLY', connected_asset_breadth: `${pools?.value ?? 'UNAVAILABLE'} canonical pools`};
  const currentStatus = statusSummary.live || 'UNAVAILABLE';
  const groups = evidenceGroups(engine);

  panelData = {
    'network-state': engine.network_state,
    history: {transactions: tx, multi_pool_share: multiPool, canonical_pools: pools, corrective_activity: corrective},
    price: engine.gcc_price_environment,
    lp: engine.gcc_lp_environment,
    dispersion: engine.pool_dispersion,
    leadership: engine.pool_leadership,
    bias: engine.pool_bias,
    scout: engine.scout_alignment,
    macro: engine.macro_alignment,
    evidence: engine.evidence_matrix,
    provenance: snapshot.provenance
  };

  const price = card('price', 'GCC Price Environment', 'ENGINE SCORE / FAIL-CLOSED', `<div class="gauge-meta">${EvidenceBadge(engine.gcc_price_environment.current_score.evidence_status)}<span class="badge">LIVE ${esc(currentStatus)}</span></div><div class="gauge-layout">${Gauge(scoreView(engine.gcc_price_environment.current_score), 'GCC Price Environment')}<div class="gauge-description"><p>Scores are read from the Opportunity Engine. The production surface does not calculate or infer a live opportunity.</p>${scoreDetails(engine.gcc_price_environment)}</div></div>`, 'price-card');
  const lp = card('lp', 'GCC LP Environment', 'ENGINE SCORE / FAIL-CLOSED', `<div class="gauge-meta">${EvidenceBadge(engine.gcc_lp_environment.current_score.evidence_status)}<span class="badge">LIVE ${esc(currentStatus)}</span></div><div class="gauge-layout">${Gauge(scoreView(engine.gcc_lp_environment.current_score), 'GCC LP Environment')}<div class="gauge-description"><p>Historical LP evidence is visible, but composite scores remain withheld where fee, depth, or adverse-selection inputs are unresolved.</p>${scoreDetails(engine.gcc_lp_environment)}</div></div>`, 'lp-card');
  const history = card('history', 'Historical network activity', 'TA-1I / LE-1B2 EVIDENCE', `<div class="engine-metric-grid"><div><strong>${fmt(tx?.value, 0)}</strong><span>reconstructed treasury transactions</span>${status(tx)}</div><div><strong>${fmtPercent(multiPool?.value)}</strong><span>receipt-visible multi-pool share</span>${status(multiPool)}</div><div><strong>${fmt(pools?.value, 0)}</strong><span>canonical GCC pools</span>${status(pools)}</div><div><strong>${fmt(corrective?.value, 0)}</strong><span>corrective-flow observations</span>${status(corrective)}</div></div><p class="metric-caption">All values are historical evidence, not live network state. Corrective classification does not establish intent, causality, or profit.</p>`, 'history-card');
  const networkCard = card('network-state', 'GCC Network State', 'PROVENANCE-BACKED RESEARCH', `${topology(network)}<div class="network-states"><span>Current live state: ${esc(currentStatus)}</span><span>Dispersion: ${esc(network.dispersion)}</span><span>Liquidity: ${esc(network.liquidity_health)}</span><span>Breadth: ${esc(network.connected_asset_breadth)}</span></div><p class="metric-caption">The diagram is conceptual. Historical pool identity and activity are sourced from the engine; no live pool feed is connected.</p>`, 'network-card');
  const dispersionCard = card('dispersion', 'Dispersion and compression', 'LE-1B2 / HISTORICAL', dispersion.map(metric => line(metric, 2)).join('') + `<p class="metric-caption">Observed normalized pre/post dispersion and compression are descriptive historical evidence, not executable profit.</p>`, 'liquidity-card');
  const leadershipCard = card('leadership', 'Pool leadership and bias', 'LE-1B2 / HISTORICAL', leadership.map(metric => line(metric, 2)).join('') + bias.map(metric => line(metric, 2)).join('') + '<p class="metric-caption">Leader/follower and signed bias are descriptive historical profiles, not causal price discovery.</p>', 'transmission-card');
  const macroCard = card('macro', 'External market regime', 'SCOUT / MACRO EVIDENCE', `<div class="engine-status-block"><strong>Scout → GCC alignment</strong>${EvidenceBadge(engine.scout_alignment.status)}<p>${esc(engine.scout_alignment.reason)}</p><small>SCOUT_GCC_ALIGNMENT = ${esc(engine.scout_alignment.status)}</small></div><div class="engine-status-block"><strong>Macro → GCC alignment</strong>${EvidenceBadge(engine.macro_alignment.status)}<p>${esc(engine.macro_alignment.reason)}</p></div><p class="metric-caption">External Scout and XAUT observations remain historical and are not presented as live market signals.</p>`, 'macro-card');
  const evidence = card('evidence', 'What the research supports', 'ENGINE EVIDENCE MATRIX', Object.entries(groups).map(([key, claims]) => `<section class="engine-evidence-group">${EvidenceBadge(key)}<ul>${claims.slice(0, key === 'ESTABLISHED' ? 8 : 5).map(claim => `<li>${esc(claim)}</li>`).join('')}</ul></section>`).join('') + `<p class="metric-caption">The complete machine-readable matrix is available at <a href="/data/opportunity-engine.json">/data/opportunity-engine.json</a>.</p>`, 'evidence-card');
  const scarcity = card('scarcity', 'Effective scarcity', 'ENGINE EVIDENCE', (engine.scarcity.metrics || []).map(metric => line(metric, 2)).join(''), 'scarcity-card');
  const solver = card('solver', 'Direct WBNB Solver', 'ENGINE EVIDENCE', (engine.solver_economics.metrics || []).map(metric => line(metric, 2)).join('') + '<p class="metric-caption">Direct WBNB solver profitability remains NOT_SUPPORTED where the engine records it.</p>', 'solver-card');
  const provenance = card('provenance', 'Evidence provenance', 'CONTROLLED SNAPSHOT', `<div class="engine-status-block"><strong>Source commit</strong><code>${esc(snapshot.provenance.source_commit)}</code></div><div class="engine-status-block"><strong>Source file</strong><code>${esc(snapshot.provenance.source_file)}</code></div><div class="engine-status-block"><strong>Source SHA-256</strong><code>${esc(snapshot.provenance.source_sha256)}</code></div><div class="engine-status-block"><strong>Generated</strong><span>${esc(snapshot.provenance.generated_at)}</span></div><p class="metric-caption">This production snapshot is generated from the canonical Opportunity Engine output. The Surface is presentation-only.</p>`, 'roadmap-card');
  $('#data-notice').textContent = `HISTORICAL RESEARCH / CURRENT LIVE INPUTS ${currentStatus} · ${engine.research_status.alignment}`;
  $('#panels').innerHTML = price + lp + history + networkCard + macroCard + evidence + scarcity + solver + dispersionCard + leadershipCard + provenance;
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
  const response = await fetch('/data/opportunity-engine.json', {cache: 'no-store'});
  if (!response.ok) throw new Error(`Could not load Opportunity Engine JSON (${response.status})`);
  const snapshot = await response.json();
  if (!snapshot?.provenance?.source_sha256 || !snapshot?.engine?.research_status) throw new Error('Opportunity Engine snapshot is missing provenance or research status.');
  render(snapshot);
} catch (error) {
  $('#data-notice').textContent = 'Opportunity Engine evidence could not be loaded. Scores and research panels are unavailable.';
  $('#panels').setAttribute('aria-busy', 'false');
  console.error(error);
}
