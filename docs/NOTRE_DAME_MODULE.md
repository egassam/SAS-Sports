# Notre Dame school module

`src/schools/notre-dame.mjs` owns Notre Dame's fightingirish.com schedule source, program combinations, verified Instagram pins and its own schedule reader. The event/result contract, caching, display and generic parsing stay shared.

Notre Dame was added to the app on October 15, 2026 (15 sports, one PR with North Carolina). fightingirish.com is a WMT (Nuxt) site whose schedule pages render no events: the page loads them from the site's own JSON API, `/website-api/schedule-events` (one sport id per team, from `/website-api/sports`). The module reads that API, the same official data the page shows: date and time (Eastern), venue (`home`/`away`/`neutral`), opponent, the conference flag (`is_conference`), the exhibition flag, the result (`win`/`loss`/`tie` with the winner's and loser's scores; a meet's text), its story (`post_event_article`) and links ("Recap"). Rosters render on the page and are read as usual.

## Status (`4.91.1-north-carolina-notre-dame`)

| Sport | Team ids | State |
| --- | --- | --- |
| Football | 8 | 6 finals with stories; independent (no conference record) |
| Volleyball | 22 | 15 finals with stories; exhibitions with no score are not listed |
| Soccer | 16 (women), 15 (men) | Labeled (two ESPN boards); finals with stories; ACC games from the site's flags |
| Hockey | 11 | Exhibitions labeled ("W, 2-1 (OT)"); Big Ten conference record (`conference_name`); the Big Ten Quarterfinals read "at". New to the catalog list for Notre Dame |
| Cross Country | 6 | Team places from the result text ("W - 2nd \| M - 1st"); TFRRS `IN_college_f/m_Notre_Dame_IN` |
| Golf | 9 (men), 10 (women) | Labeled; place and team score from the result text ("T-2nd, 839 (-13)"); field size not published |
| Tennis | 19 (men), 20 (women) | Labeled; tournaments with their "Recap" stories; pro events ("M15 Ann Arbor", "Sumter W15") not listed; women's ITA Midwest Regionals (Oct 8-12) has no story: not listed |
| Fencing | 7 | 2026-27 schedule; the October NAC (Oct 9-12) has no result or story: not listed |
| Swimming & Diving | 18 | 2026-27 schedule (upcoming) |
| Basketball | 4 (men), 5 (women) | Labeled; exhibitions labeled; Players Era 8 reads "at" |
| Baseball | 3 | Fall exhibitions upcoming; past ones publish no result (not listed) |
| Lacrosse | 12 (men), 13 (women) | Women's fall exhibitions upcoming; men's 2027 not published |
| Softball, Rowing, Track & Field | 17, 14, 21 | Nothing current yet (valid empty) |

## Notre Dame rules

- The latest 100 events of each team, newest first (`per_page=100&sort=-datetime`), kept from July 1 of the current academic year. Cancelled, postponed and hidden events are not listed.
- Times are Eastern; midnight, and an event the site marks all day or TBA, show the date only (the page shows any other stored time, even a tournament's creation time).
- A past game without a score is not listed (yesterday's stays); a past meet is listed with its result text or its story, else not.
- Relation: a game away, or named after a tournament (also when its opponent is its tournament's name), is "at"; a meet is "at" unless it is a single-day dual at home.
- Combined teams share one API address; `teamLabels` is keyed by the whole address (shared `teamLabelForSource` reads it).
- A final's story is the site's own (post-event article or "Recap" link on `/news/`), dated the day played to three days after.

Every rule was mutated; each mutation fails `node tests/notre-dame-module.mjs` (two rules the data never exercises were removed instead).

## Athletes

Pinned from the profile pages (Oct 15): Cross Country, Golf, Softball (three each). Baseball (37 profiles), Fencing (63), Football (112) and Swimming & Diving (56) publish no athlete Instagram: profile cards (`athlete_profile_fallback_sports`).

## Open

- Softball, Rowing, Track & Field, men's Lacrosse and Baseball's spring fill when 2026-27 is published.
- First live cards not yet observed.
