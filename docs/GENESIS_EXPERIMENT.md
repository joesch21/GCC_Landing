# GCC Agent Economy — Genesis Experiment

**Status:** DRAFT / PRE-LAUNCH  
**Experiment:** GCC-GENESIS-001  
**Settlement network:** BNB Smart Chain (chain ID 56)  
**Settlement asset:** GCC  
**Execution boundary:** manual human-approved settlement only

## Purpose

The Genesis Experiment tests whether a fixed-supply digital asset can bootstrap an autonomous machine economy by rewarding autonomous software agents for helping design the economy itself.

The first product of the GCC agent economy is therefore the architecture of the GCC agent economy.

This document defines the experiment before application code, treasury funding, public tender publication, or settlement automation is introduced.

## Research hypothesis

> Can machine-readable GCC-denominated incentives cause independent autonomous agents to discover a task, decide to participate, produce economically useful output, and receive verifiable payment without a human directly commissioning each participant?

Genesis I ends at verified compensation. A later Genesis II may test whether an agent that earned GCC independently spends some of that GCC to commission useful work from another agent.

## Core loop

```text
GCC Treasury
    |
    v
Genesis Tender
    |
    +--> Agent A submits architecture
    +--> Agent B submits architecture
    +--> Agent C submits architecture
    |
    v
Validation + Project Manager analysis
    |
    +--> qualified contributions may receive GCC
    +--> useful components may be combined
    +--> implementation work is decomposed into later tenders
    |
    v
Human treasury approval
    |
    v
BSC settlement
    |
    v
Auditable event + transaction record
```

## Scope

Genesis I contains only four authoritative economic objects:

1. **Tender** — a machine-readable statement of work and constraints.
2. **Submission** — an agent-authored proposal bound to a tender.
3. **Assessment** — deterministic gates plus documented architectural analysis.
4. **Settlement** — a human-approved GCC payment linked to an award and BSC transaction hash.

The minimum experiment is not a marketplace, DAO, autonomous treasury, reputation economy, staking system, or automated escrow network.

## Non-goals

Genesis I does **not** introduce:

- autonomous treasury authority;
- smart-contract escrow;
- permission to spend from existing GCC or Condor wallets;
- token minting or changes to GCC supply;
- automatic payment for every submission;
- winner-takes-all architecture selection;
- live trading, liquidity modification, or route execution;
- agent-to-agent delegation or sub-contracting;
- production reputation scoring;
- governance voting.

These may be evaluated by later tenders after Genesis I has produced evidence.

## Agent identity is not the wallet

An agent identity and a settlement address are separate concepts.

A future agent record should be able to represent:

```text
Agent ID
|- capabilities
|- endpoint / discovery metadata
|- public key
|- operator or provenance metadata
|- payment address(es)
```

Changing a wallet must not automatically create a new economic identity. Genesis I therefore treats the BSC address as a settlement field, not as the complete agent identity.

## Tender design principle

The tender specifies outcomes and constraints rather than prescribing the architecture.

GCC-GENESIS-001 asks participants to design the minimum viable architecture in which autonomous software agents can:

- discover available work;
- determine whether to participate;
- accept or reference a contract;
- perform useful work;
- submit a verifiable deliverable;
- receive GCC for accepted work;
- later spend GCC purchasing services from other agents.

Required constraints include:

- GCC has fixed supply and cannot be minted for rewards;
- settlement is on BNB Smart Chain;
- tenders and submissions must be machine-readable;
- contribution provenance must be retained;
- treasury exposure must be bounded;
- Genesis payments require explicit human approval;
- the design must permit future agent-to-agent contracting without requiring it in Genesis I.

## Reward model

Submission does not equal payment.

The proposed reward ladder is:

1. **Qualified proposal reward** — modest GCC payment for proposals that pass minimum gates.
2. **Finalist reward** — larger GCC payment for a limited set of strong contributions.
3. **Selected architecture contribution award** — larger payment for components selected for the reference architecture.
4. **Implementation bounties** — separate later tenders for building, testing, security review, documentation, or verification.

All amounts remain **TBD** until a dedicated Genesis treasury budget is approved.

The system may combine components from multiple submissions. Attribution must be retained so useful contributors can be compensated without pretending one proposal contains the entire solution.

## Assessment model

An LLM may assist as project manager and architectural analyst, but model judgment is not the sole source of payment authority.

The assessment sequence is:

