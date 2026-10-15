# Florida State school module

`src/schools/florida-state.mjs` owns Florida State's seminoles.com routes, program combinations, verified Instagram pins and its SIDEARM schedule reader (Oklahoma's handlers, `scripts/port-handlers.mjs`). The event/result contract, caching, display and generic parsing stay shared.

Florida State was added to the app on October 15, 2026 (13 sports, one PR with Georgia Tech). seminoles.com is a Nuxt SIDEARM site (catalog: CUSTOM), read through the private source.

## Status (`4.89.0-florida-state-georgia-tech`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 6 finals with stories |
| Volleyball | `womens-volleyball` | 16 finals with stories |
| Soccer | `womens-soccer` | Finals with stories |
| Cross Country | `womens-cross-country`, `mens-cross-country` | Labeled; each team its own TFRRS race (`FL_college_f/m_Florida_State`, `onlyMeetThatDay`): Pre-Regional, Gans Creek, FSU XC Invitational (both teams 3rd, 83 points) |
| Golf | `womens-golf`, `mens-golf` | Labeled. Women's places from the cards ("1st of 12"); men's Hamptons Intercollegiate 4th from its story text; men's Olympia Fields "14th" (no field size published); men's Folds of Honor (Sep 7-9) not listed: only a round-two story, no final result |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; tournaments with stories (storyless PTT events not listed) |
| Swimming & Diving | `womens-`, `mens-swimming-and-diving` | Labeled; Seminole Fall Classic duals; "Garnet & Gold Meet" intrasquad out |
| Beach Volleyball | `womens-beach-volleyball` | Fall tournaments (Oct 9-11) publish no result or story: not listed; spring fills when played |
| Track & Field | `womens-`, `mens-track-and-field` | 2027 indoor/outdoor schedules (upcoming) |
| Basketball | `mens-`, `womens-basketball` | Labeled; exhibitions labeled |
| Baseball, Softball, Lacrosse | | 2026-27 fall exhibitions and spring schedules |

## Florida State rules

- `combinedSports`: Basketball, Cross Country, Golf, Swimming & Diving, Tennis, Track & Field.
- Cross country, track and beach volleyball are on `womens-`/`mens-` pages; the generic pages are SIDEARM's empty template (`scripts/fetch-school-fixtures.mjs --prune` now moves such routes itself).
- `INTERNAL` adds "Garnet & Gold Meet".
- Golf: `floridaStateGolfStoryPlace` (headline "Seminoles Win/Finish Fifth", else a sentence naming the team with "placing/finished/tied for <place>"); a story dated before the last round is not the final story, and a golf final without place or story is not listed.
- Beach volleyball: a past tournament without score or story is not listed (with tennis's rule).

Every new rule was mutated and each mutation fails `node tests/florida-state-module.mjs`.

## Athletes

Pinned from the profile pages (Oct 15): Baseball, Golf, Soccer, Tennis (three each). Every other sport's roster or profiles publish enough Instagram (Beach Volleyball 16, Cross Country 26, Track & Field 51 on the team pages). No profile cards.

## Open

- Beach volleyball's spring season fills when played.
- First live cards not yet observed.
