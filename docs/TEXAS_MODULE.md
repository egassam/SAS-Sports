# Texas school module

`src/schools/texas.mjs` owns Texas's texaslonghorns.com schedule and roster routes, its program combinations, its verified Instagram identities and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Texas was added to the app and converted on October 8, 2026, together with Texas A&M (user: "Onboarding of Texas and Texas A&M. Learn and optimize for increased speed."). All 13 sports were converted and tested one at a time and published in one PR (#252). The module is Tennessee's SIDEARM reader, copied with `scripts/port-handlers.mjs`, plus Texas's rules below. The site's nav links name sports without `/schedule`, so `add-school` was given the sports with `--sports=`.

## Status (`4.64.1-texas-texas-am`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 4 finals, each with its story; record 4-0 (SEC 1-0); ESPN live score |
| Volleyball | `womens-volleyball` | 12 finals, each with its story; 7-5 (3-1); ESPN live score |
| Soccer | `womens-soccer` | 12 finals, each with its story; 7-2-3 (2-1-2); ESPN live score |
| Cross Country | `track-and-field` (fall meets) | 4 finals; both teams' places and points from TFRRS (`TX_college_f_Texas`, `TX_college_m_Texas`); Chile Pepper (not yet on TFRRS) shows the schedule's places |
| Golf | `mens-golf`, `womens-golf` | Labeled. Place in the field and team score (`T2nd of 14`, `839`); Stephens Cup match play as games |
| Tennis | `mens-tennis`, `womens-tennis` | Labeled. ITA All-American with its story; the players' ITF pro events left out |
| Swimming & Diving | `mens-swimming-and-diving`, `womens-swimming-and-diving` | Labeled; Dust Off Your Boots with each team's story |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; upcoming; ESPN live scores |
| Baseball, Softball | `baseball`, `softball` | 2027 seasons; fall games exhibitions; ESPN live scores |
| Beach Volleyball | `wbvball` | Fall exhibitions upcoming |
| Track & Field | `track-and-field` (Dec-Jul) | No spring meet published yet: a valid empty schedule |
| Rowing | `womens-rowing` | The page still lists 2025-26; fills when published |

Records: Texas's pages publish none; the computed ones were checked against the finals by hand.

## Texas rules (beyond Tennessee's)

- **One page, two sports:** "Track & Field / Cross Country". Meets in August-November are Cross Country, the rest Track & Field; track's schedule is validly empty while only fall meets are listed.
- **Golf result:** the place in the field, then the team score in brackets: `T-2nd of 14 (839)`.
- **Two polls:** `#1/1 Ohio State`, `#19/14 TCU` are rankings.
- **ITF events** on the women's tennis page (`ITF Berkley W50`) are the players' pro events, not the team's.

Each rule was mutated, and every mutation fails `npm run test:texas-module`.

## Athletes

Certification lists all 13 sports (minimum 3). On October 8, every roster and profile page was read through the private source (`scripts/athlete-evidence.mjs`). Basketball (10 of 29 profiles), Softball (5 of 24) and Volleyball (11 of 16) are pinned in `verifiedInstagrams`. Cross Country and Track & Field (80 profiles), Golf (17), Rowing (67), Swimming & Diving (50) and Tennis (20) publish no athlete Instagram, so official profile cards fill them (`athlete_profile_fallback_sports`). Team-account tags could not be read: instagram.com answers the sandbox with its login page.

## Limitations

- Rowing and Track & Field fill when texaslonghorns.com publishes 2026-27 meets.
- Golf's Bayou City Collegiate Classic was individuals only ("Completed", with its story).
- No live card observed yet.
