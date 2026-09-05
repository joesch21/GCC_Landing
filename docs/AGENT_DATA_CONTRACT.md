# Agent data contract

## Purpose

Agents can inspect GCC network economics without parsing human-facing UI. Public data describes research, network context, model inputs/outputs, evidence status and future opportunity categories.

## Files

```text
/data/agent/regime.json
/data/agent/network-state.json
/data/agent/liquidity.json
/data/agent/research.json
/data/agent/replay-examples.json
/data/gcc-regime-schema.json
/data/gcc-opportunity-schema.json
```

V1 serves static JSON rather than a separate live endpoint. `regime.json` is the primary score output. `network-state.json` describes BSC/GCC capability and state. `liquidity.json` carries B8 pool results. `research.json` carries metric provenance and definitions. Replay examples are synthetic fixtures.

Every formal output carries `schema_version`; regime outputs carry `model_version` and complete `model_config`. Breaking field/type/enum/semantic changes require a schema version bump, documentation/registry update and drift-test update. Config changes require a model/config version change and regenerated exports.

Agent-facing records retain status, source, period/timestamp, model version and confidence where relevant. Evidence status is separate from current model confidence.

Public agent JSON is informational and read-only. It does not grant authority, sign or broadcast transactions, move GCC, modify liquidity, or execute a route. `execution_enabled` must remain `false`; opportunity types are future-facing categories, not executable offers.
