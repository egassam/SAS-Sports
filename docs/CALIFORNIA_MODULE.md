# California school module

`src/schools/california.mjs` owns Cal's calbears.com routes, program combinations, verified Instagram pins and its SIDEARM schedule reader (Oklahoma's handlers). The event/result contract, caching, display and generic parsing stay shared.

California was added to the app on October 14, 2026 (17 sports, one PR with Boston College). calbears.com is a newer (Nuxt) SIDEARM site that refuses the sandbox: it is read through the private source. Its menu lists sports as payload slugs, not links: `add-school` now reads those when the links give fewer than three sports.

## Status (`4.87.1-boston-college-california`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 6 finals with stories; 3-3 (ACC 2-1) |
| Volleyball | `womens-volleyball` | 17 finals with stories; 13-4 (ACC 3-3). Saint Mary's, South Carolina and SMU take their stories from the archive |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; 4-4-5 (1-2-2) and 4-4-3 (1-3-1) |
| Field Hockey | `field-hockey` | 12 finals with stories; 7-5 (ACC 1-4) |
| Cross Country | `cross-country` (both teams) | Team places per meet; TFRRS (`CA_college_f/m_California_CA`) for Saint Mary's and Bill Dellinger; USF Invitational from the card |
| Golf | `womens-golf`, `mens-golf` | Labeled. Places from the cards ("T-12" read as T12th) or the final story's headline (Bettie Lou Evans T3rd, Marilynn Smith 3rd); men's Big Match "Completed" with its story (no place published); the women's Big Match card links the men's story and is not listed |
| Water Polo | `mens-water-polo`, `womens-water-polo` | Labeled; 9-4 (MPSF 0-2 from the page data); women's 2027 season not published |
| Swimming & Diving | `womens-`, `mens-swimming-and-diving` | Labeled; meets with stories |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; storyless tournaments (KPSF Open, women's Battle in the Bay) and the Tiburon ATP Challenger are not listed |
| Basketball, Gymnastics (women's), Lacrosse | | 2026-27 schedules upcoming; exhibitions labeled |
| Baseball, Softball, Rowing (both), Track & Field, men's Gymnastics | | Pages still show last season: valid empty schedules until published |
| Beach Volleyball | `beach-volleyball` | SIDEARM's empty template: a valid empty schedule (off the athlete list) |

Rugby is not in the app's catalog.

## California rules

- **Golf:** "T-12" places; story-headline places (`californiaGolfStoryPlace`: "Bears Tie for Third", "Bears Take Third Place"); a story of the other team is not this team's (card or archive); a past golf event with no place and no story is not listed.
- **Volleyball archive stories:** set scores (`volleyballSetScores`); a story with no score is the game's when it is the one game-day story naming the opponent in its address (SMU, Sep 27).
- **Names:** "(exhib.)" and a leading "vs." read as "(Exhibition)".
- **Conference games:** page-data flags; water polo is MPSF.

Every rule was mutated and each mutation fails `node tests/california-module.mjs`.

## Athletes

- **INFLCR Exchange (Oct 18):** calbears.com links "GOLDEN: The Official NIL Program of Cal Athletics" (`app.inflcr.com/exchange/university-of-california-berkeley`; missed by the Oct 16 NIL sweep, found by the improved `add-school` detector). The module sets `inflcr:{school:'university-of-california-berkeley'}`: roster athletes without a profile link are looked up there before profile cards fill a slot.

Three featured athletes per sport. Pinned from the profile pages (Oct 14): Golf, Swimming & Diving, Tennis (three each), Water Polo (Riley Clansen). **Profile cards** (`athlete_profile_fallback_sports`): Cross Country (0 of 35 profiles), Field Hockey (0 of 21), Gymnastics (0 of 40), Rowing (0 of 59), Soccer (0 of 90), Softball (0 of 24), Track & Field (0 of 100), Water Polo (1 of 44). Gymnastics rosters publish no athlete portraits either: its cards show initials (`portraitlessProfileSports`, Cal only). Accented names written as entities ("Ko&ccaron;anas") are decoded (shared `decodeHtml`).

## Open

- Baseball, Softball, Rowing, Track & Field, men's Gymnastics, women's Water Polo, Beach Volleyball fill when published.
- Men's Big Match (golf) shows "Completed" (the story gives no place).
- First live cards not yet observed.
