# Schema drift policy

Schema drift is any change that makes a producer, consumer, definition, route, or generated artifact disagree with its declared contract. `scripts/check-schema-drift.mjs` checks this offline without RPC or web access.

| Class | Meaning | Severity |
| --- | --- | --- |
| D1 | Required-field removal/rename | P0 |
| D2 | Type change, such as number to string | P0 |
| D3 | Enum/label change without contract update | P0/P1 |
| D4 | Meaning or unit changes while field name remains | P1 |
| D5 | Weights/thresholds change without version change | P0 |
| D6 | Generated output differs from schema or repeat build | P0 |
| D7 | UI references a field not emitted by data | P0 |
| D8 | White paper/dashboard definition diverges | P1/P2 |
| D9 | Express and Vercel named routes disagree | P0 |

The validator parses registry JSON, confirms files/schemas, validates regime outputs and replay records against the bounded JSON Schema keywords used here, checks config weights/thresholds/penalties, validates evidence statuses and regime labels, and extracts direct metric IDs used by `opportunity.mjs`.

It compares logical Express and Vercel destinations for `/about`, `/agents`, and `/network`, rejects the old `/public` catch-all, checks required white-paper/schema/research/agent resources and local HTML links, confirms current scores remain withheld, and builds twice to compare SHA-256 hashes of generated agent exports.

The checker cannot prove research semantics, causal inference, prose equivalence, external URL availability, or live provider quality. Intentional breaking changes require a schema/config version bump, documentation update, registry update and drift-test update.
