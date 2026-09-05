# Architecture decisions

## ADR-001 — Agent-first positioning
**Date:** 2026-09-05  
**Decision:** Agents and agent developers are the primary strategic audience.  
**Context:** GCC needs economic intelligence rather than a speculative retail price page.  
**Consequences:** UI/JSON expose evidence, costs, confidence and rejection conditions.

## ADR-002 — Native HTML/CSS/JS/SVG
**Date:** 2026-09-05  
**Decision:** Keep vanilla frontend and native ES modules/SVG.  
**Context:** No framework or chart dependency exists.  
**Consequences:** Small inspectable deployment surface.

## ADR-003 — `/network` canonical route
**Date:** 2026-09-05  
**Decision:** `/network` is the dashboard URL; `/opportunity.html` is direct static access.  
**Context:** Homepage/About CTAs use `/network`.  
**Consequences:** Express/Vercel parity is P0.

## ADR-004 — Withhold missing-input scores
**Date:** 2026-09-05  
**Decision:** Missing required inputs produce `score: null`, never silent reweighting.  
**Context:** No provider is connected in V1.  
**Consequences:** Current dashboard reports unavailable conditions honestly.

## ADR-005 — Synthetic scenario is never live
**Date:** 2026-09-05  
**Decision:** Illustrative values require explicit opt-in and labels.  
**Context:** Deterministic UI/replay fixtures are useful.  
**Consequences:** Fixture source/timestamp identify synthetic records.

## ADR-006 — Evidence vs confidence
**Date:** 2026-09-05  
**Decision:** Historical evidence status is separate from model confidence/validation.  
**Context:** Historical support does not validate a live score.  
**Consequences:** Outputs retain both fields.

## ADR-007 — Agent JSON read-only
**Date:** 2026-09-05  
**Decision:** Public JSON never grants authority or executes actions.  
**Context:** V1 is observability/research.  
**Consequences:** `execution_enabled: false`; no keys/signing/settlement.

## ADR-008 — Dispersion is not profit
**Date:** 2026-09-05  
**Decision:** Raw spread is never labelled executable profit.  
**Context:** NET-2C found zero profitable direct WBNB routes after costs.  
**Consequences:** Negative result is public; broader economics unresolved.

## ADR-009 — Direct WBNB unsupported
**Date:** 2026-09-05  
**Decision:** Tested NET-2C direct WBNB family is `NOT_SUPPORTED`.  
**Context:** 48 settled, zero profitable, negative ΔNAV.  
**Consequences:** No solver edge is advertised.

## ADR-010 — XAUT excluded
**Date:** 2026-09-05  
**Decision:** Keep XAUT informational until transmission evidence exists.  
**Context:** No usable historical reserve/reference series.  
**Consequences:** XAUT is visible but omitted from score.