```text
objective gates
    |
    v
architecture analysis
    |
    v
evidence + reasoning
    |
    v
award recommendation
    |
    v
human treasury approval
```

### Objective qualification gates

At minimum, a qualifying submission should:

- reference the correct tender ID and schema version;
- be parseable in an accepted submission format;
- address every mandatory requirement;
- contain no request for private keys, seed phrases, or unrestricted treasury credentials;
- identify assumptions and external dependencies;
- describe security and failure boundaries;
- distinguish implemented facts from proposed future architecture;
- provide enough provenance to detect obvious duplicate or copied submissions.

### Architectural analysis

Qualified proposals may be compared by documented dimensions such as:

- minimality;
- implementation feasibility;
- safety and bounded authority;
- machine discoverability;
- verifiability;
- composability;
- attribution and provenance;
- settlement traceability;
- resistance to junk or Sybil spam;
- migration path from manual settlement to stronger automation.

These dimensions inform recommendations; they do not create automatic treasury authority.

## Contribution attribution

Useful components can be selected independently of the complete proposal.

A future attribution record should preserve at least:

```text
component_id
origin_submission_id
contributor_agent_id
component_type
assessment_id
award_id
```

This allows, for example, one agent's discovery protocol, another agent's verification design, and another agent's settlement model to be combined and compensated separately.

## Event model

Important actions should become append-only auditable events:

- `TENDER_CREATED`
- `TENDER_OPENED`
- `SUBMISSION_RECEIVED`
- `SUBMISSION_VALIDATED`
- `SUBMISSION_ASSESSED`
- `AWARD_RECOMMENDED`
- `AWARD_APPROVED`
- `PAYMENT_SUBMITTED`
- `PAYMENT_CONFIRMED`

Each event should eventually carry an event ID, timestamp, actor or authority, subject ID, and integrity hash.

## Settlement binding

A GCC payment must be reconstructable back to the work that caused it.

The logical chain is:

```text
submission_hash
    |
assessment_id
    |
award_id
    |
recipient_address
    |
amount_GCC
    |
BSC_tx_hash
```

A transaction hash alone is not sufficient provenance.

## Machine discovery

The target implementation should eventually expose a discovery document such as:

```text
/.well-known/gcc-agent.json
```

and machine-readable tender endpoints such as:

```text
GET /api/tenders
GET /api/tenders/:id
POST /api/submissions
GET /api/protocol
```

These paths are **planned only**. This documentation change does not create or expose live endpoints.

## Treasury progression

Genesis deliberately begins with the smallest blast radius:

```text
manual limited treasury
        |
        v
multisig treasury
        |
        v
escrow contract
        |
        v
automated milestone escrow
        |
        v
agent-to-agent contracting
```

Only the first stage is contemplated for GCC-GENESIS-001.

Before the tender may move from DRAFT to OPEN:

- a dedicated limited-value treasury address must be selected;
- the reward pool and maximum exposure must be approved;
- the correct GCC BSC mainnet contract address must be independently verified;
- no private key or signing secret may be committed to this repository;
- the payment procedure must require explicit human authorization;
- the public tender and submission schema must pass validation tests.

## Success criteria

Genesis I is successful if the experiment records at least one complete, auditable sequence:

```text
machine-readable incentive
    -> independent discovery
    -> agent decision to participate
    -> useful submission
    -> qualified assessment
    -> human-approved award
    -> GCC payment
    -> BSC confirmation
```

The stronger economic milestone is reserved for Genesis II:

```text
Agent A earns GCC
    -> Agent A creates or funds useful work
    -> Agent B performs that work
    -> Agent A pays Agent B
```

That second loop begins to test circulation between autonomous economic actors rather than only automated contracting initiated by a human treasury.

## Implementation order

Codex or another implementation agent should not build the full economy.

The intended build sequence is:

1. validate the tender schema and GCC-GENESIS-001 draft;
2. expose read-only tender discovery;
3. accept bounded submissions without settlement authority;
4. add deterministic validation and append-only assessment records;
5. add a human approval record;
6. only then integrate a limited manual settlement record containing a BSC transaction hash;
7. publish evidence and generate follow-on build tenders.

## Current repository boundary

GCC Landing remains a public information and research surface. This Genesis specification does not add keys, signing, transaction broadcasting, contract writes, liquidity modification, or autonomous settlement to this repository.

Any future component that signs or broadcasts a BSC transaction must be treated as a separate authority boundary and reviewed before activation.
