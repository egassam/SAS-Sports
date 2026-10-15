# North Carolina school module

`src/schools/north-carolina.mjs` owns North Carolina's goheels.com routes, program combinations, verified Instagram pins and its SIDEARM schedule reader (NC State's handlers, ported with `scripts/port-handlers.mjs`). The event/result contract, caching, display and generic parsing stay shared.

North Carolina was added to the app on October 15, 2026 (17 sports, one PR with Notre Dame). goheels.com is a SIDEARM site that refuses the sandbox (403); it is read through the private source.

## Status (`4.91.0-north-carolina-notre-dame`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; the ACC Championship (Dec 5) reads "at" |
| Volleyball | `womens-volleyball` | 14 finals with stories |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled (two ESPN boards); finals with stories; Shelbourne FC exhibition has a score, no story |
| Field Hockey | `field-hockey` | 12 finals with stories |
| Cross Country | `cross-country` | Team places and points from the cards (Virginia Invitational 1st/1st, Princeton Meadows 2nd/5th); TFRRS `NC_college_f/m_North_Carolina` |
| Golf | `womens-golf`, `mens-golf` | Labeled. The cards publish no place: each final takes it from its story (ANNIKA 8th, Mason Rudolph 8th, Knoxville T3rd, Sahalee T6th, Colonial T3rd from the archive, Fighting Irish Classic 4th) |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; tournaments with stories (Kitty Harrison and Milwaukee share one weekend story); ITA Regionals under way |
| Swimming & Diving | `swimming-and-diving` | Queens dual from the card ("M: 149-108 \| W: 156-101" → each team's W); U.S. Diving Nationals reads "at" |
| Fencing | `fencing` | One event per multi-day meet (October NAC, Oct 9-11, with its story) |
| Wrestling | `wrestling` | 2026-27 schedule (upcoming); the Blue and White Showcase (intrasquad) is not listed |
| Basketball | `mens-`, `womens-basketball` | Labeled; exhibitions labeled ("Southern California (Preseason)" and "Davidson - Exhibition" read as "(Exhibition)") |
| Lacrosse | `womens-lacrosse`, `mens-lacrosse` | Labeled; women's fall exhibitions upcoming; men's 2027 not published |
| Softball | `softball` | Fall exhibitions upcoming |
| Baseball, Gymnastics, Rowing, Track & Field | | 2026-27 pages not published yet (valid empty) |

## North Carolina rules

- `combinedSports`: Basketball, Golf, Lacrosse, Soccer, Swimming & Diving, Tennis.
- Golf story places through the kit's `createGolfStoryPlace`, team pattern `(?:Tar Heels|North Carolina(?!['’]s)|UNC)`: "North Carolina's Reagan Southerland tied for eighth" is a player's place, not the team's. Shared changes made for these stories (every school with the kit benefits): the story starts at its byline when it has no dateline (a page title such as "... In The ANNIKA - University of ..." is not one); "to place eighth" and "into a tie for third" are read; a place written "4th" (no tie mark) is read (it used to need "T-4th"); "tied for third" keeps its tie mark (the word "third" began with T and lost it); the summary is read to its own closing quote and ends before the story; a headline crediting players ("Round Of The Day Leads UNC To 4th-Place Finish") gives the place when the text does not.
- Swimming duals written with team letters ("M: 149-108 | W: 156-101"); the result letter is optional and never swallows a digit.
- Fencing merges its day cards into one meet (as tennis and wrestling).
- Opponent cleanup: "(Preseason)", "- Exhibition"; football's "ACC Championship" and swimming's "Nationals" read "at"; "Blue and White" is internal.

Every new rule was mutated and each mutation fails `node tests/north-carolina-module.mjs`.

## Athletes

Pinned from the profile pages (Oct 15): Baseball, Cross Country, Field Hockey, Golf, Gymnastics, Softball (three each; their rosters link 12 or fewer). Every other sport's roster or profiles publish enough Instagram.

## Open

- Baseball, Gymnastics, Rowing, Track & Field, men's Lacrosse fill when 2026-27 is published.
- First live cards not yet observed.
