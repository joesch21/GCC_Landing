# Routes and deployment

## Local Express

`server.js` starts Express and serves `public/` statically. Named routes resolve:

```text
/        → public/index.html through the final Express fallback
/about   → public/about.html
/agents  → public/agents.html
/network → public/opportunity.html
/merch   → public/merch.html
/merch/  → public/merch.html
```

Direct static files include `/opportunity.html`, `/network.html`, `/data/...`, and white-paper artifacts. The local `GET/POST /api/winning-nft` endpoint is unrelated raffle state, not GCC settlement.

## Vercel

`vercel.json` maps `/about → /about.html`, `/agents → /agents.html`, `/network → /opportunity.html`, `/merch → /merch.html`, and preserves `/api/(.*)`. Files inside `public/` are root-served by Vercel, so the old `/public/$1` catch-all is intentionally absent. Cache-control headers apply to all paths.

## Route classification

| URL | Classification | Meaning |
| --- | --- | --- |
| `/` | CANONICAL | Landing page |
| `/about` | CANONICAL | About narrative |
| `/agents` | CANONICAL | Agent information |
| `/network` | CANONICAL | GCC Opportunity Surface |
| `/merch` | CANONICAL | Condor Drop 01 and Lab Preview |
| `/opportunity.html` | DIRECT STATIC | Same dashboard document |
| `/network.html` | LEGACY/DETAIL | Older static research dashboard |
| `/white-paper/Gold-Condor-Agent-Economy-White-Paper-v1.0.{pdf,md,html}` | DIRECT STATIC | White-paper artifacts |
| `/data/...` | DIRECT STATIC | Public data and schemas |

Homepage and About/Agents CTAs use `/network`; route parity is a P0 drift check.
