# Cincinnati school module

`src/schools/cincinnati.mjs` owns Cincinnati's gobearcats.com schedule and roster routes, its program combinations, its verified Instagram tags and its schedule-card reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Cincinnati was chosen on October 4, 2026 (user: "Convert Cincinnati"; it is the next unconverted Big 12 school in catalog order). gobearcats.com answers the development sandbox directly (HTTP 200), so fixtures are downloaded as the app fetches them, with spacing between requests.

## Status

| Sport | PR | State |
| --- | --- | --- |
| Football | #202 | Card reader: 4 finals `W, 31-26` with their own recaps; 8 upcoming, `Oct 3, 11:00 PM` at Arizona, the rest date only (unscheduled); ESPN live score (shared FBS-group request) |
| Volleyball | #203 | 13 finals (`L, 1-3`) with their own recaps, 15 upcoming with published times; rankings dropped, no match listed twice; ESPN live score |
| Soccer | #204 | 11 finals (`T, 1-1`) with their own recaps, 7 upcoming with published times; unscored exhibition left out; ESPN live score |
| Cross Country | #205 | Complete results from TFRRS: `Women's team: 24th · 575 pts / Men's team: 15th · 396 pts`, every Cincinnati runner per race (`Women's 6K`, `Men's 8K`) |
| Basketball | #206 | Men's 37 + women's 32, labeled, the two official pages only; women's exhibition `(Exhibition)`; published times; ESPN live scores for both teams |
| Baseball | #207 | Official page only; spring 2027 (57 games) with published times; Big 12 Tournament May 25-29 listed while it is played; ESPN live score |
| Golf | #208 | Both teams, labeled, one event per tournament: `4th of 14`, `2nd of 12`, each with its final story; a tournament under way is today's event |
| Lacrosse | #209 | Women's page only; empty schedule (the page still shows spring 2026); in season, finals `L, 10-11` with recaps |
| Swimming & Diving | #210 | One official page for both teams; 13 meets with published times; invitationals named after their heading and ending on their last day |
| Tennis | (this PR) | Added to the catalog (the site publishes a 2026-27 women's tennis schedule); 4 tournaments `Cincinnati at ...`, ending on their last day; the Pam Whitehead Invitational with its story |
| Track & Field | #211 | `track-field` page only; empty schedule (the page still shows 2025-26); in season one event per meet, team places `Women's team: 7th / Men's team: 12th`, each with its story |

Production survey before the module (October 4, ~01:30 UTC, `4.49.2`):
- **Football:** finals and recaps right; the Oct 3 night game at Arizona listed twice (Oct 3 and Oct 4); a phantom Nov 28 game at BYU carrying the Sep 5 recap; no published times.
- **Volleyball:** rankings in names (`#11 TCU`, `#RV Kansas State`); every ranked upcoming match listed twice (`at #24 Colorado` Oct 29 and `at Colorado` Oct 30); a phantom Baylor recap; no times.
- **Soccer:** the same doubling (Colorado Oct 30/31, West Virginia Nov 5/6), a phantom recap on Nov 5; no times.
- **Cross Country:** `Completed` for all three meets, no race rows; the cards publish team places (`2nd (M), 2nd (W)`).
- **Basketball:** 2 results (the Bahamas summer exhibitions) and 79 upcoming.
- **Golf:** 5 results and 23 upcoming: one event per round.
- **Lacrosse:** the spring 2026 season shown as current (17 results).
- **Baseball:** 57 upcoming, spring 2027. **Swimming & Diving:** 13 upcoming. **Track & Field:** empty.
- The site also publishes a women's tennis schedule (`/sports/womens-tennis/schedule`), which `src/sponsored-sports.json` did not list (added with Tennis below).

## Setup (route parity)

The module starts as a pure move. Each of Cincinnati's 10 sports then in the catalog gets exactly the schedule and roster candidates production used before the module existed: the four inline routes (Cross Country, Soccer, Volleyball, Football) and the one verified Soccer Instagram tag moved out of `src/index.js`, and the other sports' generic fallbacks are written out explicitly. A before/after dump of all 219 catalog school/sport routes (schedule, roster, combination flag) was identical. Each sport's routes are corrected in its own PR.

## Cards

gobearcats.com is a WMT site (like ucfknights.com, byucougars.com and thesundevils.com, in its own variant). Each event is a `schedule-event-item` card:
- the start as `<time datetime="2026-10-03T23:00:00.000-04:00">` (Eastern wall clock with its offset) beside the visible day (`Oct 3`); the reader takes the date from the datetime and checks it against the visible day;
- `schedule-default-event__divider` (`vs.` / `at`) and `schedule-default-event__name` (the opponent, with rankings such as `#11 TCU`);
- one result slot: the result (`W Win 31-26`) or the published time (`11:00 PM EDT`); an unscheduled game has the `schedule-event-date--time-tba` class and an empty slot (its datetime holds a placeholder time such as `11:11`, never shown);
- the game's own `Recap` link (`/news/2026/09/27/...`), dated in its URL; it must fall between the game day and three days after.

Cincinnati is in `America/New_York`; times are stored as the school's wall clock, as for every school.

## Football (`4.50.0-cincinnati-football`)

The module reader (`createCincinnatiHandlers().parseSchedule`, Football only via `cardSports`) gives 12 games, one each: 4 finals in K-State's wording (`W, 31-26` vs Kansas State), date only, each with its own recap; `Cincinnati at Arizona Oct 3, 11:00 PM`; 7 unscheduled games with the date alone. The shared recap matcher matches each final to its own recap only, and the expanded view writes highlights from that article.

**Live score.** ESPN's college football scoreboard through the shared FBS-group request (#164). The Sep 26 payload's Kansas State at Cincinnati (`W, 31-26`) joins the official card (no second card).

`npm run test:cincinnati-module` (also in `npm test` and `npm run test:release`) checks route ownership and parity, the Football games from the unmodified fixture, recap matching across all four recaps, highlight generation from each game's own article and the ESPN match. Removing the parse hook fails it.

## Volleyball (`4.50.1-cincinnati-volleyball`)

Production read both the cards and the schema data: rankings in the names (`#11 TCU`, `#RV Kansas State`), every ranked upcoming match listed twice (`at #24 Colorado` Oct 29 and `at Colorado` Oct 30, the second a UTC day late), a phantom recap on Nov 27 and no times. The card reader gives 28 matches, one each: 13 finals in K-State's wording, date only, each with its own recap, and 15 upcoming with Cincinnati's published times (`Oct 22, 6:30 PM` vs Kansas State).

**Recap matcher (`matchesRecap`, every Cincinnati sport).** The shared matcher refused the Oct 2 Houston story (its headline and article never say "volleyball": "Cincinnati Falls on Road Against Houston") and accepted neighboring days' stories for each other (the Sep 4 Valparaiso story for Michigan and Oakland; the Sep 10 Morehead State story for Michigan State). The card's own Recap link is now checked for opponent and date only (it is already bound to its match); any other candidate must also name the opponent in its headline (`og:title`; `St.` read as `State`). Across all 13 finals, each matches only its own recap. Football is unchanged (each final still matches only its own recap).

**Live score.** ESPN's women's college volleyball scoreboard, as K-State's. The Oct 2 payload (120 matches) holds Cincinnati at Houston (`L, 1-3`), which joins the official card.

## Soccer (`4.50.2-cincinnati-soccer`)

Cincinnati sponsors women's soccer only. Production listed ranked upcoming games twice (Colorado Oct 30 and 31, West Virginia Nov 5 and 6), showed a phantom recap on Nov 5 and no times. The card reader gives 18 games, one each: 11 finals in K-State's wording (`T, 1-1` vs Kansas), date only, each matching only its own recap (all 11 checked), and 7 upcoming with published times (`Oct 25, 1:00 PM` vs Kansas State); rankings dropped (`#25 Texas Tech`).

**Past games without a result (every Cincinnati game sport).** The Aug 8 exhibition (`Evansville (EXH)`) has no published score. A game two days past without a result is left out (neither a final nor upcoming); yesterday's stays, since a night game can run past midnight Eastern and its result is posted after it ends.

**Live score.** ESPN's women's college soccer scoreboard (`soccer/usa.ncaa.w.1`); the Oct 2 payload's Cincinnati at TCU (`L, 0-2`) joins the official card.

## Cross Country (`4.50.3-cincinnati-cross-country`)

Cincinnati runs men's and women's teams on one schedule page. Production showed `Completed` for all three meets with no race rows. The cards publish each team's place in the result slot (`2nd (M), 2nd (W)`, `1st (W)`, `15th (M), 24th (W)`); the reader writes K-State's headline from them, women first (`Women's team: 24th / Men's team: 15th`), dates only; `All Day` meets have no time.

The recaps end with a `// RESULTS` list of Cincinnati's top runners only (7 of the 8 women entered at Gans Creek; 10 of 12 women and 6 of 8 men at the RedHawk Rumble). TFRRS, the collegiate results database (as for UCF and Baylor), publishes every meet as plain tables, and Cincinnati's two TFRRS team pages list each meet with its date. The module (`findCincinnatiTfrrsMeet`, `parseCincinnatiTfrrsResults`, `attachMeetResults`; the same three school-gated hooks as Baylor):
- finds the meet on each team's page by date and a shared distinctive word: the schedule's "All-Ohio Intercollegiate Classic" is TFRRS's "All-Ohio InterCollegiate Challenge" (generic words such as Classic, Challenge, Invitational are ignored; a team runs one meet a day). UCF's and Baylor's every-word rule would miss it;
- reads Cincinnati's team result and every Cincinnati runner per race by the TEAM column, from TFRRS race titles in three forms (`Women's Gold Invite 6k`, `2026 Redhawk Rumble - Men's Race`, `Womens Championship 6K`); races Cincinnati did not run (Gans Creek's Black Open) are left out, and a DNS row is not a result;
- refuses TFRRS when any team place the card publishes disagrees (the card's headline stays);
- writes K-State's headline with the points: `Women's team: 2nd · 43 pts / Men's team: 2nd · 40 pts`;
- keeps the source link on the official recap, with the TFRRS page beside it (`results_source_url`);
- writes highlights only from these rows (team finishes, each race's first Cincinnati finisher, then the next finishers).

Results: RedHawk Rumble 18 rows (`Women's 5K`, `Men's 6K`), All-Ohio 11 rows (women only; the men did not run), Gans Creek 15 rows.

**Where the recap and TFRRS differ (Gans Creek):** the recap gives the women 574 points and lists Deana Hudson as `173.`; TFRRS gives 575 and places her 192nd in 22:06.4. 173 is her team-scoring position (TFRRS's SCORE column), and the five scorers' positions sum to 575 (87+94+100+121+173). The TFRRS figures are shown.

ESPN publishes no cross country scoreboard, so there is no live score (K-State has none).

## Basketball (`4.50.4-cincinnati-basketball`)

Production loaded the men's and women's pages plus the generic `/sports/basketball/` page and the homepage (79 upcoming). Basketball now routes to the two official pages only, both labeled, with `-mens`/`-womens` event ids (both teams play Nov 26-27). The card reader gives men's 37 and women's 32 games with published Eastern times (`Oct 7, 3:00 PM` vs Ohio State; `TBA` shows the date only). The men's two August games on the Bahamas tour (`W, 110-63` vs Victoria, `W, 107-66` vs Calgary, under the "Baha Mar Hoops Summer League" heading) are finals with their recaps, as published.

**Tournament headings.** Cards sit in titled wrappers (`Exhibition`, `Cancun Challenge`, `Crosstown Shootout`); a card's heading is the titled wrapper that encloses it. The women's first game sits under `Exhibition` and reads `Georgetown College (Exhibition)`, as K-State labels exhibitions; soccer's `(EXH)` reads the same way.

**Live scores.** ESPN's men's and women's college basketball scoreboards, labeled to match the official pages, through the shared Division I request. Tested on Feb 21, 2026: men's Cincinnati at Kansas and women's UCF at Cincinnati; Binghamton (also "Bearcats") plays in both payloads and is never taken for Cincinnati.

## Baseball (`4.50.5-cincinnati-baseball`)

The page publishes the 2027 spring season only (57 games from Feb 19). Production also loaded the homepage and showed dates alone. Baseball now routes to the official page only; the card reader gives each game once (weekend series games on consecutive days stay apart), published Eastern times (`Feb 26, 6:00 PM` vs Tennessee; `Mar 19, 8:00 PM` at Utah) or the date alone for `TBA`, and the Big 12 Tournament from May 25 to May 29. The 2027 page has no same-day doubleheaders.

**Multi-day events (every Cincinnati game sport).** The two-day rule for past games without a result counts from an event's last day, so the Big 12 Tournament stays listed while it is played.

**Empty schedules (every Cincinnati sport).** When nothing on a page with cards is current, the reader returns a valid empty schedule (`cincinnatiHandlers.isEmptySchedule`, the same school-gated `empty_schedule` hook as BYU, UCF, Arizona and Baylor): the app shows its empty-schedule note. Before, the reader returned nothing and the shared parsers read the page again, making events out of its schema data.

**Live score.** ESPN's college baseball scoreboard (`baseball/college-baseball`). Tested on Apr 10, 2026: Baylor at Cincinnati.

## Golf (`4.50.6-cincinnati-golf`)

Production loaded the first golf page that answered (women's) and showed one event per round (5 results, 23 upcoming), with nothing for the men. Golf now loads both teams' official pages only, labeled, with `-mens`/`-womens` event ids, and:
- merges a tournament's round cards (the same name, at most two days apart) into one event from its first to its last day: men's 25 cards become 11 tournaments, women's 28 become 12;
- writes K-State's headline from the last round's place and field, published as `4th of 14`, `T4th of 15` or `5th out of 13`: `4th of 14`. The cards and stories publish no consistent team total, so none is claimed;
- links each tournament's final story (`Bearcats Finish Fourth at Folds of Honor Collegiate`), never a day-one story (`... Sit Eighth After 18 Holes`); all five finals match their own story (the Powercat story says "Powercat Classic", the card "Powercat Invitational");
- shows a tournament under way as today's event, `In progress`, with no result (the women's Blessings Collegiate, Oct 3-5, after its first round); once its last day passes it is a final;
- reads every tournament as `Cincinnati at ...` (the women's cards say `vs.` for every tournament).

ESPN publishes no college golf scoreboard, so there is no live score (K-State has none).

## Lacrosse (`4.50.7-cincinnati-lacrosse`)

Cincinnati sponsors women's lacrosse only. Production also tried men's and generic lacrosse pages and the homepage, and showed the spring 2026 season (Feb 6 - Apr 24, 2026) as current results. Schedule and roster now route to `womens-lacrosse` only.

**Current-season filter (every Cincinnati sport).** Only the current academic year (July-June, Eastern) is current; spring pages keep showing last season until the next is published. Lacrosse is therefore a valid empty schedule (the app shows its empty-schedule note), and fills in when Cincinnati publishes 2027, with no code change.

**In season** (the same page read as of Apr 25, 2026): 17 finals in K-State's wording, each with its recap; rankings dropped (`#15 Colorado`); the Louisville overtime loss reads `L, 10-11`.

ESPN's scoreboards are not used for lacrosse (K-State sponsors none).

## Swimming & Diving (`4.50.8-cincinnati-swimming-diving`)

gobearcats.com publishes one schedule page for both teams (`/sports/swimming-and-diving/`, "2026-27 Swim and Dive Schedule"); production tried seven men's, women's and generic routes and the homepage. Schedule and roster now route to that page only, and Swimming & Diving is no longer split by team. The card reader gives 13 meets: dual meets with their published Eastern times (`Oct 10, 9:00 AM` vs Northern Kentucky), multi-day meets ending on their last day (Big 12 Championships Feb 23-27), and invitationals named after their heading (the card's `at Ohio St.` is the `Ohio State Invitational`, Nov 17-20). Meets with a published time keep it (every Cincinnati meet sport; cross country and golf publish `All Day`).

The page has no results yet (the season opens Oct 10). ESPN publishes no swimming scoreboard, so there is no live score.

## Track & Field (`4.50.9-cincinnati-track-field`)

The official page is `/sports/track-field/` ("2025-26 Track & Field Schedule" on October 4, 2026); production also tried `track-and-field` (a redirect) and the homepage. Schedule and roster now route to `track-field` only. Under the current-season filter, Track & Field is a valid empty schedule until Cincinnati publishes 2026-27; no code change is needed then.

**In season** (the same page read as of Jun 15, 2026): 22 meets, one event each from its first to its last day (NCAA Outdoor Championships Jun 10-13), each with its story; the conference meets' team places in K-State's form (`Women's team: 7th / Men's team: 12th` at the Big 12 Outdoor Championship); meets with no published place read `Completed`.

ESPN publishes no track scoreboard, so there is no live score.

## Tennis (`4.51.0-cincinnati-tennis`)

Cincinnati sponsors women's tennis: gobearcats.com lists it among its sports and publishes a "2026-27 Women's Tennis Schedule", but `src/sponsored-sports.json` (and the page's fallback list in `public/index.html`) did not list it, so the app offered no Tennis page. Both now list Tennis for Cincinnati only; schedule and roster route to `womens-tennis`.

The card reader gives the 4 fall tournaments (each card sits under its own heading) as K-State reads meets: `Cincinnati at UC/Pam Whitehead Invitational`, ending on their last day; `TBA` shows the date only. The Pam Whitehead Invitational (Sep 18-19, at home) is over: no team result is published for an individual tournament, so it reads `Completed`, with Cincinnati's story; the expanded view writes highlights from it. Spring dual matches will read `vs`/`at` as published.

**Recap matcher.** A multi-day event's own story is checked against its last day: the Pam Whitehead story is dated Sep 20, outside the one-day window the shared matcher gives a dual sport from its first day.

ESPN publishes no college tennis scoreboard, so there is no live score (K-State has none).

## Limitations

