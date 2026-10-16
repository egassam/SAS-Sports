# USC school module

`src/schools/usc.mjs` owns USC's usctrojans.com routes, program combinations, verified Instagram pins and its schedule reader (SIDEARM page data, Oklahoma's handlers). usctrojans.com is read through the Worker's private source. The event/result contract, caching, display and generic parsing stay shared.

USC was added to the app on October 14, 2026 (14 sports, one PR with UCLA).

## Status (`4.84.2-ucla-usc`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 7 finals with stories; 6-1 (Big Ten 3-1) as published |
| Volleyball | `womens-volleyball` | 18 finals with stories (two exhibitions); 8-8 (2-4) as published |
| Soccer | `womens-soccer` | 14 finals with stories; 1-8-5 (0-5-3) as published |
| Water Polo | `mens-water-polo`, `womens-water-polo` | Labeled; 15 finals with stories; 13-2 (MPSF 1-1) as published |
| Cross Country | `cross-country` (women) | TFRRS: Pepperdine W 2nd, UC Riverside ("UCR XC Invite") W 11th, Master's W 9th |
| Golf | `womens-golf`, `mens-golf` | Labeled; places from the final stories' headlines (2nd, 1st; T5th, 3rd, 2nd) |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; tournaments with stories; UTR Pro Fall Slam, Hall of Fame Invite, Sherwood, UCSB Classic have none (not listed) |
| Swimming & Diving | `womens-`/`mens-swimming-and-diving` | Labeled; TCU dual W 228-86 and W 239-76 |
| Basketball | `mens-`/`womens-basketball` | 2026-27; men's exhibition vs North Carolina with its story |
| Baseball, Beach Volleyball, Lacrosse, Rowing, Track & Field | | Pages still show spring 2026: valid empty schedules until published |

## USC rules (beyond Oklahoma's handlers)

- **Combined:** Basketball, Golf, Swimming & Diving, Tennis, Water Polo.
- **Empty template:** a season not yet published is SIDEARM's `@season @sport Schedule` page (beach volleyball): a valid empty schedule (Oregon's rule; the first preview answered 502).
- **Golf story places:** "USC Men's Golf Ties for Fifth", "Finishes in Third", "Places Second", "Wins the …".
- **TFRRS:** a meet TFRRS names past recognition ("UCR XC Invite") is the team's only meet that day (`onlyMeetThatDay`, a new opt-in in `createTfrrsMeetResults`).
- **Water polo:** MPSF (`conference_name`); the page data marks its league games.

Every rule was mutated and each mutation fails `node tests/usc-module.mjs`.

## Athletes

Three featured athletes per sport. Verified Instagram for Basketball (15 of 26) and Football (28 of 129); pinned: Golf (9 of 17), Water Polo (6 of 44), Rowing (2 of 47), Swimming & Diving (2 of 56). Beach Volleyball is not in the athlete list until its 2027 roster lists players (the roster page reads no profiles, as Oregon's did). **Profile cards:** Rowing and Swimming & Diving's third slot, Baseball (41, 0), Cross Country (12, 0), Lacrosse (24, 0), Soccer (58, 0), Tennis (18, 0), Track & Field (79, 0), Volleyball (32, 0).

## Open

- Baseball, Beach Volleyball, Lacrosse, Rowing, Track & Field fill when 2026-27 is published.
- First live cards not yet observed.

## Athletes from the NIL marketplace (October 16, 2026)

Source: INFLCR Exchange university-of-southern-california (usctrojans.com NIL marketplace page). On the preview (4.105.0), the sports that use profile cards: Baseball 2 of 3 with Instagram (2 from the marketplace); Cross Country 0 of 3 with Instagram (0 from the marketplace); Lacrosse 0 of 3 with Instagram (0 from the marketplace); Rowing 2 of 3 with Instagram (0 from the marketplace); Soccer 3 of 3 with Instagram (3 from the marketplace); Swimming & Diving 3 of 3 with Instagram (1 from the marketplace); Tennis 0 of 3 with Instagram (0 from the marketplace); Track & Field 1 of 3 with Instagram (1 from the marketplace); Volleyball 1 of 3 with Instagram (1 from the marketplace). A slot still short keeps its official profile card, and the profile-card fallback stays listed (the athletes tried vary by day). Athletes connect these accounts themselves; the app uses one only for an athlete on the current official roster whose marketplace record names the same athlete and sport (`src/opendorse.mjs`, `src/inflcr.mjs`).

**Production `4.105.2`, October 16 (after forced refreshes):** the marketplace supplies athletes in Baseball, Soccer, Swimming & Diving, Track & Field and Volleyball; Soccer and Swimming & Diving now show three with Instagram. Still short of three (profile cards fill the rest): Baseball (2 of 3), Cross Country (0 of 3), Lacrosse (0 of 3), Rowing (2 of 3), Tennis (0 of 3), Track & Field (1 of 3), Volleyball (1 of 3). Counts vary from day to day with the roster athletes tried, so the profile-card fallback list is unchanged.
