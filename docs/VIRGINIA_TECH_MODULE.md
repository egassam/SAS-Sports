# Virginia Tech school module

`src/schools/virginia-tech.mjs` owns Virginia Tech's hokiesports.com sources, program combinations and verified Instagram pins. Its schedules are read by the shared WMT JSON-API reader `src/wmt-api-kit.mjs`. The event/result contract, caching, display and generic parsing stay shared.

Virginia Tech was added to the app on October 15, 2026 (13 sports, 17 teams, one PR with Wake Forest). hokiesports.com is a WMT (Nuxt) site with the same JSON schedule API as Stanford and Notre Dame (`/website-api/schedule-events`, sport ids from `/website-api/sports?per_page=100`; without `per_page` the list stops at 15). The module was written by the new `scripts/port-wmt-api.mjs` (run by `start-schools`) from the site's own sport list: no card reader.

## Status (`4.94.0-virginia-tech-wake-forest`)

| Sport | API sport ids | State |
| --- | --- | --- |
| Football | 3 | Finals with stories |
| Volleyball | 13 | Finals with stories; the Hokie Invitational's matches between two other teams (Aug 28-29) are not listed |
| Soccer | 16 (women), 8 (men) | Labeled; finals with stories |
| Cross Country | 2 | Team places ("Women's team: 1st · 17 pts"); TFRRS `VA_college_*_Virginia_Tech` |
| Golf | 15 (women), 7 (men) | Labeled; "1st/18 (286-278-280)" reads "1st of 18" with the team score 844 (286-278-280) |
| Swimming & Diving | 11 | Oct 2 tri-meet (Penn State, Liberty, West Virginia entries) is one meet with each opponent's result and its Oct 3 story; SMU Classic team places; Hokie Belt Challenge (intrasquad, Maroon vs Orange) not listed |
| Tennis | 17 (women), 9 (men) | Labeled; women's ITA Regional (Oct 15-19) is today's event |
| Basketball, Wrestling, Softball | 14/6, 18, 10 | Upcoming (softball's fall games). Wrestling's roster is a card grid whose link wraps the whole card ("Chris Bacchioni 149 lbs Senior"): the shared roster reader now takes the card's `roster-card-item__title` (no athletes were shown before) |
| Baseball, Lacrosse (women's), Track & Field | 1, 5, 12 | Nothing published for 2026-27 yet (valid empty) |

## Rules (shared kit, new October 15)

- A neutral game with a second opponent in a game sport is a match between two other teams in a tournament the school hosts: not listed.
- Merged meet entries keep each entry's result, by opponent, and take a story dated within the meet's days (to three days after); another season's story is not taken.
- Golf "Nth/M (r1-r2-r3)": the place in the field and the summed rounds.
- `internal` (module config): the school's own intrasquad by name.

Every new rule was mutated and each mutation fails `node tests/virginia-tech-module.mjs`.

## Athletes

Pinned from the profile pages: Tennis (Gevorg Mnatsakanyan, Patrik Jurina, Nicolas Iantosca; 10 of 21 profiles link Instagram). Profile cards (`athlete_profile_fallback_sports`): Lacrosse (40 profiles of the 2027 roster link none; the four handles on the 2026 roster page belong to graduates: Keelin Byrne, Lauren Render, Caroline Little, Molly Re) and Swimming & Diving (54 profiles, none). Every other sport publishes enough.

## Open

- Baseball, Lacrosse, Track & Field fill when 2026-27 is published.
- First live cards not yet observed (football vs Georgia Tech Oct 17; volleyball and soccer vs Virginia Oct 16).
