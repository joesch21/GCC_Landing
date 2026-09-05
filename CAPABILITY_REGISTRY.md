# Capability registry

| Capability | Status | Implementation | Data dependency | Execution risk |
| --- | --- | --- | --- | --- |
| Public landing page | ACTIVE | `public/index.html` | Static HTML/CSS/JS | None; read-only |
| About page | ACTIVE | `public/about.html` | Static research links | None; read-only |
| Agent information page | ACTIVE | `public/agents.html` | Public schemas/JSON links | None; read-only |
| Opportunity Surface | ACTIVE | `/network → public/opportunity.html` | Curated data + regime engine | No execution |
| Research dashboard | RESEARCH | Opportunity Surface panels | B7–B10 and NET-2C curated outputs | Historical limitations |
| Regime engine | RESEARCH | `public/js/gccRegimeEngine.mjs` | `gcc-regime-config.json`, normalized inputs | Experimental/unvalidated |
| Illustrative scenario | PLACEHOLDER | Engine fixture toggle | Fixed synthetic values | Must not be presented live |
| Public agent JSON | ACTIVE | `public/data/agent/`, build script | Engine + curated JSON | Informational/read-only |
| White paper | ACTIVE | PDF, Markdown, HTML artifacts | Published definitions | Documentation drift |
| Historical evidence display | RESEARCH | Evidence matrix and research cards | Status-labelled metrics | Historical, non-causal limits |
| Solver negative-result display | RESEARCH | NET-2C outcome panel | 48/50, 0 profitable, negative ΔNAV | Not an execution service |
| Network topology | RESEARCH | Native SVG topology | Curated network/pool taxonomy | Conceptual geometry |
| LP research visualization | RESEARCH | Native signed bps chart | B8 LP-vs-HODL medians | Not a forecast or yield |

Status meanings: ACTIVE is an available public capability; RESEARCH is a historical or experimental informational capability; PLACEHOLDER is a bounded fixture or future-facing surface; DISABLED is deliberately unavailable.
