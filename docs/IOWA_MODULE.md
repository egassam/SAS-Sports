# Iowa school module

`src/schools/iowa.mjs` owns Iowa's hawkeyesports.com schedule and roster routes, its program combinations, its verified Instagram pins and its schedule-card reader. The Worker imports its configuration.

Iowa was added to the app on October 9, 2026, with Maryland. All 15 sports were built and tested one at a time and published in one PR. hawkeyesports.com is WMT (Nuxt, server-rendered cards); the module is Vanderbilt's card reader (`schedule-item-team` headings, the venue on the date box), adapted to Iowa's promotions, golf results and double duals. The site answers the sandbox directly.

## Status (`4.71.1-iowa-maryland`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 4-1 (Big Ten 1-1); ESPN live score |
| Volleyball | `wvball` | 18 finals with stories; 12-6 (Big Ten 1-3); ESPN live score |
| Soccer | `wsoc` | 13 finals with stories; 6-3-4 (Big Ten 1-2-3), equal to the page; ESPN live score |
| Field Hockey | `fhockey` | 12 finals with stories; 11-1 (Big Ten 3-1), equal to the page |
| Cross Country | `mcross`, `wcross` | Labeled; 3 finals each, each team's own place and points from TFRRS (`IA_college_f_Iowa`, `IA_college_m_Iowa`) |
| Golf | `mgolf`, `wgolf` | Labeled; men's "1st of 14", "T6th of 18"; the Fighting Irish Classic takes its news-list story and the team's place from its text (14th, 888); women's place and team score ("4th", 878) |
| Swimming & Diving | `wswim` | Women only; Marquette dual W 189-70; home double duals name their opponents ("Iowa vs Purdue/UCLA") |
| Tennis | `wten` | Women only; fall tournaments (ITA Regionals Oct 15) and spring duals |
| Rowing | `wrow` | 9 upcoming (Indiana exhibition Oct 9) |
| Wrestling | `wrestling`, `womens-wrestling` | Labeled Men's / Women's; duals and tournaments from Nov 1 |
| Baseball | `baseball` | 3 fall exhibitions with stories; ESPN live score |
| Basketball, Softball | `mbball`, `wbball`, `softball` | Upcoming; ESPN live scores |
| Track & Field | `mtrack`, `wtrack` | Labeled; 2027 meets upcoming |
| Gymnastics | `wgym` | Page still titled 2025-26: a valid empty schedule until 2026-27 is published |

## Iowa rules (beyond Vanderbilt's)

- **Promotions:** the heading is followed by a promotion (`schedule-item-team__promo`: "Home Opener", "Pink Out"; a link for wrestling's "Dual in the Dome") and an exhibition tag (`schedule-event-exhibition`); neither is part of the opponent's name.
- **Double duals:** a heading "Double Dual" names its opponents in the promotion ("vs. Purdue/UCLA" → "Iowa vs Purdue/UCLA"; "Diving Only vs. Illinois/Nebraska" → "Illinois/Nebraska (Diving Only)").
- **Events read "at":** wrestling's Soldier Salute and tennis's ITA Regionals (added to the event-name words).
- **Golf card results:** "1st/14 teams", "t6th/18 teams" (place of field); "4th / 878 Strokes" (place and team score). When the final story's headline is a player's ("Gudgel Finishes 5th at Fighting Irish Classic"), the team's place is read from "As a team, Iowa finished 14th … with an 888".
- **Stories:** a card's own story may name the opponent by its first word ("Miami (OH)" for "Miami of Ohio", "Loyola" for "Loyola Chicago"); another story's headline score must be the game's (field hockey played Indiana Sep 18 and 20; the "Fall to Indiana 3-1" story is not the 2-1 game's).
- **Field hockey conference games:** the second game against a weekend's opponent is not a conference game (Indiana's page data marks Sep 18 conference, Sep 20 not; Iowa's page publishes Conf. 3-1).

Every rule was mutated; every mutation fails `npm run test:iowa-module`.

## Athletes

Certification lists all 15 sports (minimum 3). `scripts/athlete-evidence.mjs` (Oct 9) read every profile page; every sport publishes athlete Instagram (Golf 7 of 18, Tennis 9 of 10, Cross Country 12 of 21, the rest more). **Pins:** Golf and Tennis (three each).

## Limitations

- **Waiting on publication:** Gymnastics fills when hawkeyesports.com publishes 2026-27.
- **Golf:** the men's Bluejay Invitational (Sep 21-22) was played by three Hawkeyes as individuals (story: "2 Hawkeyes Finish in Top 20"): it has no team place and reads "Completed" with its story. Women's results give place and team score; the cards publish no field size.
- **Published conference records:** football's page reads "Conf. 1-0" without the Oct 3 Ohio State loss, and volleyball's "0-0" (not filled in); the app counts every regular-season Big Ten final (football 1-1, volleyball 1-3).
- **Live cards:** no live card observed yet (soccer at Washington Oct 8, volleyball vs Northwestern Oct 9).
