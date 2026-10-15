# NC State school module

`src/schools/nc-state.mjs` owns NC State's gopack.com routes, program combinations, verified Instagram pins and its SIDEARM schedule reader (Oklahoma's handlers, `scripts/port-handlers.mjs`). The event/result contract, caching, display and generic parsing stay shared.

NC State was added to the app on October 15, 2026 (13 sports, one PR with Louisville). gopack.com is a Nuxt SIDEARM site, read through the private source.

## Status (`4.90.0-louisville-nc-state`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 6 finals; two link the site's "From the Field" game stories (the page's own links) |
| Volleyball | `womens-volleyball` | 17 finals with stories |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; finals with stories |
| Cross Country | `cross-country` | TFRRS `NC_college_f/m_North_Carolina_St`; Adidas XC Challenge from the card ("Women: 1st place (21 points)"), Joe Piane from TFRRS (1st 39 / 3rd 110); Dill Family Foundation Invitational (Oct 2) has no result, story or TFRRS race: not listed |
| Golf | `womens-golf`, `mens-golf` | Labeled. Women's cards "13th/18 (+21)" (place and score to par) and match play "finished 2nd/4 teams"; tournament names without the course ("Cougar Classic (Yeamans Hall Club)"); men's NB3 Matchplay 2nd from its final story |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; tournaments with stories; ITA Carolina Regional under way |
| Swimming & Diving | `swimming-and-diving` | College Swimming League with its story |
| Wrestling | `wrestling` | 2026-27 schedule (upcoming) |
| Basketball | `mens-`, `womens-basketball` | Labeled; exhibitions labeled |
| Baseball, Softball, Gymnastics, Track & Field | | 2026-27 pages not published yet (valid empty) |

## NC State rules

- `combinedSports`: Basketball, Golf, Soccer, Swimming & Diving, Tennis.
- Opponents through the kit's `institutionShortName` ("University of Virginia", "Stony Brook University").
- Golf card formats above; a card without a place takes it from the final story (kit `createGolfStoryPlace`, team pattern Wolfpack/Pack/NC State/Men's or Women's Golf); a golf final without place or story is not listed.
- A past rowing or cross country meet with no result line, story or TFRRS race is not listed (with tennis's rule).
- The home-tournament name rule reads "NC State( University| Wolfpack)".

Every new rule was mutated and each mutation fails `node tests/nc-state-module.mjs`.

## Athletes

Pinned from the profile pages (Oct 15): Softball, Tennis (three each). Gymnastics' 21 profiles publish no Instagram: profile cards (`athlete_profile_fallback_sports`). Every other sport's roster or profiles publish enough Instagram.

## Open

- Baseball, Softball, Gymnastics, Track & Field fill when 2026-27 is published.
- First live cards not yet observed.
