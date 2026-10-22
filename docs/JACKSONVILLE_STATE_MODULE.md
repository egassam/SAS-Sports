# Jacksonville State school module

`src/schools/jacksonville-state.mjs` reads jaxstatesports.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for Conference USA (ported from Charlotte's handlers; Charlotte's own rules removed). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Bowling, Cross Country, Football, Golf, Rifle, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Bowling matches listed without a score (four on Oct 17 at the Penguin Classic) are not results.
- Shared Conference USA rules (`tests/conference-usa-shared.mjs`): swim duals written with the team word and no colon; golf events for individuals have no team place; the golf story pattern names the mascot; opponents "Jax State", "MTSU", "NMSU", "Western Ky.", "Sam Houston State", "Fla. International", "Kennesaw" count as members; Conference USA sponsors no field hockey, lacrosse, rowing, wrestling or gymnastics (no Conference USA record in those).

Each rule has a check in `tests/jacksonville-state-module.mjs` (generated page blocks) or `tests/conference-usa-shared.mjs`; each new shared rule was mutated and its test failed. Every football, volleyball, soccer, field hockey and hockey record on the preview equals the page's own (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Profile cards fill the remaining slots in Baseball, Basketball, Bowling, Cross Country, Football, Golf, Rifle, Soccer, Softball, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- First live cards not yet observed.
