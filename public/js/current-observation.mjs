const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number = (value, digits = 2) => typeof value === 'number' ? value.toLocaleString('en-US', {maximumFractionDigits: digits, minimumFractionDigits: digits}) : 'UNAVAILABLE';
const price = value => typeof value === 'number' ? value.toLocaleString('en-US', {maximumFractionDigits: 8, minimumFractionDigits: 8}) : 'UNAVAILABLE';
const pct = value => typeof value === 'number' ? `${value >= 0 ? '+' : ''}${value.toLocaleString('en-US', {maximumFractionDigits: 2, minimumFractionDigits: 2})}%` : 'UNAVAILABLE';
const bps = value => typeof value === 'number' ? `${value.toLocaleString('en-US', {maximumFractionDigits: 1, minimumFractionDigits: 1})} bps` : 'UNAVAILABLE';

function timestamp(value) {
  if (!value) return 'UNAVAILABLE';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'UNAVAILABLE' : `${date.toISOString().replace('.000Z', 'Z')} UTC`;
}

export function ageSeconds(snapshot, now = Date.now()) {
  const cutoff = Date.parse(snapshot?.observation_cutoff || '');
  return Number.isFinite(cutoff) ? Math.max(0, (now - cutoff) / 1000) : null;
}

export function resolveFreshnessState(snapshot, now = Date.now()) {
  const age = ageSeconds(snapshot, now);
  const threshold = Number(snapshot?.freshness?.threshold_seconds || 7200);
  if (age === null || age > threshold) return 'STALE';
  const pools = Object.values(snapshot?.gcc_network?.pools || {});
  if (pools.some(pool => pool.evidence_status === 'PARTIAL')) return 'PARTIAL';
  return 'CURRENT';
}

function sourceMeta(source, observedAt, evidenceStatus = 'CURRENT') {
  return `<small class="current-observation__meta">${esc(timestamp(observedAt))} · ${esc(source)} · ${esc(evidenceStatus)}</small>`;
}

function poolCard(pool) {
  const normalized = pool.normalized_gcc_usd_price === null ? 'UNAVAILABLE' : `$${price(pool.normalized_gcc_usd_price)}`;
  const native = pool.gcc_relative_price === null ? 'UNAVAILABLE' : number(pool.gcc_relative_price, 10);
  return `<article class="current-observation__pool"><div class="current-observation__pool-head"><strong>${esc(pool.label)}</strong><span class="current-observation__quality">${esc(pool.data_quality)}</span></div><strong class="current-observation__value">${normalized}</strong><span class="current-observation__label">normalized GCC/USD</span><dl><div><dt>GCC-relative price</dt><dd>${esc(native)}</dd></div><div><dt>Depth proxy</dt><dd>${number(pool.liquidity_depth_proxy, 2)}</dd></div></dl>${pool.icc_usd_normalization ? `<p class="current-observation__unavailable">ICC/USD NORMALIZATION = UNAVAILABLE</p>` : ''}${sourceMeta(pool.source || 'bsc_json_rpc_read_only', pool.latest_timestamp, pool.evidence_status)}</article>`;
}

function marketCard(symbol, observation) {
  return `<article class="current-observation__market"><span class="current-observation__market-symbol">${esc(symbol)}</span><strong>$${number(observation.value_usd, 2)}</strong>${sourceMeta('binance_public_rest', observation.timestamp, observation.evidence_status || 'CURRENT')}</article>`;
}

