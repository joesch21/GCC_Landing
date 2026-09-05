# GCC Opportunity Surface V1

The `/network` route serves `public/opportunity.html` in Express and Vercel. The existing `public/network.html` remains a research detail page. Native ES modules, scoped CSS and SVG require no frontend or chart dependency. Original research, existing curated research data, the white paper and TA-1 are unchanged.

Current mode has no market provider: scores, observation timestamps, returns and sparklines are unavailable. Opt-in scenario mode uses synthetic inputs with a fixed fixture timestamp; it is never published as a current score. Windows affect scenario macro returns and price normalization; LP scenario assumptions are explicitly constant across windows. Historical panels are not window-filtered.

`public/js/gccRegimeEngine.mjs` exposes replaceable input accessors, classification and pure scoring. `public/data/gcc-regime-config.json` stores weights and thresholds. Price uses BNB 25%, BTC 15%, alts 15%, network confirmation 20%, dispersion 15%, liquidity 10%. LP uses fees 25%, corrective activity 20%, depth 15%, productive dispersion 10%, divergence risk 15%, adverse selection 10%, one-sided movement 5%. Risk inputs are inverted (`100 − risk`) before weighting. Missing weighted inputs withhold the score; malformed inputs fail. Weights and normalization are provisional; no probability or yield is inferred.

Providers must supply normalized 0–100 assessments with a documented measurement method before any live release. Connected breadth and historical pool outcomes are informational only. XAUT is excluded. Future calibration must version the full configuration and record both the normalized and underlying measurements without look-ahead.

Run `npm run build` to deterministically regenerate `public/data/agent/{regime,network-state,liquidity,research,replay-examples}.json` and the standalone `dist/` site. The examples preserve timestamp, inputs, weights, output labels and confidence for replay. Static JSON is the V1 contract; no new transaction or API execution endpoint is enabled.

## Graphics and provenance

| Graphic | Data |
| --- | --- |
| Independent price and LP semicircle gauges | V0.1 config; unavailable current inputs or explicit synthetic fixtures |
| BTC, BNB, SOL proxy and XAUT sparklines | Synthetic scenario only; no-data placeholders by default |
| GCC topology | White paper sections 7–9; conceptual connections, no depth encoding |
| Effective supply strip | B10 values in existing gcc-network-research.json |
| Signed LP-vs-HODL bars in bps | B8, 60 hypothetical cohorts; original curated values |
| Toll flow | White paper section 9; unquantified conceptual recipients |
| Expandable evidence matrix | B7–B10, NET-2C and white paper evidence taxonomy |
| Signed conditional coefficient bars | B9 transmission_coefficients.csv, MULTI_CRYPTO; 231 daily observations and 95% intervals |
| Solver 50-cell outcome matrix | NET-2C historical fork report; 48 negative settlements, 2 unavailable |

Definitions match the published white paper. Evidence uses icon plus word: established (green), partial (gold), unresolved (grey), not supported (red). Model validation and input confidence are separate from historical evidence strength.

## Verification

`npm run build`, `npm test`, and `npm run lint` need only the existing Node environment. `npm run test:browser` requires Playwright and Chromium; set `PLAYWRIGHT_MODULE` to an existing Playwright package path if it is not installed locally. The browser suite starts an isolated server copy, runs the existing mutating NFT API test against that copy, checks mobile layout, routes, controls, JSON and data failure states, and captures desktop/mobile screenshots under ignored `artifacts/`.

The requested image `/mnt/data/gold_condor_network_intelligence_dashboard.png` was unavailable. The interface follows the work order's dark navy, gold, compact financial design specification; it does not claim pixel matching to the absent reference.
