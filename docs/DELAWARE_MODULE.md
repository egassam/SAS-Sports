# Delaware school module

`src/schools/delaware.mjs` reads bluehens.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for Conference USA (ported from Charlotte's handlers; Charlotte's own rules removed). The event/result contract, caching, display and generic parsing stay shared.

Sports (15): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Hockey, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Women's ice hockey (new NCAA program) plays in Atlantic Hockey America: the page data marks its league games (1-3 as published).
- Golf events for individuals beside the team's tournament ("Happy Valley Individuals", "Shepherd's Rock Individual") have no team place.
- Golf stories naming the "Fightin' Blue Hens" give the place (Temple Invitational: second).
- Shared Conference USA rules (`tests/conference-usa-shared.mjs`): swim duals written with the team word and no colon; golf events for individuals have no team place; the golf story pattern names the mascot; opponents "Jax State", "MTSU", "NMSU", "Western Ky.", "Sam Houston State", "Fla. International", "Kennesaw" count as members; Conference USA sponsors no field hockey, lacrosse, rowing, wrestling or gymnastics (no Conference USA record in those).

Each rule has a check in `tests/delaware-module.mjs` (generated page blocks) or `tests/conference-usa-shared.mjs`; each new shared rule was mutated and its test failed. Every football, volleyball, soccer, field hockey and hockey record on the preview equals the page's own (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Profile cards fill the remaining slots in Baseball, Soccer (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Track & Field and women's Lacrosse fill when published; Delaware field hockey shows no league record (none published).
- First live cards not yet observed.
