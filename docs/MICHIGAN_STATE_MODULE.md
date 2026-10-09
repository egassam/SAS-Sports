# Michigan State school module

`src/schools/michigan-state.mjs` owns Michigan State's msuspartans.com routes, program combinations, verified Instagram pins and its SIDEARM page-data reader settings. The event/result contract, caching, display and generic parsing stay shared.

Michigan State was added to the app on October 9, 2026, with Michigan. All 15 sports were built and tested one at a time and published in one PR. The site is SIDEARM (Nuxt page data), read through the private source. The module starts from Oklahoma's handlers (`scripts/start-schools.mjs`).

## Status (`4.72.2-michigan-michigan-state`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 2-3 (Big Ten 0-2); ESPN live score |
| Volleyball | `womens-volleyball` | 14 finals with stories; 13-1 (Big Ten 3-1); ESPN live score |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; women's 13 finals, 10-1-2 (Big Ten 5-1, as the page publishes it: its data marks USC, Sep 10, non-conference); men's 12 finals incl. two exhibitions, 7-2-1 (Big Ten 3-1); ESPN live scores per team |
| Field Hockey | `field-hockey` | 11 finals with stories; 4-7 (Big Ten 0-4); ESPN live score |
| Hockey | `mens-ice-hockey` | Boston College exhibition (Oct 2) with its story; ESPN live score (shared default) |
| Cross Country | `cross-country` | One page for both teams; TFRRS places: Spartan Invitational 1st/1st, John McNichols 9th/6th |
| Golf | `womens-golf`, `mens-golf` | Labeled; the last round's "880 (7th of 12)" gives "7th of 12" with the team score |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; women's 3 fall tournaments with stories; men's ITA All-American (archive story, Sep 28) |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; Incarnate Word exhibition (Oct 2) final; Big Ten and NCAA tournament days one event each |
| Baseball, Softball | `baseball`, `softball` | Fall exhibitions (not in records) |
| Wrestling | `wrestling` | 2026-27 duals upcoming |
| Gymnastics, Rowing, Track & Field | `womens-gymnastics`, `womens-rowing`, `track-and-field` | Pages still show 2026 / 2025-26: valid empty schedules until 2026-27 is published |

## Michigan State rules (beyond Oklahoma's)

- **Routes:** Basketball, Golf, Soccer and Tennis are combined and labeled; cross country and track are one page each for both teams.
- **Golf:** the card publishes the team score, then the place in the field ("880 (7th of 12)", "841 (T3rd of 9)"). A past event with neither a place nor a story is not listed (The Indy at Forest Hills, Oct 2: no place on its card, no story in the men's golf archive; Maryland's rule, now written by the scaffold for every new school).
- **Rankings (shared `withoutRanking`):** two polls' ranks ("No. 6/7 North Carolina") and bracketed votes ("[RV] Xavier", "(RV) Miami") are not names.
- **Bracket days (shared `mergeTbaBracket`):** an event published once per day without a result ("Big Ten Tournament" Mar 9-14, "NCAA Final Four" Apr 3-5) is one event from its first to its last day.
- **Tennis stories:** men's tennis posted the ITA All-American Championships (Sep 19-25) on Sep 28: the archive is searched to three days after a meet (kit `meetDaysAfter:3`).
- **Athlete links (shared `verifiedInstagram`):** every profile's menu links the team's account (msu_baseball, msu_football, …): a site-menu link (`data-s-nav-link`, `c-navigation__url`) is never the athlete's.
- **Live:** soccer boards carry their team; field hockey's board is on.

Every rule was mutated, and every mutation fails `npm run test:michigan-state-module`.

## Athletes

Three per sport (`scripts/athlete-evidence.mjs`, Oct 9, team accounts left out). **Pins:** Football (3 of 109 profiles), Rowing (3 of 73), Track & Field (25 of 75), Volleyball (5 of 20), three each; Cross Country (Anjali Kidambi, 1 of 38) and Tennis (Taym Alazmeh, 1 of 19) one each. **Profile cards** (`athlete_profile_fallback_sports`): Baseball (30 profiles), Basketball (31), Field Hockey (25), Golf (18), Gymnastics (19), Hockey (26), Soccer (87), Softball (24), Wrestling (32) publish only the team account; Cross Country and Tennis fill their other two slots with cards. Instagram itself cannot be read without a login (project rule).

## Limitations

- **Waiting on publication:** Gymnastics, Rowing and Track & Field fill when msuspartans.com publishes 2026-27.
- **Men's tennis:** Battle In The Bay (Oct 1-4) and the Hope College RSM Invite (Oct 2-4) have no story in the archive (checked Oct 9; the last is the Sep 30 preview) and no result on the card: not listed until a story is published.
- **Women's soccer at Notre Dame (Sep 3, T 2-2):** no story linked or in the archive; the result line shows.
- **Live cards:** no live card observed yet (baseball exhibition, field hockey vs Penn State, hockey vs Northern Michigan, men's soccer at Maryland, volleyball vs Oregon, Oct 9).
