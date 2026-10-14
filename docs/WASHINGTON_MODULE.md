# Washington school module

`src/schools/washington.mjs` owns Washington's gohuskies.com routes, program combinations, verified Instagram pins and its schedule reader (SIDEARM page data, Oklahoma's handlers). The event/result contract, caching, display and generic parsing stay shared.

Washington was added to the app on October 14, 2026 (13 sports, one PR with Wisconsin).

## Status (`4.85.0-washington-wisconsin`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 6 finals with stories; 3-3 (Big Ten 0-3) as published |
| Volleyball | `womens-volleyball` | 17 finals with stories (two exhibitions); 13-2 (4-2) as published |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; 11-1-2 (6-1-1) and 7-3-2 (4-1-1) as published; the women's Penn State win (Oct 11) and men's Cal State Fullerton draw (Sep 3) link no story (the archive's when it has one) |
| Cross Country | `cross-country` | TFRRS: McNichols W 6th / M 3rd, Loyola Lakefront M 11th, Nuttycombe W 16th / M 24th |
| Golf | `womens-golf`, `mens-golf` | Labeled; place and total from the cards ("T-8th (+24, 888)", "3rd, 890 (+26)"); the cards publish no field size |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; tournaments with their stories |
| Softball | `softball` | Fall exhibitions with their scores (out of the record) |
| Basketball, Swimming & Diving, Track & Field | | 2026-27 schedules upcoming |
| Baseball, Beach Volleyball, Gymnastics, Rowing | | Pages still show spring 2026: valid empty schedules until published |

## Washington rules (beyond Oklahoma's handlers)

- **Combined:** Basketball, Golf, Soccer, Swimming & Diving, Tennis.
- **Golf card places:** "T-8th (+24, 888)" (women's), "3rd, 890 (+26)" (men's).

Every rule was mutated and each mutation fails `node tests/washington-module.mjs`.

## Athletes

Three featured athletes per sport. Verified Instagram from profile pages for Baseball, Basketball, Cross Country, Football, Rowing, Soccer, Softball, Track & Field; pinned: Golf (8 of 14), Gymnastics (10 of 18), Tennis (8 of 17), Volleyball (12 of 30). **Profile cards:** Beach Volleyball (the roster read no profile pages).

## Open

- Baseball, Beach Volleyball, Gymnastics and Rowing fill when 2026-27 is published.
- First live cards not yet observed.
