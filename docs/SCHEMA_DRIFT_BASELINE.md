# Schema drift baseline

Date: 2026-09-06  
HEAD at baseline run: `0953749 Fix Vercel opportunity surface routing`  
Checker: `scripts/check-schema-drift.mjs`  
Command: `npm run check:drift`

## Result

**PASS — 1,119 checks passed, 0 failures, 0 warnings.**

The baseline checked 11 registered JSON contracts, including 5 generated agent exports, the regime schema, the future opportunity schema, curated network/research/configuration data, and registry metadata. It validated JSON parsing, required files, regime output/replay structure, current score withholding, config version and weight sums, evidence/label vocabulary, UI metric references, route parity, local links, execution boundary, and repeat-build SHA-256 stability.

## Accepted boundaries

Several curated/export files have bounded structural contracts rather than standalone JSON Schema documents. Their required fields and semantic relationships are checked directly by the validator and documented in `docs/SCHEMA_REGISTRY.md`. The future opportunity schema is intentionally conceptual and does not represent an active product.

The dashboard has no live market provider. Current scores remain null and replay fixtures are synthetic. `public/network.html` remains a legacy/detail document alongside canonical `/network`; this is intentional and documented. The checker performs no external requests, so external URL availability is outside this baseline.

Any future failure should be classified using `docs/SCHEMA_DRIFT.md` before changing data or code. Do not silence a P0 route, score, schema, UI-reference, or generated-output failure by weakening the checker.
