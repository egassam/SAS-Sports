# Syracuse school module

`src/schools/syracuse.mjs` owns Syracuse's cuse.com routes, program combinations, verified Instagram pins and its SIDEARM schedule reader (NC State's handlers, `scripts/port-handlers.mjs`). The event/result contract, caching, display and generic parsing stay shared.

Syracuse was added to the app on October 15, 2026 (12 sports, one PR with Stanford). cuse.com is a SIDEARM site, read directly.

## Status (`4.93.0-stanford-syracuse`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | Finals with stories (Cal, Sep 12: no story) |
| Volleyball | `womens-volleyball` | Finals with stories |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled (combined); men's exhibitions labeled |
| Field Hockey | `field-hockey` | Finals with stories |
| Hockey | `womens-ice-hockey` | Atlantic Hockey America: regular-season games against members (Delaware, Lindenwood, Mercyhurst, Penn State, RIT, Robert Morris) are league games (the page data marks none; Penn State's cards mark the same games) |
| Cross Country | `cross-country` | Team places with points; TFRRS `NY_college_*_Syracuse` |
| Tennis | `womens-tennis` | Tournaments "Completed" with stories |
| Rowing | `rowing` (women), `mens-crew` (men) | Labeled; men's page still 2025-26 (its July regattas have no result or story: not listed); women's fall race upcoming |
| Basketball | `mens-`, `womens-basketball` | Labeled; UConn exhibitions with stories |
| Lacrosse | `womens-`, `mens-lacrosse` | Labeled; men's fall exhibition upcoming; women's 2027 not published |
| Softball, Track & Field | `softball`, `track-and-field` | 2026-27 not published (valid empty) |

## Syracuse rules

- `combinedSports`: Basketball, Lacrosse, Rowing, Soccer; `teamLabels` for `rowing` (Women's) and `mens-crew` (Men's).
- Women's hockey league games by Atlantic Hockey America membership (`AHA`).
- Onboarding (this session): `add-school` reads `crew` as Rowing (`mens-crew` was missed).

Every new rule was mutated and each mutation fails `node tests/syracuse-module.mjs`.

## Athletes

Every sport's profiles publish enough athlete Instagram (Oct 15: Basketball 27 of 29, Cross Country 28 of 33, Field Hockey 15, Football 78, Hockey 17, Lacrosse 71, Rowing 34, Soccer 47, Softball 23, Tennis 7, Track & Field 54, Volleyball 15).

## Open

- Softball, Track & Field and women's Lacrosse fill when 2026-27 is published; men's Rowing when its 2026-27 page is.
- First live cards not yet observed.
