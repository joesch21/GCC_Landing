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


## ADR-011 — Genesis begins with bounded manual settlement
**Date:** 2026-09-17  
**Decision:** The first GCC agent-economy experiment uses machine-readable tenders and submissions, component-level attribution, deterministic qualification gates, documented model-assisted analysis, and explicit human treasury approval. Agent identity is distinct from the settlement wallet. Autonomous treasury authority and escrow are deferred.  
**Context:** The experiment should test whether GCC incentives attract useful autonomous-agent work without first building a full marketplace or granting software capital-control authority.  
**Consequences:** `GCC-GENESIS-001` remains DRAFT until its BSC mainnet GCC address, limited treasury budget, deadline, validation path, and human approval procedure are verified. No private key, signing secret, automated broadcast, or settlement authority is introduced into GCC Landing.


## ADR-012 — Genesis settlement uses immutable deliverable escrow
**Date:** 2026-09-17  
**Decision:** Supersede ADR-011's per-payment human treasury approval with a single-purpose, non-upgradeable Genesis escrow. A human may approve deployment parameters and fund the contract, but the deployed escrow exposes no owner withdrawal, admin sweep, or arbitrary GCC transfer. Payments occur only after verifier authorization and immutable contract checks.  
**Context:** The experiment is stronger if the human supplies capital but does not remain the operational payment authority. Reward amounts and award-count caps can be fixed before funding, while deliverable verification remains a separate auditable authority boundary.  
**Consequences:** `GCC-GENESIS-001` moves to schema `0.2-draft`. Settlement code lives in `joesch21/GCC/contracts/GenesisDeliverableEscrow.sol`; GCC Landing remains read-only. Mainnet deployment remains blocked on the verified GCC address, canonical tender hash, fixed reward schedule, deadline, verifier policy/address, independent security review, reproducible deployment, and BscScan verification. ADR-011 remains historical and is superseded by this decision.


## ADR-013 — Genesis verification is immutable 2-of-3
**Date:** 2026-09-17  
**Decision:** Deliverable authorization for Genesis uses `GenesisVerifierAuthority`, an immutable EIP-1271 2-of-3 verifier with exactly three fixed authorities and no owner, admin override, signer rotation, or upgrade path. Each verifier attestation is bound to the exact escrow award digest and immutable verifier-policy hash.  
**Context:** Removing human custody from the escrow is insufficient if one bearer key can still authorize every payout. Genesis therefore separates custody from judgment and requires independent agreement under a frozen evidence policy.  
**Consequences:** `GCC-GENESIS-001` moves to schema `0.3-draft`. The current draft policy hash is `0x1f593861134197f6a361b84b85914fa1505fa070a450f51111a802ea0efd501c`, CI-verified against `joesch21/GCC/policies/GCC-GENESIS-001.verifier-policy.json`. Mainnet remains blocked until the policy is finalized, the hash independently reproduced, three production verifier authorities are provisioned without exposing their signing material to the funding human, and both verifier and escrow contracts receive independent security review.
