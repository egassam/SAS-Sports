# Stanford school module

`src/schools/stanford.mjs` owns Stanford's gostanford.com sources, program combinations and verified Instagram pins. Its schedules are read by the shared WMT JSON-API reader `src/wmt-api-kit.mjs` (new October 15, 2026, generalized from Notre Dame's reader). The event/result contract, caching, display and generic parsing stay shared.

Stanford was added to the app on October 15, 2026 (19 sports, one PR with Syracuse). gostanford.com is a WMT (Nuxt) site whose schedule cards are a new generation (`schedule-event-item-team__opponent-name`); the cards come from the site's own JSON API (`/website-api/schedule-events`, sport ids from `/website-api/sports`), which the module reads directly (no card reader needed).

## Status (`4.93.0-stanford-syracuse`)

| Sport | API sport ids | State |
| --- | --- | --- |
| Football | 8 | Finals with stories; ACC games flagged by the site |
| Volleyball | 31 (women), 16 (men) | Labeled; women's finals with stories; men's 2027 not published (valid empty) |
| Soccer | 28 (women), 13 (men) | Labeled; finals with stories; exhibitions labeled (men's three August exhibitions have no story) |
| Field Hockey | 7 | Finals with stories; "W, 3-2 (OT)" |
| Water Polo | 17 (men), 32 (women) | Labeled; MPSF games (site conference 6) named MPSF; the "Cardinal & Black Intrasquad" is internal; women's 2027 not published |
| Cross Country | 4 | Team places with points ("Women's team: 1st · 18 pts (Open race)"); TFRRS `CA_college_*_Stanford` |
| Golf | 23 (women), 10 (men) | Labeled; each round is an API entry: a tournament's rounds within two days are one event with the last round's place ("4th of 13", "T14th of 16"); The Big Match is match play (W, 4-0) |
| Swimming & Diving | 29 (women), 14 (men) | Labeled; the College Swimming League's per-opponent entries are one meet per date ("1st of 4"); "No Team Score" reads "No team score (individuals only)" |
| Tennis | 30 (women), 15 (men) | Labeled; tournaments "Completed" with their stories; the men's ITA Regional (Oct 15-20) is today's event |
| Fencing | 6 | October NAC "Individual results" with its story |
| Rowing | 27 (women), 26 (lightweight), 12 (men) | Labeled Women's / Lightweight / Men's; fall races upcoming; men's 2026-27 not published |
| Wrestling, Basketball | 33; 9, 22 | Upcoming |
| Baseball, Softball, Beach Volleyball, Gymnastics (24, 11), Lacrosse, Track & Field | 2, 19, 3, 24/11, 25, 21 | Nothing published for 2026-27 yet (valid empty) |

Artistic Swimming, Sailing and Squash are on the site but not in the app's catalog.

## Rules (shared kit, `src/wmt-api-kit.mjs`)

- One API address per team; current academic year only; cancelled/postponed/hidden events and intrasquads/scrimmages out; exhibitions labeled.
- A past meet is listed with its place or its story; a past game needs a score.
- Meet entries without a score that share a tournament and follow within two days are merged (golf rounds, per-opponent swim entries).
- Conference games are the site's flags; a league other than the school's is named by the site's conference id (`conferenceNames`).
- Each final's story is its post-event article (or a "Recap" link), dated the day played or up to three days after.

Every new rule was mutated and each mutation fails `node tests/stanford-module.mjs`.

## Athletes

Pinned from the profile pages (Oct 15): Golf (Meja Örtengren, Leigh Chien, Anna Song; 9 of 18 profiles link Instagram), Water Polo (Konstantinos Mathiopoulos, Harrison Rohlen, Gavin West; Ryan Ohl's link is broken), Swimming & Diving (Charlotte Hook; 1 of 49). Profile cards (`athlete_profile_fallback_sports`): Beach Volleyball (20 profiles read), Cross Country (34), Fencing (27), Field Hockey (25), Football (113), Gymnastics (40), Lacrosse (35), Rowing (83), Swimming & Diving (49), Track & Field (69), Volleyball (38), Wrestling (31): those profiles link only the team accounts. Baseball, Basketball, Soccer, Softball and Tennis publish enough.

## Open

- Baseball, Softball, Beach Volleyball, Gymnastics, Lacrosse, Track & Field, men's Volleyball and Rowing, women's Water Polo fill when 2026-27 is published.
- First live cards not yet observed.
- Notre Dame could move onto the shared kit in its own session (same API).
