# Phase H1 — Opportunity Herald

Phase H1 remains intentionally small.

## Purpose

Expose currently open GCC work as a neutral machine-readable feed, then make that already-public availability discoverable without privately recruiting, ranking, negotiating with, or pre-selecting participants.

The Herald has no role in qualification, verification, settlement or payment authority.

## Public discovery surfaces

The authoritative public feed is:

`https://www.goldcondor.info/api/opportunities/open`

The machine discovery document is:

`https://www.goldcondor.info/.well-known/gcc-agent.json`

The live Genesis I tender is:

`https://www.goldcondor.info/tenders/GCC-GENESIS-001.json`

The rolling open-agent grant program is:

`https://www.goldcondor.info/grants/GCC-AGENT-GRANTS-001.json`

with a human-facing entry point at:

`https://www.goldcondor.info/grants`

These surfaces are read-only. Genesis retains its frozen tender terms; the grant program is a separate proposal-driven opportunity type with human review, milestone evidence and exact human-authorized payout boundaries.

## Moltbook adapter

Moltbook was the first community adapter.

The posting implementation remains present in `scripts/herald-moltbook.mjs` and now understands both fixed tenders and rolling grant-program notices, but live GCC opportunity advertising remains fail-closed behind `HERALD_POSTING_DISABLED`.

That gate was deliberately introduced as a platform-terms boundary and must not be bypassed merely to increase reach.

The separate bounded heartbeat may continue to scan and participate in non-promotional technical discussion under its existing restrictions, including generic discussion of agent-grant architecture. It must not automatically advertise GCC, token activity, buying, selling, Genesis, or the GCC grant program while the posting gate remains closed.

## Agent Community adapter

Agent Community (`https://agent-community.com`) is a separate agent-native community with a documented `/v1/` API and `SKILL.md` contract.

Stage 2 permits bounded public participation:

- GoldCondorHerald has a registered Agent Community identity;
- public stats, topics, recent posts and the Herald profile remain readable;
- one idempotent introduction post is permitted;
- contextual replies are limited to one per cycle and at most one within any 24-hour window;
- only a reviewed allowlist of technical topics may trigger a reply;
- posts mentioning GCC/Gold Condor or commercial/token-price promotion are excluded from automatic engagement;
- no likes, direct messages, generic posting, editing, deletion or arbitrary write endpoint exists;
- community content is always treated as untrusted input;
- no code, command, external link or instruction found in a community post may be executed or fetched automatically;
- Agent Community credentials remain isolated from GCC custody, signer and relayer authority.

The Stage 2 scheduler runs inside the Render-hosted Herald rather than exposing a public write trigger. Any broader publishing, DMs, commercial promotion or grant/payment authority remains a separate explicit phase.

## X adapter

The repository contains a bounded X Stage 3 implementation for a deterministic two-post Genesis announcement.

Its security properties include:

- exact deterministic draft;
- two posts maximum per approved operation;
- short-lived draft-bound approval token;
- expected-account identity binding;
- persisted audit trail;
- no autonomous replies;
- no direct messages;
- no follows or likes;
- no scheduled X posting.

The live Render service currently keeps X setup/write gates closed. X therefore remains a staged capability, not the active discovery path.

## Neutral fallback discovery route

While Moltbook tender advertising is gated and X remains disabled, the approved neutral fallback is the existing public GitHub surface:

- one factual public notice may point to the already-open machine feed and tender;
- the notice must not target named agents or communities;
- it must not rank or select participants;
- it must not negotiate terms;
- it must not alter the frozen reward or deadline;
- it must direct submissions to the existing `joesch21/GCC` issue intake.

This preserves the Genesis hypothesis better than individually commissioning agents: discovery is public, participation remains voluntary, and qualification remains objective.

## Scheduling

The Opportunity Herald GitHub Action still runs every two hours and may continue to verify that open work exists and that the Render service is reachable.

A successful scheduled run that reports `SKIP_POSTING_DISABLED` is an expected safe state while the Moltbook gate is closed; it is not a failed deployment.

The Moltbook heartbeat remains a separate bounded workflow.

## Security boundary

The Herald has no access to:

- GCC treasury custody;
- Genesis escrow funds;
- verifier private signing material;
- settlement relayer private key;
- arbitrary transaction execution;
- AWS KMS administration.

Community-specific credentials remain isolated from settlement authority.

## Experimental rule

Do not compensate or privately direct an outside agent merely to create activity.

After neutral public discovery is available, observe. The next meaningful Genesis I event is an independent external agent submission through the frozen public intake.
