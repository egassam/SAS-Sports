# Miami school module

`src/schools/miami.mjs` owns Miami's miamihurricanes.com routes, program combinations, verified Instagram pins and its schedule-card reader. The event/result contract, caching, display and generic parsing stay shared.

Miami was added to the app on October 14, 2026 (11 sports, one PR with Virginia; the first ACC schools). The catalog lists CUSTOM; miamihurricanes.com is **WMT** with Iowa/Vanderbilt-style `schedule-item-block` cards (date in `schedule-event-date__day` with its full `datetime`, opponent in `schedule-event-item__opponent-name`, venue in `schedule-item-block__venue`), which Nebraska's reader already reads (`scripts/port-wmt.mjs --from=nebraska`). The site menu uses short codes (`cross`, `soc`, `swim`, `track`, `mbball`, `wten`, …).

## Status (`4.86.3-miami-virginia`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 5-0 (ACC 3-0) as published |
| Volleyball | `wvball` | 15 finals with stories; 7-8 (5-1) as published |
| Soccer | `soc` | 13 finals with stories; 8-3-2 (3-2-1) as published |
| Cross Country | `cross` | One card per meet; TFRRS (`FL_college_f/m_Miami_FL`, team "Miami (Fla.)"): Florida Intercollegiate W 4th / M 5th, FSU Pre-Regional W 3rd / M 8th, Joe Piane W 19th / M 18th |
| Golf | `golf` (women) | Places from the final stories' headlines (cards publish none): Boilermaker Classic 1st, Cougar Classic 5th, Golfweek Red Sky 2nd; no field size published |
| Swimming & Diving | `swim` | Ohio/UNF dual (Oct 2-3, two cards) one meet with its story |
| Tennis | `mten`, `wten` | Labeled; ITA All-American (both) and women's ITA Southeast Regional have no story (not listed); men's ITA Regional under way |
| Basketball | `mbball`, `wbball` | 2026-27 schedules upcoming (exhibitions labeled) |
| Baseball, Rowing, Track & Field | `baseball`, `wrow`, `track` | Pages still show 2025-26: valid empty schedules until published |

## Miami rules (beyond Nebraska's reader)

- **Golf story places** name Miami/Hurricanes/Canes; "Golf Takes Team (and Individual) Title(s)" is 1st.
- **Swimming:** cards of one name on consecutive days are one meet (the Ohio, UNF dual).
- **Back-to-back games against one team** (volleyball and UCLA, Sep 4 and 5, both 0-3, both stories dated Sep 5): a story whose opening names another weekday is that day's game's (Penn State's rule).
- **Cross country:** TFRRS names the team "Miami (Fla.)" (`tfrrsTeam`).
- **Conference games:** ACC membership (no card flags): "Pittsburgh" is Pitt; Notre Dame football is independent (`src/conference-games.mjs`).

Every rule was mutated and each mutation fails `node tests/miami-module.mjs` (the ACC rules fail `tests/season-records.mjs`).

## Athletes

Three featured athletes per sport. The roster cards link only the department's team accounts; the athletes' profile bios link Instagram **without a scheme** (`instagram.com/ruth_martinez_9`), read since 4.86.2 (shared fix). Pinned from the profile pages (Oct 14): Golf, Soccer, Tennis (three each; the roster's 24-profile budget did not reach them), Swimming & Diving (Emma Gullstrand). **Profile cards:** Swimming & Diving's other two slots (`athlete_profile_fallback_sports`): 1 of 25 profiles links an athlete account.

## Open

- Baseball, Rowing, Track & Field fill when 2026-27 is published.
- Golf shows the place without field size (neither cards nor headlines give it).
- First live cards not yet observed.

## Athletes from the NIL marketplace (October 16, 2026)

Source: INFLCR Exchange university-of-miami, linked from miamihurricanes.com/nil. On the preview (4.105.0), the sports that use profile cards: Swimming & Diving 1 of 3 with Instagram (0 from the marketplace). A slot still short keeps its official profile card, and the profile-card fallback stays listed (the athletes tried vary by day). Athletes connect these accounts themselves; the app uses one only for an athlete on the current official roster whose marketplace record names the same athlete and sport (`src/opendorse.mjs`, `src/inflcr.mjs`).
