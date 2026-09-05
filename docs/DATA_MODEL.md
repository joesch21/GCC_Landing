# Data model

The model separates authoritative research/configuration from derived outputs and presentation. JSON examples below describe logical shape; optional fields remain provider- or output-specific.

## Research metric

Each member of `public/data/gcc-network-research.json.metrics` has:

```text
id, label, value, unit, period, status, source, description, updated_at
```

`value` is not interchangeable with a normalized regime input. For example, `corrective_fee_share` is a measured percentage, while a future `corrective_activity` input is a 0–100 assessment.

## Regime input

`gccRegimeEngine.mjs` accepts a replayable snapshot:

```text
timestamp: ISO timestamp or null
window: 24h | 48h | 7d
mode: current | illustrative
macro: { btc, bnb, alts, xaut }
price_inputs: { bnb, btc, alts, network_confirmation, dispersion, liquidity }
lp_inputs: { fee_opportunity, corrective_activity, depth_quality,
             productive_dispersion, divergence_risk, adverse_selection,
             one_sided_movement }
network: { dispersion, compression, liquidity_health,
           confirmation, connected_asset_breadth }
historical_pool_prior: informational string
```

Weighted inputs are numeric 0–100 assessments. Missing weighted inputs withhold the score; they are not silently reweighted. LP risk inputs are inverted as `100 - risk` before weighting. Macro objects carry `move`, `move_24h`, `move_48h`, `series`, and `source`.

## Environment outputs

Both `price_environment` and `lp_environment` contain:

```text
score: integer 0–100 or null
label: threshold label or UNAVAILABLE
confidence: ILLUSTRATIVE or UNRESOLVED
evidence_status: UNRESOLVED for the unvalidated score
validation: NOT_BACKTESTED
inputs, weights
contributions: [{ key, value, weight, penalty, contribution }]
```

Price weights are BNB 25%, BTC 15%, alts 15%, network confirmation 20%, dispersion 15%, liquidity 10%. LP weights are fee opportunity 25%, corrective activity 20%, depth 15%, productive dispersion 10%, divergence risk 15%, adverse selection 10%, and one-sided movement 5%.

## Macro and network state

The output `macro` contains `btc`, `bnb`, `alts`, and `xaut`, classified as `STRONG_POSITIVE`, `POSITIVE`, `NEUTRAL`, `NEGATIVE`, `STRONG_NEGATIVE`, or `UNAVAILABLE`. Input asset objects additionally carry `move_24h`, `move_48h`, `series`, and `source`. XAUT remains `UNRESOLVED` in output and does not enter the main score. Higher-level classifications include `CRYPTO EXPANSION`, `ALTSEASON / DISPERSION`, `CRYPTO CONTRACTION`, `MIXED / ROTATION`, and `UNAVAILABLE`.

Regime `network` includes `dispersion`, `compression`, `liquidity_health`, `confirmation`, and `connected_asset_breadth`. V1 values are textual current/unavailable or illustrative descriptions; they are not silently interpreted as basis points, live depth, or a price forecast.

## Agent and replay objects

`public/data/agent/regime.json` includes `schema_version`, `asset: GCC`, `network_name: BSC`, `window`, `model_version`, full `model_config`, `mode`, `timestamp`, both environments, macro classifications, `crypto_regime`, `gold_divergence`, network state, original `inputs`, applied `weights`, and `execution_enabled: false`. `public/data/gcc-regime-schema.json` owns the output requirements.

`network-state.json` combines capability metadata with derived network state. `liquidity.json` carries the B8 definition, historical per-pool results, source and current LP context. `research.json` combines opportunity definitions/evidence with 28 curated metrics. `replay-examples.json` contains a warning and complete regime outputs for 24h, 48h and 7d illustrative fixtures.

Replay is deterministic when timestamp, window, mode, macro input, normalized inputs, network state, config version and weights are retained. It supports future no-look-ahead testing; it is not a transaction intent or authority grant.
