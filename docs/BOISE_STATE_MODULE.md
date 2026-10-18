# Boise State school module

`src/schools/boise-state.mjs` owns Boise State's broncosports.com routes, program combinations and its SIDEARM schedule handlers (ported from NC State's with `start-schools --from=nc-state`). The event/result contract, caching, display and generic parsing stay shared.

Boise State was added to the app on October 18, 2026 (11 sports, one PR with Colorado State), the first school of the new Pac-12 (2026-27: Boise State, Colorado State, Fresno State, Gonzaga, Oregon State, San Diego State, Texas State, Utah State, Washington State; all nine are in `src/schools.json`, only built schools are listed). broncosports.com is SIDEARM. Boise is in Idaho (`America/Boise`, Mountain time).

## Status (`4.109.0-boise-state-colorado-state`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | Finals with stories; Pac-12 games from the page data |
| Volleyball | `womens-volleyball` | Finals with stories; the page lists Middle Tennessee on Aug 28 and Aug 29 (both published); "Idaho State (Host)" reads Idaho State |
| Soccer | `womens-soccer` | Finals with stories |
| Cross Country | `cross-country` | Team places from TFRRS (`ID_college_*_Boise_State`); Dr. Thad Scholes Invitational (split squad, Oct 9) places from the card |
| Golf | `womens-golf`, `mens-golf` | Combined; place and team score with par from the cards ("8th, 892 (+28)", "2nd (840, -12)") |
| Tennis | `womens-tennis`, `mens-tennis` | Combined; tournaments "Completed" with stories |
| Beach Volleyball | `womens-beach-volleyball` | Tournaments are meets: the Alki AVCA Qualifier (Oct 3-4) takes its Oct 4 archive story; no Pac-12 record (the Pac-12 does not sponsor it) |
| Basketball | `mens-basketball`, `womens-basketball` | Combined; men's exhibitions labeled |
| Softball | `softball` | Fall exhibitions labeled; the May 12 "Pac-12 Championship" duplicate card is dropped (the tournament's own card stays) |
| Gymnastics | `womens-gymnastics` | 2027 not published yet (the page is the 2026 season): valid empty |
| Track & Field | `track-and-field` | Only the MPSF Indoor (Feb 26) published |

## Rules

- Opponent "(Host)" note dropped (module).
- Golf: place, team score and score to par in either order of brackets (module).
- Beach volleyball tournaments read archive stories like tennis (module `meetSports`, `event_type` MEET).
- Softball: a one-day card naming the same tournament on the day a multi-day card starts is dropped.

Every new rule was mutated and each mutation fails `node tests/boise-state-module.mjs`.

## Athletes

Roster profiles link athlete Instagram for Basketball (15 of 31), Football (113 of 115), Gymnastics (17 of 18) and Soccer (all). broncosports.com links no NIL marketplace (homepage checked Oct 18). Profile cards (`athlete_profile_fallback_sports`): Beach Volleyball (17 profiles, none), Cross Country (28, none), Golf (17), Softball (25), Tennis (18), Track & Field (78), Volleyball (28): no athlete Instagram published.

## Open

- Gymnastics and Track & Field fill when 2026-27 is published.
- First live cards not yet observed (soccer at Colorado State Oct 22, volleyball vs Utah State Oct 22, football at Washington State Oct 24).
