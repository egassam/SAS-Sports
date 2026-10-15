# Clemson school module

`src/schools/clemson.mjs` owns Clemson's clemsontigers.com routes, program combinations and its WMT schedule-card reader (ported from Auburn's: `scripts/port-wmt.mjs --from=auburn`). The event/result contract, caching, display and generic parsing stay shared.

Clemson was added to the app on October 15, 2026 (13 sports, one PR with Duke). clemsontigers.com is a **Nuxt WMT site, a sixth card generation**: `schedule-event-item` cards whose day reads "Sat, Sep 5" in `schedule-event-date__time` with **no `datetime`** (the year follows from the page title's season), the venue as text in `schedule-event-date__venue-type` ("away", "home", "neutral"), the opponent in `strong.schedule-event-default__name`, the result in `schedule-event-item-result__label` ("W Win 22-7") and meet text in `__text` ("13TH of 18", "COMPLETED"). Read directly (no private source).

## Status (`4.88.1-clemson-duke`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 3-2 (ACC 2-1), equal to the page |
| Volleyball | `volleyball` | 18 finals with stories; 6-12 (ACC 0-6), equal to the page. "Orange vs. Purple" intrasquad out |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; 6-3-4 (ACC 2-2-2) and 10-2-1 (ACC 4-1), equal to the pages |
| Cross Country | `cross-country` (both teams) | Team places from the cards ("Men - 1st | Women - 2nd"), then full races from TFRRS (`SC_college_f/m_Clemson`, `onlyMeetThatDay`: TFRRS's "Eye Opener XC Meet" is the card's "USC Upstate Eyeopener"); all three meets verified |
| Golf | `womens-golf`, `mens-golf` | Labeled. Men's cards name the host ("Toledo") with the course in the location: the tournament is the card's titled wrapper ("Inverness Intercollegiate"); men's places from the cards ("13TH of 18"). Women's cards publish no place: story headline (Tiger Classic "Co-Champions" T1st, Cougar Classic 9th, Mason Rudolph 10th). Men's Barbara Nicklaus Cup has no place or story: not listed |
| Gymnastics | `gymnastics` | 2027 schedule; a quad meet's per-opponent cards under one titled wrapper on one day are one event ("at Sprouts Farmer Market Collegiate Quad"); "Team Showcase" out |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; pro events out (ITF "W35"/"M15", ATP "Challenger", UTR PTT); past tournaments without a story not listed; neutral tournaments read "at" |
| Rowing | `rowing` | Fall heads ("at Princeton Chase") |
| Basketball | `mens-basketball`, `w-basketball` | Labeled; the men's Italy tour (Jul 29-Aug 4) and exhibitions labeled |
| Baseball, Softball, Lacrosse | | Upcoming fall games and exhibitions, labeled ("Softball 2026 Fall Schedule" read as the fall) |
| Track & Field | `track-field` | Page still shows 2025-26: a valid empty schedule until published |

Women's basketball's page is `w-basketball` (a `w-` prefix): `add-school`/`port-wmt` missed it and now read `w-`/`m-` prefixes (`scripts/onboard-school.mjs` `inferSport`).

## Clemson rules

- Days without `datetime`: "Sat, Sep 5" (weekday optional), year from the title ("Football 2026-27"; "Softball 2026 Fall Schedule" is the fall).
- Venue from the date box text; a meet at a neutral site, a quad meet, a tournament or a meet named as an event reads "at".
- Golf tournament name from the titled wrapper only when the card's location names a course ("City / Course").
- Gymnastics quad meets merged; internal events (`INTERNAL`: intrasquad, scrimmage, "Orange vs. Purple", "Team Showcase") out; pro tennis events out (`PRO_EVENT` + "Challenger").
- Conference games by ACC membership (cards carry no conference flag). Clemson writes "Miami (Fla.)": the shared ACC names now read it (`src/conference-games.mjs`), which corrected football to 2-1 and volleyball to 0-6.

Every new rule was mutated and each mutation fails `node tests/clemson-module.mjs`.

## Athletes

Rosters publish athlete Instagram on most profile pages (Baseball 41 of 41, Football 109 of 122, every sport at least 14): no pins or profile cards needed.

## Open

- Track & Field fills when 2026-27 is published.
- First live cards not yet observed.
