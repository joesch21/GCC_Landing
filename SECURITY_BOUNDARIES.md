# Security boundaries

## Allowed in this repository

The application may render public pages, read static JSON, calculate the research regime score from supplied normalized inputs, serve public data, and render the explicitly synthetic scenario. The build may generate derived static agent JSON.

## Not present and not allowed by the current product boundary

There are no private keys, wallet signing flows, mainnet transaction broadcasts, smart-contract writes, liquidity modifications, agent settlement calls, or live capital controls. Public agent JSON is informational and does not grant Condor authority. No scoring result authorizes a trade or promises an outcome.

`api/winning-nft.js` and the local winning-NFT API are unrelated raffle state endpoints; they do not provide GCC settlement or wallet authority. External Condor/Concierge links are outside this repository and must be treated as separate trust boundaries.

## Data and model controls

Current market inputs are disconnected, so current scores are withheld. Synthetic fixture values are labelled illustrative and never presented as live. Research statuses distinguish established, partial, unresolved and unsupported claims. XAUT is excluded until transmission evidence exists. A future live provider must be read-only, documented, versioned and independently validated before it can populate the engine.
