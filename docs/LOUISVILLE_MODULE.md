# Louisville school module

`src/schools/louisville.mjs` owns Louisville's gocards.com routes, program combinations, verified Instagram pins and its SIDEARM schedule reader (Oklahoma's handlers, `scripts/port-handlers.mjs`). The event/result contract, caching, display and generic parsing stay shared.

Louisville was added to the app on October 15, 2026 (14 sports, one PR with NC State). gocards.com is a Nuxt SIDEARM site behind Imperva (the sandbox gets a redirect loop; the onboarding tools and the Worker read it through the private source).

## Status (`4.90.1-louisville-nc-state`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 6 finals with stories; "#9/#10 Ole Miss" reads Ole Miss |
| Volleyball | `womens-volleyball` | 18 finals with stories |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; men's opponents published as institutions read by their short names ("University of Kentucky" → Kentucky, "Southern Methodist University" → SMU) |
| Field Hockey | `field-hockey` | 14 finals; the ACC tournament reads "at Atlantic Coast Conference" (the page's name) |
| Cross Country | `cross-country` | Team places and points from the cards (John McNichols, Nuttycombe); TFRRS `KY_college_f/m_Louisville` |
| Golf | `womens-golf`, `mens-golf` | Labeled; places from the cards ("6th of 16") |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; tournaments with stories (a split-weekend story covers both of its events: its title names both) |
| Swimming & Diving | `swimming-and-diving` | College Swimming League and Xavier with stories |
| Rowing | `womens-rowing` | Derby City Head Race (Oct 10) has no result, story or archive story: not listed; fall head races upcoming |
| Basketball | `mens-`, `womens-basketball` | Labeled; exhibitions labeled (Jul 28 summer exhibition out of the record) |
| Softball | `softball` | Fall exhibitions |
| Baseball, Lacrosse, Track & Field | | 2026-27 pages not published yet (valid empty) |

## Louisville rules

- `combinedSports`: Basketball, Golf, Soccer, Swimming & Diving, Tennis.
- Opponents through the kit's `institutionShortName` (shared since Oct 15; Miami, Boston and Washington University keep theirs).
- A past rowing or cross country meet with no result line, story or TFRRS race is not listed (with tennis's rule).
- The home-tournament name rule reads "Louisville( University| Cardinals)" (the port used to keep Oklahoma's "Sooners"; `port-handlers` now renames the catalog mascot).
- Golf places from the cards; a storyless card would take its place from the final story (kit `createGolfStoryPlace`).

Every new rule was mutated and each mutation fails `node tests/louisville-module.mjs` (shared rules in `tests/nc-state-module.mjs`).

## Athletes

Pinned from the profile pages (Oct 15): Basketball, Cross Country, Golf, Softball (three each). Every other sport's roster or profiles publish enough Instagram. No profile cards.

## Open

- Baseball, Lacrosse, Track & Field fill when 2026-27 is published.
- First live cards not yet observed.
