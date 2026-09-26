# K-State cross-country recap fix — September 26, 2026

Base: main at 4f3b2cf654b9d8e8915cd359a9e9a403b912ba03 (merged KU PR #10).

## Reproduced causes

- The September 4 Platte River race has an exact-event saved table: 20 rows (11 women, seven men, two teams). Its successful output does not depend on AI.
- The live Gans Creek feed followed only `Gans_Creek_Women_s_6k_Results.pdf`, returning nine women and marking them verified. The men's document was ignored.
- Opening Gans Creek invoked a different prose parser. The observed response replaced those nine rows with two incorrect rows: a men's team win and an athlete named `Junior Brock`. AI returned `ai_failed`.
- Generic full-result enrichment also overwrote the first race's saved rows with malformed TFRRS group headings and `0th` DNF/DNS places.

## Change

Read K-State's explicitly labeled team-finishes and individual-results sections in its exact-event official recap. Preserve the division and distance from each heading, include the K-State team placing/points, and extract each published athlete/place/time. Feed and expanded details use the same path; neither first-PDF extraction nor AI/prose guesses can overwrite these rows.

Gans Creek now yields 18 rows: nine women, seven men, and two teams (women 18th/499 points; men 17th/449 points). The first race's 20 original rows are preserved and the new parser independently reconstructs the same rows from its recap. Later events using this publisher format need no additional saved record. Incomplete/unavailable result sections get a partial-results notice and are not marked complete. K-State scope leaves KU and other schools' adapters unchanged. Version changed to 4.24.1-kstate-recap-results to invalidate old feed caches.

Official sources:
- https://www.kstatesports.com/news/2026/9/25/cross-country-wildcats-showcase-significant-personal-improvement-at-gans-creek-classic
- https://www.kstatesports.com/news/2026/9/4/cross-country-k-state-clinches-team-wins-at-platte-river-rumble-gold

## Validation and publication

- `npm run test:release`, `npm test`, `git diff --check`: passed.
- Offline esbuild Worker bundle: passed.
- Actual downloaded K-State schedule/recap through `fetchLive` and expanded-event integration: 18 Gans Creek rows, 20 Platte River rows, identical feed/modal results.
- Regression coverage includes both divisions, source/event identity, future-year parsing without a saved record, missing men's results, failed sources, original-event overwrite protection, KU records, 18 registered schools, and 71 isolated cache identities.
- The production UI was inspected and still shows the reported women-only feed before publication.
- Cloudflare dry-run was blocked by automatic approval review: potential transmission of repository code to Cloudflare requires explicit user approval. No deployment or merge has been performed. A subsequent branch push was also rejected by automatic approval review because publication to the GitHub destination was not explicitly authorized. No remote draft PR was created. The tested changes are committed locally on fix/kstate-recap-results-20260926. After explicit approval to push to egassam/SAS-Sports and deploy to the existing Cloudflare Worker, publish and verify the production feed and expanded modal visually before claiming the app is fixed.

Known scope: this handles K-State's labeled recap result lists. A publisher format change produces a partial-results notice; it does not invent missing results or promise all other schools are fixed.
