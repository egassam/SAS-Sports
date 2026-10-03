# Baylor school module

`src/schools/baylor.mjs` owns Baylor's baylorbears.com schedule and roster routes, its program combinations, its live scoreboards and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Baylor was chosen on October 3, 2026 (user: "Next school conversion"; Baylor is the next unconverted Big 12 school in catalog order). baylorbears.com refuses the development sandbox (HTTP 403), so every official page used for fixtures was downloaded through the app's private source route (`scripts/fetch-official.mjs`, PR #145), exactly as the app fetches it.

## Status

| Sport | PR | State |
| --- | --- | --- |
| Football | #178 | Page-data reader: 4 finals `W, 23-13` with their own recaps; 9 upcoming with published Baylor times; ESPN live score (shared FBS-group request) |
| Volleyball | #179 | 13 finals with their own recaps, 15 upcoming with published times; rankings dropped; recap matcher for tournament days; ESPN live score |
| Soccer | #180 | 12 finals (`T, 1-1`) with their own recaps, 12 upcoming (7 with times; 5 postseason events ending on their last day); rankings dropped; ESPN live score |
| Cross Country | #181 | Complete results from TFRRS: `Women's team: 3rd · 88 pts / Men's team: 4th · 97 pts`, every Baylor runner per race (`Women's 2 Mile`, `Men's 5K`); meets without a team score name each first finisher |
| Basketball | #182 | Men's 36 + women's 33, labeled, the two official pages only; exhibitions `(Exhibition)`; published times; ESPN live scores for both teams |
| Baseball | #183 | Official page only; spring 2027 with published times; postseason ranges; doubleheaders as Game 1 / Game 2; ESPN live score |
| Softball | #184 | Official page only; spring 2027 with published times; tournament `TBD` games named after the tournament; ESPN live score |
| Golf | #185 | Both teams, one event per tournament: `3rd (845)`, `9th (844)`, `T7th (832)`, `15th (851)`, each with Baylor's story; the Charleston story found in the archive |
| Tennis | #186 | Both teams, labeled; tournaments `Baylor at ITA All-American Championships` with each team's story; in-progress tournaments today's event; past tournaments only with Baylor's story; scrimmage left out |
| Equestrian | #187 | Official page only; 3 finals (`W, 12-8`) with their stories, 11 upcoming with published times; rankings dropped; championships named |
| Acrobatics & Tumbling | (this PR) | Empty schedule (the page still shows the 2026 season); route fixed to `acrobatics-tumbling`; in season `W, 277.415-256.590` with recaps |

Production survey before the module (October 3, ~16:55 UTC, `4.46.1`):
- **Football, Volleyball, Soccer:** finals and recaps right; every upcoming game shows its date only.
- **Basketball:** both teams labeled, dates only, 69 upcoming; exhibitions written `(EXH)` and `(Exhibition)`; bracket games named `Players Era Semifinals`.
- **Baseball, Softball:** 59 and 54 upcoming, dates only; softball tournament placeholders (`TBD`, `Aggie Classic`).
- **Cross Country:** `Completed` for two of three meets, no race rows.
- **Golf:** women's page only (the first that loaded), one event per round (`Schooner Fall Classic` three times, `Tennessee Intercollegiate` twice upcoming).
- **Tennis:** women's page only; tournaments as `Baylor vs ITA Texas Regional Championship`.
- **Track & Field:** the survey request timed out once; `/live/status` then answered with 17 events from the official page (checked in its own PR).
- **Acrobatics & Tumbling:** the 2026 spring season shown as current results, rankings in names (`#3 Quinnipiac`).
- **Equestrian:** results with recaps; rankings in names (`#10 UT Martin`).

## Setup (route parity)

The module starts as a pure move. Each of Baylor's 12 sponsored sports gets exactly the schedule and roster candidates production used before the module existed: the four inline routes (Cross Country, Soccer, Volleyball, Football) moved out of `src/index.js`, and the other sports' generic fallbacks are written out explicitly. A before/after dump of all 219 catalog school/sport routes (schedule, roster, combination flag) was identical. Each sport's routes are corrected in its own PR.

## Page data

baylorbears.com is a SIDEARM (Nuxt) site, like arizonawildcats.com. Each schedule page embeds every game in `__NUXT_DATA__` (read by the shared `sidearmScheduleGames`): `date` (the local start, `2026-10-03T21:30:00`; `T00:00:00` with `TBD`), `time` (`9:30 p.m.`, `7 p.m.`, `TBD`), `location_indicator` (`H`/`A`/`N`), `at_vs`, and `result` (`status`, both scores, `recap.url`). Baylor is in `America/Chicago`; local times are stored as the school's wall clock, as for every school.

## Football (`4.47.0-baylor-football`)

Production read the rendered cards with the shared SIDEARM parser: finals and recaps were right, but every upcoming game showed its date only. The module reader (`createBaylorHandlers().parseSchedule`, Football only via `pageDataSports`) gives:
- one event per game, rankings (`#21`, `No. 23`, `RV`) dropped;
- finals in K-State's wording (`W, 23-13`), date only, each with the game's own `/news/` recap (`football-recap-vs-colorado`), never the game-book PDF; a recap link must be dated from the game day to three days after;
- upcoming games with the published Baylor time (`Oct 3, 9:30 PM` at Arizona State, `Dec 4, 7:00 PM` Big 12 Championship), or the date alone for `TBD`.

The shared recap matcher matches each final to its own recap only (each names the sport and opponent); the expanded view writes highlights from that article.

**Live score.** ESPN's college football scoreboard through the shared FBS-group request (#164). The Sep 26 payload has two other "Bears" (Missouri State, Central Arkansas); only Colorado at Baylor matches, joined to the official card (`W, 23-13`, no second card).

`npm run test:baylor-module` (also in `npm test` and `npm run test:release`) checks route ownership and parity, the Football games from the unmodified fixture, recap matching across all four recaps, highlight generation from each game's own article and the ESPN match. Removing the parse hook fails it.

## Volleyball (`4.47.1-baylor-volleyball`)

Production showed rankings in the opponents (`#17 Florida`, `RV Georgia Tech`, `#1 Nebraska`, `#22 BYU`) and dates without times. The page-data reader now gives 13 finals in K-State's wording, each with its own recap (the Sep 25 night match at BYU is recapped Sep 26, inside the three-day window), and 15 upcoming matches with Baylor's published times, written three ways on the page (`2 p.m.`, `7 pm`, `9:00 PM`).

**Recap matcher (`matchesRecap`, all Baylor sports).** Two Aug 30 matches at the Wahine Classic (Hawaii, Georgia Southern) each have a same-day story. The shared matcher accepted each story for the other match: the Hawaii story ends "WHAT'S NEXT ... against Georgia Southern", and the Georgia Southern story's dateline is "HONOLULU, Hawaii". The card's own recap link is still checked by the shared matcher alone (Baylor's football headlines do not always name the opponent: "Defense Dominates in Home-Opening Rout"); any other candidate must also name the opponent in its headline (`og:title`). Production was not affected (each card's own link is tried first), but a failed download would have fallen back to the wrong story.

**Live score.** ESPN's women's college volleyball scoreboard, as K-State's. The Sep 25 payload (110 matches) also holds California Golden Bears, Morgan State, Mercer and Missouri State Bears; only Baylor at BYU (`L, 2-3`) matches and joins the official card.

## Soccer (`4.47.2-baylor-soccer`)

Baylor sponsors women's soccer only. Production showed rankings (`#10 Arkansas`, `#9 West Virginia`) and dates without times. The page-data reader now gives 12 finals in K-State's wording (the draw at West Virginia reads `T, 1-1`), each with its own recap, and 7 regular-season games with Baylor's published times (`Oct 11, 12:00 PM`).

**Multi-day events (every Baylor page-data sport).** The five postseason entries carry an end date (Big 12 Tournament Nov 9-14; NCAA rounds). They end on their last day; while one is in progress it is today's event (`In progress`), not a passed date dropped from the schedule.

**Headline reader fix.** The recap matcher's headline (`og:title`) stopped at the first apostrophe ("White's Career-First Goal ... Tops Texas A&M"); it now reads to the matching quote.

**Live score.** ESPN's women's college soccer scoreboard (`soccer/usa.ncaa.w.1`); the Oct 2 payload's Kansas at Baylor (`W, 3-1`) joins the official card.

## Cross Country (`4.47.3-baylor-cross-country`)

Baylor runs men's and women's teams. Production read the rendered cards: `Women 3rd, Men 4th` (Aggie Opener) and `Completed` for the Texas A&M Invitational and the Southern Showcase, with no race rows. The page data gives each meet (`Baylor at Aggie Opener`), the published team places as text, and the recap as a schedule file titled "Recap" (`media.gamefiles`; not the result's recap). Baylor's recaps name only some runners and give no complete lists; the Texas A&M Invitational has no recap; the schedule's "Results" links go to Flash Results and XpressTiming.

TFRRS, the collegiate results database (as for UCF), publishes every meet as plain tables, and Baylor's two TFRRS team pages list each meet with its date. The module (`findBaylorTfrrsMeet`, `parseBaylorTfrrsResults`, `attachMeetResults`; the same three school-gated hooks as Arizona and UCF):
- finds the meet on each team's page by date and name ("Southern Showcase" in "Southern Showcase (University/College)");
- reads Baylor's team result and every Baylor runner per race, by the TEAM column only (App State's Baylor Wolfe ran the Southern Showcase): `Women's 2 Mile` / `Men's 5K` at the Aggie Opener, `Women's 5K` / `Men's 8K` after;
- writes K-State's headline, women first: `Women's team: 3rd · 88 pts / Men's team: 4th · 97 pts`; a team without a team score (too few runners: both teams at the Texas A&M Invitational, the men at the Southern Showcase) is named by its first finisher (`Men's: Jack Sterrett 76th`);
- refuses TFRRS when a team place the schedule publishes disagrees (the schedule's stays);
- keeps the source link on baylorbears.com (the recap, or the schedule when there is none), with the TFRRS page beside it (`results_source_url`);
- writes highlights only from these rows (team finishes, each race's first Baylor finisher, then the next finishers: four lines, certification asks for three); the AI never writes them.

TFRRS agrees with the recaps where both give a figure (Ella Perry 9th in 11:13.2; Ruth Kimeli 9th in 16:18.8; women 12th of 31).

**Stored expanded views.** `/live/highlights` keeps verified finals for 30 days in the Workers KV store that preview and production share. The first preview of this PR wrote the Texas A&M Invitational with two highlights; the store would have kept serving that copy. Baylor's store keys now carry `baylorSchool.highlightRevision` (`v1:baylor|...|r2`; other schools' keys are unchanged). Raise it whenever a change rewrites already-stored Baylor finals.

ESPN publishes no cross country scoreboard, so there is no live score (K-State has none).

## Basketball (`4.47.4-baylor-basketball`)

Production loaded the men's and women's pages plus the generic `/sports/basketball/` page and the homepage, and showed dates only, with exhibitions written two ways (`Florida (EXH)`, `West Texas A&M (Exhibition)`). Basketball now routes to the two official pages only, both labeled, with `-mens`/`-womens` event ids (both teams play Jan 2). The reader gives men's 36 and women's 33 games with published times (`1 pm`, `2 p.m. CT`; `4:30 or 7 p.m. CT` is not one time, so the date alone), exhibitions as `Florida (Exhibition)`, and the conference tournaments ending on their last day.

**Live scores.** ESPN's men's and women's college basketball scoreboards, labeled to match the official pages, through the shared Division I request. Tested on Feb 21, 2026: men's Arizona State at Baylor (`W, 73-68`) and women's Arizona at Baylor (`W, 74-60`), each among eight other "Bears" games.

## Baseball (`4.47.5-baylor-baseball`)

The page publishes the 2027 spring season only (59 games from Feb 19; no fall games are listed). Production also loaded the homepage and showed dates alone. Baseball now routes to the official page only, and the reader gives published times (`4 PM`; the date alone for `TBA`), postseason ranges ending on their last day (`NCAA Men's College World Series`, Jun 18-28), and doubleheaders (the same opponent twice on one day) as `Game 1` / `Game 2` (the 2027 page has none yet; fixture-tested by moving a game).

**Live score.** ESPN's college baseball scoreboard (`baseball/college-baseball`). Tested on Apr 10, 2026: Baylor at Cincinnati among four "Bears" games.

## Softball (`4.47.6-baylor-softball`)

The page publishes the 2027 spring season (54 games from Feb 11). Production also loaded the homepage and showed dates alone, with two `Baylor vs TBD` games. Softball now routes to the official page only, and the reader gives published times (`3:30 pm`, `5:30 p.m.`; the date alone for `TBD` or a blank time), tournament games with a `TBD` opponent named after the tournament (`Getterman Classic`, Feb 20 and 21), the Aggie Classic (Feb 25-28) and the postseason ending on their last day, and doubleheaders as `Game 1` / `Game 2` (none on the 2027 page yet).

**Live score.** ESPN's college softball scoreboard (`baseball/college-softball`). Tested on Apr 10, 2026: Baylor at Kansas among other "Bears" games; that day was a doubleheader (see Limitations).

## Golf (`4.47.7-baylor-golf`)

Production loaded the first golf page that answered (women's) and showed every round as its own event (`Schooner Fall Classic` three times, the first two `Completed`), with nothing for the men. Golf now loads both teams' official pages only, labeled, and:
- merges a tournament's consecutive round entries into one event from its first to its last day; the last round with a result gives the place, total and recap (the Fighting Illini's first entry, `15th (+7, 287)`, was a day's standing; the result is `15th (+11, 851)`); a tournament in progress shows its next round;
- writes K-State's headline from the schedule's `9th (+4, 844)`: `9th (844)`, `T7th (832)`. The schedule publishes no field size, and Baylor's stories are prose (no standings tables; full results are on Clippd), so none is claimed;
- links each tournament's own story. The women's Charleston Intercollegiate links none; Baylor's story is in the women's golf archive as "Baylor WGolf Finishes in 3rd at Cougar Classic". A story is taken from the archive only when it is dated on the last day, about golf, and states the schedule's own place and score to par ("third-place finish", "5-under" for `3rd (-5, 845)`); it may name the event differently;

The expanded views write highlights from each tournament's story.

**Schedule and story disagree once:** the Schooner Fall Classic schedule reads `9th (+4, 844)`; Baylor's story says "tied for eighth in a 16-team field". The schedule is shown (it is the results source of record).

ESPN publishes no college golf scoreboard, so there is no live score (K-State has none).

## Tennis (`4.47.8-baylor-tennis`)

Production loaded the first tennis page that answered (women's): tournaments as `Baylor vs ITA Texas Regional Championship`, and nothing for the men. Tennis now loads both teams' official pages only, labeled, with `-mens`/`-womens` event ids (both teams played the ITA All-American Championships), and:
- reads tournaments as K-State reads meets: `Women's · Baylor at ITA All-American Championships`, ending on their last day (Sep 19-27); a tournament in progress is today's event (`Blue Gray Tennis Classic`, Oct 2-4, `In progress`);
- leaves out the women's `Green & Gold Fall Scrimmage` (internal);
- lists a past tournament (no team result) only with Baylor's story about it, as Arizona's (#161). The women's Rice Invitational (Sep 25-27) has no story on the schedule or in the women's tennis archive (checked October 3: the archive's 2026-27 stories are the two ITA All-American stories), so it is not listed;
- links each team's own story, dated on the tournament's last day (Sep 27, eight days after the first). The recap matcher checks a multi-day event's own link against its last day, and refuses the other team's story (`/news/.../womens-tennis-...` for the men's event).

The expanded views write highlights from each team's story. ESPN publishes no college tennis scoreboard, so there is no live score.

## Equestrian (`4.47.9-baylor-equestrian`)

Production already showed the three finals with their stories, but with rankings (`#10 UT Martin`) and dates alone, and also loaded the homepage. Equestrian now routes to the official page only, and the reader gives `Baylor vs UT Martin W, 9-6`, published times (`Oct 9, 11:00 AM`), the Oct 2 doubleheader against two opponents as two meets that both link the one doubleheader story, and the championships named after the event (`Big 12` is the `Big 12 Equestrian Championship`, Mar 26-27; `NCEA` the `NCEA National Championship`).

ESPN publishes no equestrian scoreboard, so there is no live score.

## Acrobatics & Tumbling (`4.47.10-baylor-acrobatics-tumbling`)

Production showed the 2026 spring season (Feb 6 - Apr 25, 2026) as current results, with rankings in the names (`#3 Quinnipiac`). The inherited routes also tried `acrobatics-and-tumbling` (SIDEARM's empty "@season @sport" template) and the homepage; schedule and roster now route to `acrobatics-tumbling` only.
- **Current-season filter (every Baylor page-data sport):** only the current academic year (July-June, Baylor time) is current. A page with no current events is a valid empty schedule (`baylorHandlers.isEmptySchedule`, the same school-gated `empty_schedule` hook as Arizona, BYU and UCF): the app shows its empty-schedule note, not a failed source. It fills in when Baylor publishes 2027, with no code change.
- **In season** (the same page read as of Apr 26, 2026): 12 meets, `Baylor at Saint Leo W, 277.415-256.590` (scores have decimals), rankings dropped, each with its recap.

ESPN publishes no acrobatics & tumbling scoreboard, so there is no live score.

## Limitations

- The sports not listed in the status table are still on the shared parsers (see the survey above); each is converted in its own PR.
- Athlete certification for Baylor has not been reviewed yet.
- **Acrobatics & Tumbling 2027 schedule:** not yet published (the page shows "2026 Acrobatics & Tumbling Schedule", checked October 3). It fills in without a code change.
- **Golf field size:** Baylor's schedule and stories publish none in a form that can be verified (full results are on Clippd, a JavaScript page), so headlines read `9th (844)`, not `9th of 16 (844)`.
- **Live doubleheaders (shared code, every school).** On Apr 10, 2026, ESPN listed Baylor's softball doubleheader at Kansas as two games. The shared scoreboard parser gives both the same event id, so one is lost, and the shared reconciliation joins a scoreboard game to the first official game of that day. During a doubleheader the second game's live score would not show. Fixing it changes shared code for every school; it is left for the user to approve.