export function renderCurrentObservation(snapshot, now = Date.now()) {
  const state = resolveFreshnessState(snapshot, now);
  const stateClass = state.toLowerCase();
  const age = ageSeconds(snapshot, now);
  const pools = snapshot.gcc_network.pools;
  const poolOrder = ['gcc-wbnb-pancakeswap', 'gcc-btcb-pancakeswap', 'gcc-wbnb-apeswap', 'gcc-sol'];
  const priceBehaviour = snapshot.price_behaviour;
  const scarcity = snapshot.scarcity;
  const market = snapshot.external_market_observation.instruments;
  const position = snapshot.pool_position;
  const dispersion = snapshot.dispersion;
  const currentAge = age === null ? 'UNAVAILABLE' : `${number(age, 0)} seconds at render time`;

  return `<div class="current-observation__header"><div><p class="eyebrow">CURRENT OBSERVATION · RESEARCH ENGINE V2</p><h2 id="current-observation-title">Current GCC Network</h2><p class="current-observation__lede">A bounded, provenance-backed observation snapshot. It is presentation evidence, not an execution input or a live collector connection.</p></div><div class="current-observation__state-block"><span class="current-observation__state ${stateClass}" data-freshness-state="${state}">${state}</span><span>Research status: OBSERVATION ACTIVE · INTERPRETATION IN PROGRESS</span><small>Snapshot age: ${currentAge} · stale threshold: ${number(snapshot.freshness.threshold_seconds, 0)} seconds</small></div></div>
  <div class="current-observation__facts"><div><span>Observation window</span><strong>${esc(timestamp(snapshot.observation_window.first_observation))}</strong><small>to ${esc(timestamp(snapshot.observation_window.last_observation))}</small></div><div><span>Last observation</span><strong>${esc(timestamp(snapshot.observation_cutoff))}</strong><small>cutoff protected by Restic ${esc(snapshot.backup_snapshot.id)}</small></div><div><span>Scout baseline</span><strong>${snapshot.scout.baseline_established ? 'ESTABLISHED' : 'NOT ESTABLISHED'}</strong><small>${number(snapshot.counts.scout.observations, 0)} observations · ${number(snapshot.counts.scout.unusual_observations_absolute_z_at_least_2, 0)} unusual |z| ≥ 2 observations</small></div><div><span>Evidence status</span><strong>READ-ONLY</strong><small>Research Engine V2 → immutable snapshot → Surface</small></div></div>
  <section class="current-observation__section" aria-labelledby="current-pools-title"><div class="current-observation__section-head"><div><p class="eyebrow">NORMALIZED GCC VALUES</p><h3 id="current-pools-title">Four defensible pool observations</h3></div><small>Latest complete CO-1 block ${esc(number(snapshot.latest_blocks.co1, 0))}</small></div><div class="current-observation__pool-grid">${poolOrder.map(poolId => poolCard({...pools[poolId], source: snapshot.gcc_network.source})).join('')}</div><div class="current-observation__icc"><strong>GCC/ICC native pool state</strong><span>${number(pools['gcc-icc'].gcc_relative_price, 10)} ICC per GCC · ${esc(pools['gcc-icc'].data_quality)}</span><strong>ICC/USD NORMALIZATION = UNAVAILABLE</strong>${sourceMeta(snapshot.gcc_network.source, pools['gcc-icc'].latest_timestamp, 'PARTIAL')}</div></section>
  <section class="current-observation__section" aria-labelledby="current-dispersion-title"><div class="current-observation__section-head"><div><p class="eyebrow">CROSS-POOL DISPERSION</p><h3 id="current-dispersion-title">Descriptive normalized price range</h3></div><small>${number(dispersion.complete_observation_cycles, 0)} complete cycles · ${number(dispersion.dispersion_observation_count, 0)} dispersion values</small></div><div class="current-observation__metric-grid"><div><span>Latest</span><strong>${bps(dispersion.latest_bps)}</strong><small>${number(dispersion.latest_percent, 2)}%</small></div><div><span>Median</span><strong>${bps(dispersion.median_bps)}</strong><small>${number(dispersion.median_percent, 2)}%</small></div><div><span>Observed range</span><strong>${bps(dispersion.minimum_bps)} → ${bps(dispersion.maximum_bps)}</strong><small>${number(dispersion.minimum_percent, 2)}% → ${number(dispersion.maximum_percent, 2)}%</small></div></div><p class="current-observation__disclaimer">${esc(dispersion.interpretation)}</p>${sourceMeta('co1-v2 collector pairwise field', dispersion.observation_window_end, 'CURRENT')}</section>
  <section class="current-observation__section" aria-labelledby="current-market-title"><div class="current-observation__section-head"><div><p class="eyebrow">EXTERNAL CONTEXT</p><h3 id="current-market-title">Macro observations</h3></div><small>Source timestamps and evidence status shown per value</small></div><div class="current-observation__market-grid">${['BNBUSDT', 'BTCUSDT', 'SOLUSDT', 'XAUTUSDT'].map(symbol => marketCard(symbol, market[symbol])).join('')}</div></section>
  <section class="current-observation__section" aria-labelledby="current-behaviour-title"><div class="current-observation__section-head"><div><p class="eyebrow">CURRENT PRICE BEHAVIOUR</p><h3 id="current-behaviour-title">Observed movement inside the frozen window</h3></div><small>Descriptive comparison only</small></div><div class="current-observation__metric-grid current-observation__behaviour-grid"><div><span>Pancake GCC/WBNB normalized USD</span><strong>${pct(priceBehaviour['gcc-wbnb-pancakeswap-normalized-usd'].percentage_change)}</strong><small>$${price(priceBehaviour['gcc-wbnb-pancakeswap-normalized-usd'].first)} → $${price(priceBehaviour['gcc-wbnb-pancakeswap-normalized-usd'].latest)}</small></div><div><span>BNB/USD</span><strong>${pct(priceBehaviour['bnb-usd'].percentage_change)}</strong><small>$${number(priceBehaviour['bnb-usd'].first, 2)} → $${number(priceBehaviour['bnb-usd'].latest, 2)}</small></div><div><span>GCC/BTCB</span><strong>${pct(priceBehaviour['gcc-btcb'].percentage_change)}</strong><small>$${price(priceBehaviour['gcc-btcb'].first)} → $${price(priceBehaviour['gcc-btcb'].latest)}</small></div><div><span>GCC/SOL</span><strong>${pct(priceBehaviour['gcc-sol'].percentage_change)}</strong><small>$${price(priceBehaviour['gcc-sol'].first)} → $${price(priceBehaviour['gcc-sol'].latest)}</small></div><div><span>ApeSwap GCC/WBNB</span><strong>${pct(priceBehaviour['gcc-wbnb-apeswap'].percentage_change)}</strong><small>$${price(priceBehaviour['gcc-wbnb-apeswap'].first)} → $${price(priceBehaviour['gcc-wbnb-apeswap'].latest)}</small></div></div><p class="current-observation__disclaimer">${esc(priceBehaviour.descriptive_comparison)} ${esc(priceBehaviour.causation_qualification)}</p></section>
  <section class="current-observation__split"><div class="current-observation__section"><p class="eyebrow">POOL POSITION</p><h3>Observed relative-price positions</h3><p>Most frequent highest normalized pool: <strong>${esc(position.most_frequent_highest_normalized_pool.pool)}</strong> (${number(position.most_frequent_highest_normalized_pool.count, 0)} cycles).</p><p>Most frequent lowest normalized pool: <strong>${esc(position.most_frequent_lowest_normalized_pool.pool)}</strong> (${number(position.most_frequent_lowest_normalized_pool.count, 0)} cycles).</p><small>These counts do not label a pool best, worst, profitable, or executable.</small></div><div class="current-observation__section"><p class="eyebrow">SCARCITY OBSERVATION</p><h3>ECONOMICALLY INACCESSIBLE BALANCE</h3><div class="current-observation__scarcity-value">${number(scarcity.first_observed_balance, 2)} → ${number(scarcity.latest_observed_balance, 2)} GCC</div><p>Observed change: <strong>${number(scarcity.observed_change, 4)} GCC</strong> (${pct(scarcity.observed_change_percentage)}).</p><small>${number(scarcity.observation_count, 0)} observations · ${esc(timestamp(scarcity.observation_window_start))} → ${esc(timestamp(scarcity.observation_window_end))} · ${esc(scarcity.interpretation)}</small><p class="current-observation__disclaimer">${esc(scarcity.mechanism_statement)}</p>${sourceMeta('bsc_json_rpc_read_only', scarcity.observation_window_end, 'CURRENT')}</div></section>
  <div class="current-observation__footer"><span>Historical research remains immediately below this section and is unchanged.</span><a href="/data/current-gcc-observation-v1.json">View frozen publication JSON ↗</a><span>ICC/USD normalization unavailable · no trading signal published.</span></div>`;
}
