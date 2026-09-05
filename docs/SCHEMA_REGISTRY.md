# Schema registry

**AUTHORITATIVE** owns meaning and required shape; **DERIVED** is generated from authoritative inputs; **PRESENTATION** is a UI view and never a data authority.

| Path | Authority/source | Maintenance | Consumer | Schema/version | Core fields | Drift risk |
| --- | --- | --- | --- | --- | --- | --- |
| `public/data/gcc-network-research.json` | Curated B7–B10/NET-2C publication | Hand-maintained, AUTHORITATIVE | Opportunity UI, legacy dashboard, build | `schema_version` 1.0.0; bounded contract | network, metrics, lp_results, evidence_map | P1 values/status |
| `public/data/gcc-network-state.json` | Curated public network state | Hand-maintained, AUTHORITATIVE | Legacy dashboard, build context | 1.0.0; bounded contract | network, asset, pools, xaut, timestamp, source | P1 stale state |
| `public/data/gcc-opportunity-research.json` | Curated opportunity definitions | Hand-maintained, AUTHORITATIVE | Opportunity UI, research export | 1.0.0; evidence/definitions contract | transmission, evidence, definitions, agent, roadmap | P1 terminology |
| `public/data/gcc-regime-config.json` | Research scoring configuration | Hand-maintained, AUTHORITATIVE | Engine, build, tests | version `0.1-research` | two weight maps, penalties, thresholds | P0 version/weights |
| `public/data/gcc-regime-schema.json` | Regime output contract | Hand-maintained, AUTHORITATIVE | Tests, drift checker, agents | JSON Schema; output 1.0.0 | required output fields/defs | P0 output |
| `public/data/gcc-opportunity-schema.json` | Future opportunity contract | Hand-maintained, AUTHORITATIVE | Agents/future discovery | JSON Schema | id, type, network, settlementAsset, reward, authority, deadline, verification | P1 future contract |
| `public/data/agent/regime.json` | Build + engine | Generated, DERIVED | Agents, UI preview | Regime schema; 1.0.0 | full evaluated regime | P0 generation/schema |
| `public/data/agent/network-state.json` | Build from metadata + engine | Generated, DERIVED | Agents | bounded export | network, settlement_asset, state, execution_enabled | P1 shape |
| `public/data/agent/liquidity.json` | Build from B8 data + engine | Generated, DERIVED | Agents | bounded export | source, definition, results, current_environment | P1 values |
| `public/data/agent/research.json` | Build from curated contracts | Generated, DERIVED | Agents | bounded export | research fields + metrics | P1 provenance |
| `public/data/agent/replay-examples.json` | Build from engine fixtures | Generated, DERIVED | Tests/backtesting | Each record uses regime schema | mode, warning, records | P0 nondeterminism |

The relationship is machine-readable in `schemas/schema-registry.json`. Generated exports never become authorities. `gcc-network-research.json` owns public metric values; `gcc-regime-config.json` owns score weights/thresholds; the regime schema owns generated regime shape. The older `public/network.html` is presentation over curated data, not a second schema authority.
