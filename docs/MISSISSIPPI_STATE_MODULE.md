# Mississippi State school module

`src/schools/mississippi-state.mjs` owns Mississippi State's hailstate.com schedule and roster routes, its program combinations, its verified Instagram identities and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Mississippi State was added to the app and converted on October 7-8, 2026, together with Ole Miss. All 10 sports were converted and tested one at a time and published in one PR. The module is Georgia's reader (copied from `const HOST=` down by script) with Mississippi State's routes and the rules below. hailstate.com refuses the sandbox (HTTP 403), so fixtures came through the private source route; they are the official pages, unmodified.

## Status (`4.62.0-ole-miss-mississippi-state`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals, each with its story (the site reuses its "Game Day" addresses for recaps); record 4-1 (SEC 2-1) as published; ESPN live score |
| Volleyball | `womens-volleyball` | 14 finals, each with its story (two from the archive); 11-3 (1-2) as published; ESPN live score |
| Soccer | `womens-soccer` | 12 finals, each with its story; 7-1-4 (1-0-4) as published; the cancelled Arkansas State match is left out; ESPN live score |
| Cross Country | `cross-country` | Women only. Southern Showcase confirmed by TFRRS (`Women's team: 5th · 163 pts`); the Chile Pepper Festival (Oct 3) shows the schedule's `2nd` until TFRRS publishes it |
| Golf | `mens-golf`, `womens-golf` | Labeled. One event per tournament with its final place (`T6th`, `1st`); each final has its story (the Cullan Brown's from the archive) |
| Tennis | `mens-tennis`, `womens-tennis` | Labeled. Tournaments take their story from the schedule or archive; one without a story (Milwaukee Classic, two ITF pro events) is left out of the feed |
| Softball | `softball` | Fall exhibitions read `(Exhibition)` and count in no record; ESPN live scores |
| Basketball, Baseball | | Upcoming; ESPN live scores |
| Track & Field | `track-and-field` | The page still lists 2025-26; fills when published |

## Mississippi State rules (beyond Georgia's)

- **Golf rounds** name no tournament; the opponent names it, so rounds merge into one event.
- **Golf place** is the standing after the final round (`t6th after final rd.`, `3rd After Final Round`); `Team Champions` is `1st`. After a cancelled final round ("Final Round Canceled, Second Round Scores Become Final", The Ally) the round before's standing is final.
- **Golf archive stories**, as Ole Miss's, only when dated on or after the last round.
- **Tennis:** a sentence in the result field ("Bulldogs earn 2 Singles, 1 Doubles Win") is not a result; the event reads `Completed` with its story.
- **Volleyball archive stories:** a story that gives only the set scores (25-22, 25-20, 28-26 for 0-3 at Texas A&M) is the match's story (kit option `volleyballSetScores`, on for both Mississippi schools only).
- **Cross country:** TFRRS names the team `Miss State`; there is no men's team.

Each rule was mutated, and every mutation fails `npm run test:mississippi-state-module`.

## Athletes

Certification lists all 10 sports (minimum 3). On October 7 every roster and profile page was read through the private source (`scripts/athlete-evidence.mjs`, 373 pages): every sport but Baseball publishes 10 or more athlete links. Baseball uses official profile cards (`athlete_profile_fallback_sports`): none of its 41 profiles publishes one.

## Limitations

- Chile Pepper Festival cross country team points wait on TFRRS.
- Track & Field, Baseball and Basketball fill as their seasons start or are published.
- No live card observed yet (volleyball vs Georgia Oct 9).
