# GCC Opportunity Surface — visual fidelity V2

## Reference review

Inspected the supplied PNG directly before UI changes. The approved reference is preserved at `artifacts/reference/gold_condor_network_intelligence_dashboard.png`. It is never copied into public assets or referenced by dashboard markup, CSS, JavaScript, SVG, or the build.

The reference establishes a gold serif masthead, small institutional typography, navy-black illuminated cards, a four-card headline row, a central circular economic network, restrained semantic colours, and a compact machine-readable panel. The implementation reproduces these through HTML, CSS Grid, gradients, inline SVG and formatted JSON. The only raster asset used by the page is the existing Gold Condor seal.

## What now matches

- Gold Condor identity, existing logo, two-line research/economics statement, and compact page controls.
- Four-card top row: price environment, LP environment, effective scarcity, solver research.
- Macro / GCC network / evidence second row, followed by toll / liquidity / agent data.
- Gold graduated semicircle gauges, faint inactive arcs, score-dependent progress, centred values and explicit unavailable/scenario labels.
- Central luminous GCC node, orbit guides and a faint native economic grid. BNB receives the strongest historical channel emphasis; XAUT has a dashed unresolved connection. Connector appearance responds to network confirmation.
- Asset symbols, real line-series sparklines, and independent evidence labels.
- Segmented proportional supply strip, signed LP bars, a route outcome matrix, and conditional coefficient bars with 95% interval markers.
- Visible icon/word/status evidence rows with a complete expandable evidence matrix.
- A terminal-style JSON panel with syntax colours, copy control, source indicator, model version, timestamp, evidence status, and full JSON dialog access.

## Intentional differences

- The existing seal replaces the concept's eagle illustration; no new logo was fabricated.
- No decorative raster globe or reference-image fragments are used. Subtle CSS textures and SVG orbit/grid geometry provide depth.
- Unavailable market inputs remain unavailable. Only the opt-in synthetic scenario displays numerical environment scores and macro series; this remains visibly labelled.
- Price and LP model validation is unresolved/experimental, not the concept's illustrative established badge.
- LP bars display research values `+111.01`, `+15.73`, `−4.58`, `−23.48`, `−88.00` bps. Signed horizontal bars make the zero baseline and full pool labels readable on mobile.
- Inaccessible balance is distinguished from nominal supply and balance outside the dead address. That remainder is not asserted to be liquid or available for trading.
- B9 transmission is partial, including confidence intervals that cross zero for BTC and SOL. Its panel, corrective fee economics, and roadmap continue below the primary three rows.
- The page is taller than the illustrative concept because source notes, model controls, JSON access, disclosures and additional accepted research panels remain available. Mobile reflows the components rather than shrinking a desktop canvas.

## Native data binding

`public/js/opportunityVisuals.mjs` is presentation-only. Gauge arcs, sparkline points, supply proportions and accessible summaries, solver outcome cell counts, bar geometry/intervals, evidence badges and terminal contents derive from passed structured data. Network node/edge state attributes track the existing network snapshot; XAUT remains unresolved. Data-dependent geometry uses CSS custom properties rather than layout-specific inline styles.

No changes were made to `gccRegimeEngine.mjs`, regime configuration, public schemas, research values, or endpoint architecture. The deterministic build regenerates the existing static public JSON unchanged. No execution was enabled.

## Validation

- 18 Node tests: original scoring, replay, data/schema tests plus native visual data-binding checks.
- Existing browser suite retained and expanded: four-card composition, SVG icon containment, copy-to-clipboard content, dialog focus restoration, named charts, keyboard focus, reduced motion, selected text-colour contrast, and responsive widths 320, 390, 768, 1024, 1280 and 1672 pixels.
- Browser checks cover missing-data failure, scenario and time-window changes, public JSON routes, and the legacy GET/POST NFT smoke test against an isolated disposable server copy.
- Production build, JavaScript syntax checks, and `git diff --check` pass. The targeted accessibility checks are not a claim of a comprehensive WCAG audit.

## Screenshots

- `artifacts/opportunity-desktop-v2.png`
- `artifacts/opportunity-mobile-v2.png`
- `artifacts/opportunity-desktop-scenario-v2.png`
- `artifacts/opportunity-mobile-scenario-v2.png`

Desktop and mobile renderings were inspected directly against the supplied reference. Screenshots are build-review artifacts only, never dashboard assets.

## Files for this pass

Added: `public/opportunity-v2.css`, `public/js/opportunityVisuals.mjs`, `tests/visuals.test.mjs`, and this report.

Updated: `public/opportunity.html`, `public/js/opportunity.mjs`, `scripts/test-opportunity-browser.mjs`, and the syntax-check script in `package.json`. Existing foundation changes remain uncommitted. No commit or push was performed.
