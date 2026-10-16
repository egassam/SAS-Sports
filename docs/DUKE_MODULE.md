# Duke school module

`src/schools/duke.mjs` owns Duke's goduke.com routes, program combinations, verified Instagram pins and its SIDEARM schedule reader (Oklahoma's handlers, `scripts/port-handlers.mjs`). The event/result contract, caching, display and generic parsing stay shared.

Duke was added to the app on October 15, 2026 (16 sports, one PR with Clemson). goduke.com is a Nuxt SIDEARM site read directly (it answers 403 only to a browser-like user agent from the sandbox).

## Status (`4.88.1-clemson-duke`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories |
| Volleyball | `womens-volleyball` | 16 finals with stories |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled (combined) |
| Field Hockey | `field-hockey` | 13 finals with stories |
| Cross Country | `cross-country` (both teams) | TFRRS (`NC_college_f/m_Duke`) places per team |
| Golf | `womens-golf`, `mens-golf` | Labeled. Places from the cards ("3rd of 12", "T8th of 12"); Windy City Classic from its story headline ("Blue Devils Place T2", `dukeGolfStoryPlace`) |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; tournaments with stories |
| Swimming & Diving | `swimming-and-diving` | Meets with stories; "Blue/White Week" intrasquad out |
| Basketball | `mens-`, `womens-basketball` | Labeled; exhibitions labeled |
| Fencing, Rowing, Wrestling, Lacrosse (both), Softball | | 2026-27 fall/upcoming events |
| Baseball, men's Lacrosse, Track & Field | | Pages still show last season: valid empty schedules until published |

## Duke rules

- `combinedSports`: Basketball, Golf, Lacrosse, Soccer, Swimming & Diving, Tennis (two team pages each).
- `INTERNAL` adds "Blue/White" (swimming's intrasquad week, Sep 13-20).
- Golf story-headline places (`dukeGolfStoryPlace`), the team's clause after a player's ("…; Blue Devils Place T2 at …").

Every new rule was mutated and each mutation fails `node tests/duke-module.mjs`.

## Athletes

Pinned from the profile pages (Oct 15): Baseball, Basketball, Fencing, Golf, Rowing, Tennis (three each). **Profile cards** (`athlete_profile_fallback_sports`): Field Hockey (2 of 25 profiles publish Instagram), Softball (2 of 22), Volleyball (2 of 17): two pinned plus one profile card each.

## Open

- Baseball, men's Lacrosse, Track & Field fill when 2026-27 is published.
- First live cards not yet observed.

## Athletes from the NIL marketplace (October 16, 2026)

Source: INFLCR Exchange duke-university (goduke.com/feature/nil). On the preview (4.105.0), the sports that use profile cards: Field Hockey 3 of 3 with Instagram (1 from the marketplace); Softball 2 of 3 with Instagram (0 from the marketplace); Volleyball 3 of 3 with Instagram (1 from the marketplace). A slot still short keeps its official profile card, and the profile-card fallback stays listed (the athletes tried vary by day). Athletes connect these accounts themselves; the app uses one only for an athlete on the current official roster whose marketplace record names the same athlete and sport (`src/opendorse.mjs`, `src/inflcr.mjs`).

**Production `4.105.2`, October 16 (after forced refreshes):** the marketplace supplies athletes in Field Hockey and Volleyball; Field Hockey and Volleyball now show three with Instagram. Still short of three (profile cards fill the rest): Softball (2 of 3). Counts vary from day to day with the roster athletes tried, so the profile-card fallback list is unchanged.
