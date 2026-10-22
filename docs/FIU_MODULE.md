# FIU school module

`src/schools/fiu.mjs` reads fiusports.com (SIDEARM, read through the private source (older SIDEARM page)), set up by `start-schools` on October 22, 2026 for Conference USA (ported from Charlotte's handlers; Charlotte's own rules removed). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Cross country is on the men's and women's track pages ("Cross Country/Track"): the fall meets are cross country, the rest track (TFRRS `FL_college_*_Florida_Intl`).
- Beach volleyball reads `womens-beach-volleyball` (the scaffold's `beach-volleyball` page is empty); its fall dates publish no result or story and are not listed.
- A swim meet's team place reads "2nd · 1060.5 pts".
- Shared Conference USA rules (`tests/conference-usa-shared.mjs`): swim duals written with the team word and no colon; golf events for individuals have no team place; the golf story pattern names the mascot; opponents "Jax State", "MTSU", "NMSU", "Western Ky.", "Sam Houston State", "Fla. International", "Kennesaw" count as members; Conference USA sponsors no field hockey, lacrosse, rowing, wrestling or gymnastics (no Conference USA record in those).

Each rule has a check in `tests/fiu-module.mjs` (generated page blocks) or `tests/conference-usa-shared.mjs`; each new shared rule was mutated and its test failed. Every football, volleyball, soccer, field hockey and hockey record on the preview equals the page's own (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Every sport shows three athletes with verified Instagram. Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Track & Field fills when published.
- First live cards not yet observed.
