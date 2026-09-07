# Production Opportunity Engine integration

The Vercel production route `/network` is the Opportunity Surface. It is a presentation layer and does not calculate research conclusions.

## Data boundary

`public/data/opportunity-engine.json` is a controlled, committed snapshot of the canonical engine output from `TrialWalletKeccak` commit `0faaac61dcfbf0f1752b7c13d0df7f8da2ec7772`. Its `provenance` object records the source label, source SHA-256, generation timestamp, source schema version, and methodology reference.

`public/js/opportunity-engine-surface.mjs` reads only that snapshot and maps evidence records to the existing Opportunity Surface visual components. Current and historical scores remain `UNAVAILABLE` when the engine withholds them. `SCOUT_GCC_ALIGNMENT = UNRESOLVED_NO_TEMPORAL_OVERLAP` is displayed from the engine status record.

The older `public/data/gcc-network-research.json` and related files remain compatibility data for `/network.html`, `/agents`, and existing generated agent exports. They are not the source for the `/network` Opportunity Surface.

The snapshot is regenerated with:

```sh
npm run import:engine
```

The import requires the canonical source checkout at the default path or an explicit `OPPORTUNITY_ENGINE_SOURCE`; it does not fetch live data and does not execute wallet, signing, trading, or deployment logic.
