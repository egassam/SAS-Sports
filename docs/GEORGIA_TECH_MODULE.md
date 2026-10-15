# Georgia Tech school module

`src/schools/georgia-tech.mjs` owns Georgia Tech's ramblinwreck.com routes, program combinations, verified Instagram pins and its WMT card reader (Virginia's, ported with `scripts/port-wmt.mjs --from=virginia`). The event/result contract, caching, display and generic parsing stay shared.

Georgia Tech was added to the app on October 15, 2026 (10 sports, one PR with Florida State). ramblinwreck.com is a Nuxt WMT site read directly. Its sport pages use CSTV codes (`m-footbl`, `w-volley`, `m-baskbl`, `m-basebl`, `w-softbl`, `c-swim`, `m-xc`), now read by `scripts/onboard-school.mjs`.

## Status (`4.89.0-florida-state-georgia-tech`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `m-footbl` | 5 finals with stories |
| Volleyball | `w-volley` | 16 finals; Xavier and Oklahoma (Sep 6, 8) publish no story (result line shown) |
| Cross Country | `m-xc`, `w-xc` | Labeled; team places and points from the cards ("M: 2ND (39PTS)"), TFRRS races where published (Stan Sims, Georgia Tech Invitational; Southern Showcase is not on TFRRS) |
| Golf | `m-golf` | Places from the final stories: Folds of Honor 1st, OFCC/Fighting Illini 8th (818), Ben Hogan 12th |
| Tennis | `m-tennis`, `w-tennis` | Labeled; one card a day; the women's days take their own day's archive story |
| Swimming & Diving | `c-swim` | Emory dual with story; "White vs. Gold" intrasquad out; Atlanta Open Water Swim (no result or story) not listed |
| Basketball | `m-baskbl`, `w-baskbl` | Labeled; exhibition vs Maryland labeled |
| Baseball, Softball | | Fall exhibitions |
| Track & Field | `m-track`, `w-track` | Not published yet: valid empty until 2026-27 is posted |

## Georgia Tech rules

- Cards name both sides in `schedule-default-event__name` (Georgia Tech first); the opponent is read from `schedule-default-event__opponent-name`. No card conference flag: ACC games come from membership.
- A result written winner first ("L 3-0", volleyball vs Baylor) is turned to the team's score (0-3).
- A recap link with a box score's address pasted on (Nebraska volleyball, Sep 12) is cut back to the story.
- `INTERNAL` adds "White vs. Gold"; an away swimming event with no score or story is not listed.
- Golf places: `georgiaTechGolfPlace` (headline) and `georgiaTechGolfStoryPlace` (text: "finished/placed/tied for <place>" or "<place>-place finish" in a sentence naming the team).
- Tennis days: the day's own archive story first (words of the tournament's name other than shared ones, or the team on its own day; galleries are not stories).
- Cross country team places from the card text, then TFRRS.

Every new rule was mutated and each mutation fails `node tests/georgia-tech-module.mjs`.

## Athletes

Pinned from the profile pages (Oct 15): Golf, Tennis (three each). **Profile cards** (`athlete_profile_fallback_sports`): Cross Country (0 of 32 profiles publish Instagram), Swimming & Diving (0 of 44), Track & Field (0 of 59).

## Open

- Track & Field fills when 2026-27 is published.
- First live cards not yet observed.
