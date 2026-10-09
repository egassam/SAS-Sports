# Maryland school module

`src/schools/maryland.mjs` owns Maryland's umterps.com routes, program combinations, verified Instagram pins and its SIDEARM page-data reader settings. The event/result contract, caching, display and generic parsing stay shared.

Maryland was added to the app on October 9, 2026, with Iowa. All 14 sports were built and tested one at a time and published in one PR. The site is SIDEARM (Nuxt page data) and refuses the sandbox, so it is read through the private source. The module starts from Oklahoma's handlers (`scripts/start-schools.mjs`).

## Status (`4.71.1-iowa-maryland`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 2-3 (Big Ten 0-2); ESPN live score |
| Volleyball | `womens-volleyball` | 15 finals with stories; 11-4 (Big Ten 1-3); other teams' matches in Maryland's tournament are not listed; ESPN live score |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; women's 13 finals, 3-8-2 (Big Ten 0-6-1); men's 10 finals, 7-2-1 (Big Ten 2-2-1); ESPN live scores per team |
| Field Hockey | `field-hockey` | 11 finals with stories; 11-0 (Big Ten 2-0) |
| Cross Country | `womens-cross-country` | Women only; 3 finals with stories and TFRRS places (`MD_college_f_Maryland`): Delaware 1st, Spiked Shoe 5th, Paul Short 17th |
| Golf | `womens-golf`, `mens-golf` | Labeled; women's "2nd of 18" (Nittany Lion, archive story), "6th of 11"; men's "T7th of 17", "T5th of 12", "1st of 14" |
| Tennis | `womens-tennis` | Women only; 4 fall tournaments with stories |
| Lacrosse | `womens-lacrosse`, `mens-lacrosse` | Labeled; women's fall exhibitions; men's page still shows 2026 (valid empty until 2027 is published) |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; exhibitions from Oct 11 |
| Baseball, Softball | `baseball`, `softball` | Fall games; baseball's "Fall WS" intrasquads not listed |
| Wrestling | `wrestling` | 2026-27 duals upcoming |
| Gymnastics, Track & Field | `womens-gymnastics`, `track-and-field` | Pages still show 2026: valid empty schedules until 2027 is published |

## Maryland rules (beyond Oklahoma's)

- **Routes:** cross country is `womens-cross-country` (Maryland has no men's team; the scaffold's `cross-country` is SIDEARM's empty template). Basketball, Golf, Lacrosse and Soccer are combined and labeled.
- **Internal games:** baseball's "Fall WS Game 1-3".
- **Golf without a place or story:** women's golf at Navy (Sep 26) publishes no place and no story (the archive lists none from Sep 26 to Oct 7): not listed (Vanderbilt's rule).
- **Shared (kit `createArchiveStory`):** for a meet, a story dated on or after its last day whose headline names it comes before one that names it only in its text ("Terps Finish Second at Nittany Lion Invitational", Sep 8, over the Sep 9 "Terps Trio Named to Big Ten Golfers to Watch List"). The headline is read from `og:title` whole (an apostrophe, "Men's", ended it before).
- **Live:** soccer and lacrosse boards carry their team (`Men's`, `Women's`).

Every rule was mutated, and every mutation fails `npm run test:maryland-module`.

## Athletes

Three per sport from roster cards and profile pages (`scripts/athlete-evidence.mjs`, Oct 9: every sport publishes athlete Instagram links; Cross Country 17 of 17). **Pins:** Baseball (12 links in 39 profiles) and Tennis (8 in 10), three each.

## Limitations

- **Waiting on publication:** Gymnastics, Track & Field and men's Lacrosse fill when umterps.com publishes 2027.
- **Live cards:** no live card observed yet (volleyball vs UCLA and men's soccer vs Michigan State Oct 9; football at Ohio State Oct 10).
