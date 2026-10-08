# Tennessee school module

`src/schools/tennessee.mjs` owns Tennessee's utsports.com schedule and roster routes, its program combinations, its verified Instagram identities and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Tennessee was added to the app and converted on October 8, 2026, together with Missouri (user: "Add Missouri and Tennessee. Learn and optimize for faster onboarding"). All 12 sports were converted and tested one at a time and published in one PR (#250). The module is Mississippi State's SIDEARM reader, copied with `scripts/port-handlers.mjs`, plus one Tennessee golf rule. utsports.com sends the sandbox into a redirect loop (HTTP 307), so the fixtures came through the private source route. They are the official pages, unmodified.

## Status (`4.63.0-missouri-tennessee`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals, each with its story; record 4-1 (SEC 1-1) as published; ESPN live score |
| Volleyball | `womens-volleyball` | 13 finals, each with its story; 10-3 (1-2) as published; ESPN live score |
| Soccer | `womens-soccer` | 11 finals, each with its story; 6-2-3 (1-2-2) as published; ESPN live score |
| Cross Country | `cross-country` | 2 finals with both teams' places and points from TFRRS (`TN_college_f_Tennessee`, `TN_college_m_Tennessee`) |
| Golf | `mens-golf`, `womens-golf` | Labeled. Place in the field and team score (`2nd of 18`, `846 (-6)`), from the last round, with the final story |
| Tennis | `mens-tennis`, `womens-tennis` | Labeled. Tournaments with a story (Rocky Top Invite, Louisville Invitational). The ITA All-American and the players' M15 pro events have no story and stay out of the feed |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; upcoming; ESPN live scores |
| Baseball, Softball | `baseball`, `softball` | 2027 spring season; ESPN live scores |
| Swimming & Diving | `swimming-and-diving` | One page for both teams (the men's and women's addresses are SIDEARM's empty template) |
| Track & Field | `track-and-field` | 2026-27 season published; upcoming |
| Rowing | `womens-rowing` | The page still lists 2025-26; fills when published |

## Tennessee rules (beyond Mississippi State's)

- **Golf result:** the team score, then the place in the field without a suffix: `846 (-6)` and `2/18`, or `T-3/18`. The last round's values are final.
- **Routes:** `fetch-school-fixtures --prune` dropped the homepage, the empty templates and the duplicate addresses (`wsoc`, `wvball`). Golf and Tennis are men's and women's pages, so they are combined; Swimming & Diving is one page.

Each rule was mutated, and every mutation fails `npm run test:tennessee-module`.

## Athletes

Certification lists all 12 sports (minimum 3). On October 8, every roster and profile page was read through the private source (`scripts/athlete-evidence.mjs`, 608 pages). Softball (3 of 22 profiles) and Volleyball (3 of 17) publish few links, so their athletes are pinned in `verifiedInstagrams`. Baseball publishes 2 of 37: both are pinned, and official profile cards fill the third slot (`athlete_profile_fallback_sports`). Team-account tags could not be read: instagram.com answers the sandbox with its login page.

## Limitations

- Rowing fills when utsports.com publishes 2026-27.
- Women's tennis has no final shown yet (the ITA All-American has no story).
- No live card observed yet.
