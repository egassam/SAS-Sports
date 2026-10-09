# Michigan school module

`src/schools/michigan.mjs` owns Michigan's mgoblue.com routes, program combinations, verified Instagram pins and its SIDEARM page-data reader settings. The event/result contract, caching, display and generic parsing stay shared.

Michigan was added to the app on October 9, 2026, with Michigan State. All 18 sports were built and tested one at a time and published in one PR. The site is SIDEARM (Nuxt page data), read through the private source. The module starts from Oklahoma's handlers (`scripts/start-schools.mjs`).

## Status (`4.72.2-michigan-michigan-state`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 3-2 (Big Ten 0-2); ESPN live score |
| Volleyball | `womens-volleyball` | 15 finals with stories; 10-5 (Big Ten 1-3); ESPN live score |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; women's 12 finals, 5-4-3 (Big Ten 3-4); men's 9 finals, 3-4-2 (Big Ten 0-2-1); ESPN live scores per team |
| Field Hockey | `field-hockey` | 10 finals with stories; 5-5 (Big Ten 1-3); ESPN live score |
| Hockey | `mens-ice-hockey` | 2 finals with stories; 2-0; ESPN live score (shared default) |
| Cross Country | `womens-cross-country`, `mens-cross-country` | Labeled, per-team TFRRS (`MI_college_f/m_Michigan`); women's Spartan 3rd, Lakefront 9th; men's Lakefront 2nd; Michigan Open (Sep 4) "Canceled" with its story |
| Golf | `womens-golf`, `mens-golf` | Labeled; places in the field ("6th of 16", "T11th of 16"); Barbara Nicklaus Cup match play (women 1-2, men 0-2-1) |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; fall tournaments with stories (Fighting Irish Invitational from the archive) |
| Swimming & Diving | `womens-`/`mens-swimming-and-diving` | Labeled; CSL Match #1 and Team Be Better (exhibition) with stories |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; exhibitions from Oct 11; women's Big Ten Tournament one event (Mar 3-7) |
| Water Polo | `womens-water-polo` | Fall exhibitions; the "Maize & Blue Exhibition" intrasquad not listed |
| Baseball, Softball | `baseball`, `softball` | Fall games (not in records) |
| Wrestling | `wrestling` | 2026-27 duals upcoming |
| Gymnastics, Lacrosse, Rowing, Track & Field | `womens-`/`mens-gymnastics`, `womens-`/`mens-lacrosse`, `womens-rowing`, `womens-`/`mens-track-and-field` | Pages still show the 2026 (2025-26) season: valid empty schedules until 2026-27 is published |

## Michigan rules (beyond Oklahoma's)

- **Routes:** cross country and track are one page per team (`womens-cross-country`, `mens-cross-country`, `womens-track-and-field`, `mens-track-and-field`); the scaffold's `cross-country` is the site's general event list (one meet, other sports). Basketball, Cross Country, Golf, Gymnastics, Lacrosse, Soccer, Swimming & Diving, Tennis and Track & Field are combined and labeled.
- **Cross country:** each team's event keeps its own TFRRS race (Illinois's split).
- **Page marks:** a trailing `*` ("Mississippi Valley State*") and a stray `;` ("TEAM BE BETTER; Invitational") are not names.
- **Internal games:** water polo's "Maize & Blue Exhibition" (Oct 18).
- **Tennis stories:** men's tennis posts each tournament's page the day before play and fills it in afterward ("Michigan at Fighting Irish Mini Duals", Sep 24, for Sep 25-26): the archive is searched from one day before (kit `meetDaysBefore:{Tennis:1}`, and the recap matcher's `ownLinkDaysBefore:{Tennis:1}` so the expanded view accepts it).
- **Athlete links:** profiles write some links inside another ("instagram.com/https://www.instagram.com/wyattnovara") or with a space ("instagram.com/Alex Gatto._"): the inner link is read, the broken one is no link (shared `verifiedInstagram`).
- **Live:** soccer and lacrosse boards carry their team (`Men's`, `Women's`); field hockey's board is on.
- **Athletes across team rosters (shared `featuredAthletes`):** the roster read goes on past 18 athletes while a pinned athlete is not found yet (Cross Country: 18+ women, pinned men's runner).

Every rule was mutated, and every mutation fails `npm run test:michigan-module`.

## Athletes

Three per sport (`scripts/athlete-evidence.mjs`, Oct 9). **Pins** (few links among many profiles): Baseball (8 of 44), Cross Country (9 of 50), Tennis (9 of 18), Track & Field (20 of 93), three each. **Profile cards** (`athlete_profile_fallback_sports`): Field Hockey (28 profiles), Football (119), Rowing (59), Soccer (85), Softball (23), Swimming & Diving (54), Wrestling (30) publish no athlete Instagram link on any roster card or profile page; Instagram itself cannot be read without a login (project rule).

## Limitations

- **Waiting on publication:** Gymnastics, Lacrosse, Rowing and Track & Field fill when mgoblue.com publishes 2026-27.
- **Live cards:** no live card observed yet (field hockey vs Maryland, hockey vs Alaska Anchorage, men's soccer vs Penn State, volleyball vs Iowa, Oct 9).
