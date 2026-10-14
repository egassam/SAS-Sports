# Rutgers school module

`src/schools/rutgers.mjs` owns Rutgers's scarletknights.com routes, program combinations, verified Instagram pins and its schedule reader (SIDEARM page data, Oklahoma's handlers). The event/result contract, caching, display and generic parsing stay shared.

Rutgers was added to the app on October 14, 2026 (16 sports, one PR with Purdue).

## Status (`4.83.0-purdue-rutgers`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 1-4 (Big Ten 0-2) as published |
| Volleyball | `womens-volleyball` | 18 finals with stories; 10-8 (1-5) as published |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; 4-5-4 (3-4-1) and 5-6-1 (3-3) as published |
| Field Hockey | `field-hockey` | 13 finals with stories; 7-6 (1-2) as published |
| Cross Country | `cross-country` | One card per meet; TFRRS (`NJ_college_f/m_Rutgers`): Lehigh W 1st / M 1st, Paul Short W 15th / M 26th, Nuttycombe W 8th / M 8th |
| Golf | `womens-golf`, `mens-golf` | Labeled; women's places from the cards (T7th, 14th, T4th, 3rd); men's from the final story (5th, T5th of 13, 3rd of 15, 2nd of 12); Doc Sauers is individuals only |
| Tennis | `womens-tennis` | Tournaments with their stories; the ITA All-Americans card links another tournament's story, so it is not listed |
| Swimming & Diving | `womens-swimming-and-diving` | Rutgers Preseason Invitational with its story |
| Basketball, Wrestling | `mens-`/`womens-basketball`, `wrestling` | 2026-27 schedules; men's exhibition vs Villanova with its story |
| Lacrosse | `womens-lacrosse`, `mens-lacrosse` | Labeled; fall games are exhibitions |
| Baseball, Softball, Rowing | `baseball`, `softball`, `womens-rowing` | Upcoming |
| Gymnastics, Track & Field | `womens-gymnastics`, `track-and-field` | Pages still show 2025-26: valid empty schedules until published |

## Rutgers rules (beyond Oklahoma's handlers)

- **Combined:** Basketball, Golf, Lacrosse, Soccer, Swimming & Diving (one page: women's).
- **Golf story places:** the cards publish no place for the men; the final story gives it ("Team Finishes 5th", "RU Finishes Tied for 5th Overall" with "the 13-team field", "Finishes in 3rd of 15 Teams", "Completes Stellar 2nd-Place Finish"). Only the story counts, not its "Related News" headlines.
- **Individuals-only golf** ("Doc Sauers Invitational (Individuals Only)") reads "No team score (individuals only)".
- **Tennis stories:** a story another tournament also links is kept only when a whole word of its address names the tournament ("ITA" is not in "bulldog-invitational").
- **Lacrosse fall ball:** games from August on are exhibitions (the men's page labels them; the women's play day does not).
- **Internal:** swimming's "Training Trip" (Jan 6-16).

Every rule was mutated and each mutation fails `node tests/rutgers-module.mjs`.

## Athletes

Three featured athletes per sport. Verified Instagram from profile pages: Basketball (14 of 30), Gymnastics (21 of 21), Soccer (24 of 94), Volleyball (22 of 36); pinned: Baseball (8 of 40), Rowing (10 of 54), Softball (7 of 24), Field Hockey (1 of 25). **Profile cards** (`athlete_profile_fallback_sports`): Field Hockey's other two slots, Cross Country (34 profiles, 0 links), Football (134, 0), Golf (16, 0), Lacrosse (88, 0), Swimming & Diving (27, 0), Tennis (10, 0), Track & Field (101, 0), Wrestling (30, 0).

## Open

- Gymnastics and Track & Field fill when 2026-27 is published.
- First live cards not yet observed.
