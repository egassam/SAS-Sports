# Ohio State school module

`src/schools/ohio-state.mjs` owns Ohio State's ohiostatebuckeyes.com routes, program combinations, verified Instagram pins and its SIDEARM page-data reader settings. The event/result contract, caching, display and generic parsing stay shared.

Ohio State was added to the app on October 9, 2026. All 19 sports were built and tested one at a time and published in one PR. The catalog listed the site as CUSTOM: it is SIDEARM (Nuxt page data) behind Imperva bot defense, which refuses the development sandbox (403 / redirect loop) and answers the Worker; every page is read through the private source route. The module starts from Oklahoma's handlers (`scripts/start-schools.mjs`), with Minnesota's per-team cross country.

## Status (`4.75.4-ohio-state`, production verified Oct 9)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 4-1 (Big Ten 2-0); ESPN live score |
| Volleyball | `womens-volleyball`, `mens-volleyball` | Labeled; women's 14 finals with stories, 9-5 (Big Ten 2-2); men's 2027 not published; labeled ESPN boards (women's, men's) |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; women's 12 finals 10-1-1 (6-1), men's 10 finals 6-2-2 (1-2-1); labeled ESPN boards |
| Field Hockey | `field-hockey` | 11 finals with stories; 4-7 (Big Ten 0-3: the second game of the Iowa weekend is non-conference in the page data) |
| Hockey | `mens-ice-hockey`, `womens-ice-hockey` | Labeled; women's 4 finals 4-0 (WCHA 2-0); men's start Oct 9 |
| Cross Country | `womens-cross-country`, `mens-cross-country` | Labeled, per-team TFRRS (`OH_college_f/m_Ohio_State`): Mike Baumer W 1st / M 1st, Spartan Invite W 6th / M 3rd, Paul Short Run W 24th |
| Golf | `womens-golf`, `mens-golf` | Labeled; places from the cards (women 1st of 11, 6th of 12, 1st of 4; men 6th of 14, 5th of 18, 1st of 4) with archive stories |
| Tennis | `womens-tennis`, `mens-tennis` | ITA All-American (both teams) with stories; ITA Midwest Regional in progress |
| Swimming & Diving | `womens-swim-dive`, `mens-swim-dive` | Labeled; College Swimming League matches (Sep 24, Oct 2) "Completed" with their stories, one card per opponent as published |
| Rifle | `rifle` | 5 finals with stories (1-4, no conference record: the Big Ten sponsors no rifle) |
| Fencing | `fencing` | OSU Open and OSU Duals with stories |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; men's exhibition vs Cincinnati (L 68-79) with its story |
| Baseball, Softball | `baseball`, `softball` | Fall exhibitions upcoming |
| Lacrosse | `womens-lacrosse`, `mens-lacrosse` | Labeled; fall exhibitions |
| Wrestling | `wrestling` | 2026-27 duals upcoming |
| Gymnastics, Rowing, Track & Field | `womens-`/`mens-gymnastics`, `rowing`, `womens-`/`mens-track-field` | Pages still show the 2025-26 season: valid empty schedules until 2026-27 is published |

## Ohio State rules (beyond Oklahoma's)

- **Routes:** cross country, swimming and track are one page per team (`mens-swim-dive`, `womens-track-field`; the generic slugs are SIDEARM's empty template). `add-school` now reads the `swim-dive` slug. Eleven sports are combined and labeled.
- **Another sport's story:** the women's Paul Short Run card (Oct 2) links "Buckeyes named 2026-27 fencing captains". A card story whose address names another sport and not its own is not a recap (`recapLinks`, which the shared SIDEARM reader now passes the sport). The meet keeps its TFRRS place.
- **Institution names:** men's soccer, rifle and softball write "University of Memphis", "DePaul University", "#3 Texas Christian University". They read as the stories do: Memphis, DePaul, TCU, Ole Miss ("University of Mississippi"), UTEP, MIT; Miami University and Boston University keep theirs. The rifle stories cover two or three duals a day; each dual keeps its story when the address names it by the short name ("ole-miss", "tcu").
- **Exhibitions:** the field hockey NCAA Tournament (Nov 13-22) is page-data type "S"; a postseason NCAA event is not an exhibition.
- **Tennis:** the ITA All-American's opponent is "Intercollegiate Tennis Association"; it reads as its tournament. Players' pro events ("M25 Las Vegas", "Columbus Challenger") are not the team's.
- **Internal:** baseball's "Scarlet & Gray World Series" (Oct 9-11) is an intrasquad. Softball's "(10 inn.)" note is not part of the name.
- **Other leagues:** women's hockey plays in the WCHA and men's volleyball in the MIVA; their league games are named so (`conference_name`), not Big Ten.
- **Golf:** the women's Toledo Rocket Classic (Individuals, Sep 14) publishes no place and no story: not listed (Maryland's rule).

Every rule was mutated, and every mutation fails `node tests/ohio-state-module.mjs`; four ported rules no Ohio State page exercises (ATP prefix, poll mark, rowing regattas, a field-hockey/hockey exception) were removed.

## Athletes

Three per sport (`scripts/athlete-evidence.mjs`, Oct 9). **Pins:** Baseball (5 of 37 profiles), Basketball (3 of 26), Cross Country (7 of 30), Field Hockey (4 of 27), Golf (5 of 16), Lacrosse (10 of 83), Softball (3 of 25), Swimming & Diving (3 of 55), Tennis (11 of 21), Wrestling (9 of 29), Volleyball (Mia Tuman's own `miatuman`; her page also links `zbump7`, which unrelated track athletes' pages carry). **Profile cards** (`athlete_profile_fallback_sports`): Rifle (8 profiles) and Rowing (51) publish no athlete Instagram on any roster card or profile page; Volleyball publishes one (34 profiles, women's and men's), so two slots are profile cards. Instagram itself cannot be read without a login (project rule).

## Limitations

- **Not in the app's sport catalog:** Ohio State also sponsors Pistol and Synchronized Swimming; the app has no such sports (no other school sponsors them). Spirit is not a competitive team.
- **Waiting on publication:** Gymnastics, Rowing, Track & Field and men's Volleyball fill when ohiostatebuckeyes.com publishes 2026-27.
- **Paul Short Run (women's XC, Oct 2):** no story of its own is published (the card links the fencing story); the result comes from TFRRS.
- **Rifle conference:** Ohio State rifle competes in the Patriot Rifle Conference (its championship is on the schedule, Feb 5); the app shows no conference record for rifle (the Big Ten sponsors none) until the module names that league.
- **Live cards:** no live card observed yet (field hockey vs Rutgers, women's hockey vs Wisconsin, volleyball vs Washington, Oct 9; football vs Maryland Oct 10).
