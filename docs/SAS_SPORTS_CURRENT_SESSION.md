# SAS Sports — Current Session and School-Module Handoff

Last updated: October 1, 2026, America/Chicago (K-State Volleyball live scores and ESPN scoreboard fix: PR #109; BYU complete: PRs #94, #97–#107; global source cache planned and paused; scheduled feed refresh tried and reverted: PRs #87–#90; polite source fetching: PR #85; Arizona State complete: PRs #66–#83).

**Read this current file at the beginning of every SAS Sports session.** This is the canonical working handoff. Update this same path at each session boundary and append the new session record below. Do not replace current facts with older conversation summaries.

## Current state

**K-State Volleyball live scores; ESPN scoreboards working again; production is `4.37.2-kstate-volleyball-live` (23:48 UTC, October 1).** User, during the K-State vs BYU match: "Can we find a live feed and have live results on the KSTATE volleyball page?" PR #109 (`9606651`):
- **Volleyball scoreboard.** ESPN's women's college volleyball scoreboard is added to `kstateSchool.liveScoreboards`. Today's official card goes Live with sets won and the current set's points (`1st Set · 14-15` in production); a final reads `W, 3-1`.
- **Scoreboard user agent (shared, user-approved, "Do one").** ESPN's edge returns 403 to any user agent carrying a web address, so **every ESPN live score had failed since #85**. Scoreboard requests now send `Mozilla/5.0 (compatible; SAS-Sports/<version>)`; school sites keep the `/bot` identity.
- **Nickname-only matches refused (shared).** Once ESPN answered, New Hampshire Wildcats matched K-State's "Wildcats" alias (a phantom Sep 30 final). Matching now uses ESPN's location, full or short name, or abbreviation only.
- **Gate:** `npm run test:release` and `npm test` passed. CI green. Preview: one live card, no phantom final, XC 18/20 and 26/21, 36/36 forced refreshes.
- **Production:** live card shown, no phantom final, XC 18/20 and 26/21; K-State, Arizona and BYU Football feeds unchanged.
- **Set points on the card, #111 (`caa77a2`, `4.37.3-kstate-volleyball-set-points`).** The user's screenshot showed only "LIVE · 1st Set" and `0–0`, because the live card shows `recency_label` and sets won, never `headline`. The set points now go in `recency_label` as well. Production at 23:56 UTC: `LIVE · 1st Set · 18-21`; XC 18/20 and 26/21. While a game is live the page re-fetches every 30 s.
- **15 s refresh and set points as the big score, #113 (`e6763a4`, `4.37.4-live-refresh-15s`, user: "Make it 15 seconds refresh / Still showing 0-0").**
  - The page re-fetches live games every 15 s.
  - Feeds with a live game (`x-sas-live`) are fresh for 10 s instead of 25 s; school pages stay cached.
  - While live, volleyball's big score is the current set's points, and the status line carries sets won.
  - Production at 00:03 UTC on Oct 2: `25–27 · End of 1st · Sets 0-1`; XC 18/20 and 26/21.
- **BYU Volleyball live, #115 (`4b794ea`, `4.37.5`, user: "Let's update this to byu").** BYU Volleyball uses the same ESPN scoreboard (`byuSchool.liveScoreboards`).
- **Live score over the saved schedule, #116 (`5e140d1`, `4.37.6`, shared).**
  - After #115, one K-State refresh returned only the ESPN game (0 results, 0 upcoming): a one-off kstatesports.com failure, saved over the full schedule.
  - When every official page fails, the live score is now laid over the last good full feed, which is never overwritten by that partial feed. With no saved copy, the request is unavailable.
  - Preview: 36/36 forced refreshes each for K-State and BYU returned the full schedule plus the live card.
  - Production at 00:25 UTC: BYU `20–16 · 2nd Set · Sets 1-0` (11 results, 16 upcoming); K-State `16–20 · Sets 0-1` (12 results, 15 upcoming); XC 18/20 and 26/21.
- **BYU Basketball live, #118 (`b8de8a4`, `4.37.7-byu-basketball-live`, user: "Add live scores for BYU basketball too").** Men's and women's ESPN scoreboards, labeled to match the official cards. Tests use real Houston–BYU events (both Cougars). Production: Basketball unchanged (67 upcoming, no live game until the Oct 16 exhibition); Volleyball still live; XC 18/20 and 26/21.
- **No faster source available.**
  - ESPN sat on "End of 1st" for about 8 min (00:03–00:11 UTC).
  - StatBroadcast (the official live stats) sits behind a Cloudflare bot challenge (403); getting past it would be evasion, so it is not used.
  - ESPN's per-game summary lags the same way, and NCAA.com had no scoreboard file.
- **Limitation:** ESPN's volleyball feed updates slowly (it stayed at 6-9 for over five minutes). The final's `W, 3-1` format is fixture-tested; tonight's real final was not observed in this session.

**BYU: all 12 sports converted; production is `4.37.1-byu-track-field` (23:10 UTC, October 1).** User: "Finish BYU, do all the sports". The agent opened and merged PRs #97–#107 one sport at a time under `AGENTS.md` item 6 (#94 was Football). Each passed the preview gate (K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes, CI green) and was verified in production. The status table and limitations are in `docs/BYU_MODULE.md`.
- Reader features added along the way:
  - `No. N` rankings dropped;
  - plain relative Recap links read;
  - internal games and meets skipped;
  - `TBA`/`TBD` opponents named after their tournament heading (and tennis events named after theirs);
  - card recaps refused when dated outside the event;
  - meet team finishes (`Women's team: 1st · 19 pts`) and golf places;
  - a current-season filter with empty schedules.
- Recap safety:
  - **Recaps must name BYU.** On the Soccer preview, the shared opponent-site fallback had matched a cubuffs.com Colorado vs New Mexico story to the Sep 3 Colorado State game. A recap must now name BYU in its own title or article.
  - **Golf recaps must be final.** On the Golf preview, in-progress "after day one" stories were used. A golf recap must now be dated on or after the last day and state the final place.
  - **Multi-day events** are checked against their last day.
- Shared-code touches, all gated to BYU or behavior-identical for other schools:
  - BYU added beside Kansas in the recap-search day rule;
  - BYU's empty-schedule clause reads the parse result before team labeling (#107 preview returned 502 without this);
  - the regression route check accepts route lists.

**Earlier the same day: BYU module set up and Football converted (`4.36.0-byu-football`, 21:07:49 UTC).** User: "Let's add the next big 12 school". The sandbox still gets HTTP 403 from arizonawildcats.com and baylorbears.com. byucougars.com returns 200, so BYU is the next reachable school in catalog order. PR #94 (https://github.com/egassam/SAS-Sports/pull/94) was merged by the agent under `AGENTS.md` item 6 as `8cbbb30`. Details are in `docs/BYU_MODULE.md`.
- **Setup:**
  - `src/schools/byu.mjs` holds routes for all 12 sports, `combinedSports` and the 3 verified Soccer Instagram tags.
  - 438/438 catalog routes are identical before and after.
  - All ten Worker-evaluating test harnesses inject `byuSchool` and `createByuHandlers`.
  - `regression.mjs` and `protect-certified.mjs` read BYU routes and tags from the module.
- **Football:** byucougars.com is WMT (`schedule-event-item` cards with `<time datetime>` including the local offset).
  - Production showed every upcoming game twice, a phantom `Nov 28 Cincinnati W, 63-7` final, and Iowa State on both Oct 9 and Oct 10.
  - The module card reader (`byuSchool.cardSports`, Football only) now gives 3 finals in K-State format with their own recaps and 9 upcoming games (`Oct 3, 5:00 PM`, `Oct 9, 8:15 PM`, then TBA).
- **Expanded view:**
  - BYU recaps rarely say "football", so the shared matcher rejected all three. Production had shown highlights from other teams' games.
  - `byuHandlers.matchesRecap` drops only the sport-word check, and only for the card's own Recap link. Opponent and date are still required.
  - Production now shows 4 highlights per final, each from that game's recap.
- **The other 11 BYU sports are still on the shared parsers** (read-only production survey, ~21:09 UTC):
  - Volleyball, Soccer, Cross Country, Baseball, Softball, Golf and Tennis mix `Oct 3`-style and `Sat. Oct. 3, 2026`-style events (card + schema data, likely duplicates).
  - Basketball and Swimming & Diving have outright duplicates.
  - Gymnastics shows the January 2026 season as current.
  - Track & Field returns 502 (no usable source).
  - Cross Country finals read `Completed`, with no race rows.

**Scheduled feed refresh (item 3) was tried and reverted; production is `4.34.0-polite-source-fetch` with no Cron Trigger (20:13 UTC, October 1).**
- #87 (`c9c0c65`, `4.35.0-scheduled-feeds`): stored feeds in Workers KV (namespace `sas-sports-feeds`, id `44e354a55a1c43ce8013e40eb2cc9a75`, created this session), plus an every-minute Cron Trigger.
  - The visitor side worked in production: copies built at one location were served at others (`x-sas-cache: stored`).
  - The Cron Trigger started about 6 minutes after deploy, and every scheduled rebuild failed, including feeds visitors built fine. By 19:50 each run was `due 20, built 0, failed 20`. The cause was not established.
  - Leading hypothesis: Cloudflare runs Cron Triggers "on underutilized machines", whose outbound addresses school bot protection may refuse.
- #88 (`47aedb0`): records failure reasons in `/api/feed-store` and pauses a failing feed for 10 min. Merged, CI green, but **Cloudflare never deployed this merge commit**; production stayed on 4.35.0. Why is unknown; check the Workers Builds history for `47aedb0`.
- #89 (`68c3673`, user-approved): reverts #87 and #88. The tree equals `d0c56fc`. Production was back on 4.34.0 at 20:07:17 UTC; `/api/feed-store` 404; XC 18/20 and 26/21; live health 48/48.
- #90 (`091b15e`, user-approved): `"triggers": {"crons": []}` in `wrangler.jsonc`. Omitting `triggers` leaves a deployed Cron Trigger in place. The Worker updated at 20:13:31 UTC; production checks unchanged.
- The `sas-sports-feeds` KV namespace still exists and holds the leftover `prod`/`preview` keys from 4.35.0. It is unused and the keys expire within 7 days; delete the namespace if item 3 is abandoned.
- Item 1 (calendar feeds) was skipped by the user. The four SIDEARM schools block the sandbox, and calendar feeds likely lack scores and recap links.

**Polite source fetching (shared, all schools); production is `4.34.0-polite-source-fetch` (14:16 UTC, October 1).** User asked how to avoid triggering schools' bot defense, chose items 2 (cache school downloads) and 4 (honest identity, robots.txt, Retry-After, conditional requests), and approved the cross-school change. They then said: "Merge it with the 15-second backoff and watch production". PR #85 merged as `4ac60ad`.
- **`src/source-fetch.mjs`** handles every official-site download (schedules, recaps, news listings, rosters, profiles, PDFs, TFRRS, module recap fetches):
  - one copy per Cloudflare location: schedules 2 min, listings/rosters 10 min, articles 30 min, documents 6 h. `refresh=1` rebuilds the feed from the saved page; there is deliberately no way to force a school re-download.
  - expired copies revalidate with `If-None-Match` / `If-Modified-Since`.
  - 429/503 honour `Retry-After` (at least 60 s); any other refusal pauses that page 15 s. Articles and documents keep serving their last good copy; schedules never do.
  - `robots.txt` is obeyed (a `SAS-Sports` group wins over `*`) and kept for a day.
  - at most one Cache API `match` and one `put` per download (the paid plan allows 1,000 Cache API calls per request, shared with fetches).
- **Identity:** user agent `Mozilla/5.0 (compatible; SAS-Sports/<version>; +https://sas-sports.lovetogivepain.workers.dev/bot)`. `public/bot.html` describes the fetcher. The Instagram portrait fetch no longer sends a fake Chrome UA; preview and production portraits were unchanged.
- **`/api/diagnostic`** rows now include `source_cache` (`network`, `fresh`, `revalidated`, `stale-on-error`, `backoff`, `robots-disallowed`) and `upstream_status` during a backoff.
- **robots.txt survey (sandbox):** 28 of 68 school sites served it; 40 returned Imperva/Incapsula 403. None of the 28 disallow schedule, roster or news paths. mgoblue.com, texaslonghorns.com and texastech.com disallow `/documents/`, so their PDF results will be skipped when those schools are converted.
- **Unexplained preview event:** on the first preview commit (60 s backoff), K-State XC failed at IAD for at least 90 s (refused, then held in backoff) while production at IAD fetched fine. Not reproduced; the backoff was shortened to 15 s, and the final gate passed 14/14 at IAD. If refusals appear only on 4.34.x, suspect the new user agent first.
- **Test harnesses** that `eval` `src/index.js` must inject `createSourceFetch` and `SOURCE_TTL` (done in all ten).

**Arizona State: all 17 sports converted; production is `4.33.3-arizona-state-swimming-diving` (October 1 UTC).** User: "Start next school. Stay in the Big 12." (Arizona State chosen: Arizona and 7 other Big 12 sites return 403 to the sandbox), then "Do all the sports. Do not ask me unless it's necessary". The agent opened and merged PRs #66 and #68–#83 one sport at a time under `AGENTS.md` item 6. Each passed the preview gate: K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes, CI green. Each was verified in production. The status table and limitations are in `docs/ARIZONA_STATE_MODULE.md`.
- **Cause:** thesundevils.com's `schedule-event-item` cards defeat the shared WMT card reader: it takes the nested `vs.`/`at` divider for the opponent and splits `<time>Sep</time><time>5</time>`. The result was `ASU vs vs.` events merged together, evening games a UTC day late, phantom finals, and past seasons shown as current.
- **The module reader** (`createArizonaStateHandlers().parseSchedule`, hook in `parseHtml`) is now used for every sport. It provides:
  - card years from the page's JSON-LD;
  - only the current academic year (July–June); past-season pages become empty schedules;
  - K-State-style results and recaps;
  - published local times;
  - team-labeled two-team sports (Basketball, Golf, Swimming & Diving, Tennis), with `-mens`/`-womens` event ids;
  - Cross Country race rows from official recaps (`attachMeetResults`, same three school-gated hooks as Utah).
- **Routes:** only official pages (`ice-hockey`, `track-field`, `mens-`/`womens-` pages). Swimming & Diving was 502 on the inherited `/sports/mens/swimming-diving/` routes.
- **Test correction:** #72–#75 were merged without their fixture tests; a helper's insertion anchor had stopped matching. Their PR texts implied the tests were there. The tests were added in #76; they pass, and mutations fail them.
- **Transient:** right after the #79 merge, one production K-State XC read was 2/20. Three immediate forced refreshes returned 18/20, the same kstatesports.com recap flake seen September 30.
- **Still open for Arizona State:** see Limitations in `docs/ARIZONA_STATE_MODULE.md`: Golf field size, XC team scores, the tennis recap match. The spring sports become non-empty once thesundevils.com publishes 2026-27 schedules; no code change is needed. Athlete certification for Arizona State was not reviewed this session.

**Reliability (September 30, user-approved, all merged and verified in production).** The user's screenshot showed Utah Basketball "LIVE SOURCE UNAVAILABLE".
- **#53 (`f5833e4`) fixed the cause.** Cloudflare 1102 (Worker CPU limit): `scheduleYearForDate` converted the whole page to text once per game card, costing 177–417 ms of CPU per ~900 KB SIDEARM page. It now reads the page once (32–48 ms), with byte-identical output. Production went from 8/36 forced-refresh failures to 36/36 successes.
- **#54 (`cd7cba8`):** `tests/parse-budget.mjs` fails if a parse converts a large page to text more than 4 times, or exceeds 400 ms. It runs in `npm test` and `test:release`.
- **#55 (`76a7b74`):**
  - Every successful feed also saves a 7-day last-good copy.
  - `cached=1` serves saved copies without rebuilding.
  - After a failed load, the app shows the last good copy (from the server, then from the device's localStorage), labeled "Saved schedule · updated X ago".
  - `VERSION` is unchanged.
- **Still open:**
  - At some Cloudflare locations (seen at Toronto, YYZ), every forced rebuild fails with 1102 while cached feeds load. Old and new code behave the same, so this is probably the account's per-request CPU limit.
  - The user was asked to check the Cloudflare plan: Workers Free allows 10 ms of CPU; Workers Paid ($5/month) allows 30 s.
  - **Resolved later on September 30:**
    - The user upgraded the Cloudflare plan. Forced refreshes via Toronto then passed 10/10, and the full health check 48/48.
    - The daily live health check (#3) is merged: `.github/workflows/live-health.yml`, daily at 11:23 UTC, plus manual runs. `npm run test:live-health` runs it locally.
    - It force-refreshes every sponsored sport of K-State, KU, Oklahoma State and Utah. It fails on any sport still failing after 3 attempts, or on a first-attempt 1102 rate above 5%.
    - The load-test merge rule is in `AGENTS.md` item 6 (PR #57, merged by the user).
  - The pre-merge load-test rule (#2) was drafted for the user to add to `AGENTS.md`; the agent does not edit that file.
- **Testing note:** Cloudflare's cache is per location, and requests from the sandbox alternate between IAD, ATL and EWR. A copy saved at one location is not visible at another. Node's `fetch` in the sandbox bypasses the proxy and reaches YYZ; use curl, or `NODE_USE_ENV_PROXY=1`.

**Utah: module set up, and 8 sports fixed; production is `4.31.5-utah-tennis` (September 30 UTC).** The user chose Utah ("Let's start the next school" → "Utah") and approved the agent merging the setup PR. Every PR below was verified on its branch preview (K-State XC 18/20, KU XC 26/21 each time), merged by the agent under `AGENTS.md` item 6, and verified in production. Details are in `docs/UTAH_MODULE.md`.

| Sport | PR | Production |
| --- | --- | --- |
| Setup (route parity) | #44 | `src/schools/utah.mjs`; 219/219 routes identical |
| Football | #45 | `W, 31-17` with exact recaps; published start times. The SIDEARM page-data reader moved to `src/sidearm-schedule-data.mjs` (Oklahoma State unchanged) |
| Cross Country | #46 | Race rows from official recap tables: `Women's team: 2nd · 107 pts`, runners, `Women's Open` group |
| Beach Volleyball | #47 | Showed indoor volleyball matches. Now uses the real `womens-beach-volleyball` page; the 2025 season there is past, so the app shows the empty-schedule note |
| Lacrosse | #48 | Spring 2026 games shown as current. Now `mens-lacrosse` only, with the empty-schedule note |
| Skiing | #49 | Was 502. Now `alpine-skiing`: 31 races of 2027, labeled `Denver Invitational · Giant Slalom` |
| Golf | #50 | Only today's round. Now `mens-golf`, one event per tournament (Jackson Stephens Cup final + recap; Mark Simpson today; 11 upcoming) |
| Tennis | #51 | Women only. Now both teams, labeled (26 women's + 22 men's) |

- **Root cause of the out-of-season failures (user report: "Utah's sports out of season are not working properly"):**
  - Several inherited routes used slugs utahutes.com does not have. Those render SIDEARM's empty "@season @sport" template, whose site-wide ticker lists other sports' events.
  - Spring sports' pages keep showing last season.
  - The Utah module now:
    - routes to the real slugs;
    - for Beach Volleyball, Lacrosse and Skiing, keeps only events in the page's own schedule data and in the current academic year (`filterEvents`, with an `empty_schedule` flag).
- **Checked and correct:**
  - Gymnastics: only the Dec 12 Red Rocks Preview is published for 2026-27.
  - Swimming & Diving: both teams, labeled.
  - Baseball, Basketball and Softball: upcoming only.
  - Track & Field: empty-schedule note.
  - Soccer and Volleyball: already in K-State's format.
- **Still open for Utah:**
  - **Volleyball athlete certification** fails ("no verified Instagram destination"). The Worker found one verified Instagram among the roster profiles, and two slots use official profiles. The fix (Oklahoma State's opt-in `athlete_profile_fallback_sports`) needs the official roster checked first. The roster returned 403 to the sandbox all afternoon, so nothing was changed.
  - **Golf placings:** the page publishes none, so completed tournaments read `Completed`.
  - **Start times** are enabled only for Football.
- **Utah finish (later September 30; user: "Start new session and finish Utah"):**
  - **Volleyball start times, #59 (`999baa0`, `4.31.6`):** production shows 16/16 upcoming timed. Kansas State (Oct 3) keeps the card's 5:30 PM because Utah's own page data disagrees (5:00 PM).
  - **Volleyball athletes, #60 (`ff73a87`):** the official roster has 19 players and 1 personal Instagram. Volleyball is added to Utah's `athlete_profile_fallback_sports`; Utah certification is 4/4.
  - **Soccer start times, #61 (`56bdb41`, `4.31.7`):** production shows 8/13 upcoming timed. The 5 postseason placeholders have no published time.
  - **Softball doubleheaders, #62 (`cdb4c11`, `4.31.8`), merged with the user's approval ("Yes to both"):**
    - The Oct 11 doubleheader vs Southern Utah showed as one game.
    - The Utah module now restores each unplayed doubleheader game (Softball, Baseball) as Game 1 / Game 2.
    - It needs one shared line: `eventMergeKey` includes `game_number` when an event has one. Output for all other saved pages is byte-identical.
    - The preview showed 5 games, K-State XC 18/20, KU XC 26/21 and a 36/36 load test.
  - **Blocked by utahutes.com 403 all evening, not changed:**
    - Baseball page (4/58 upcoming timed in production).
    - Women's Basketball page.
    - Men's Basketball: its page lists 36 of 40 games as TBA, so there are almost no times to add yet.
  - **Golf placings:** Utah publishes no placing field. The Jackson Stephens Cup recap gives a match-play bracket result ("ties for second place in match play"), not a stroke-play place. Golf stays `Completed` with the official recap.
  - **Softball** was already fully timed.
  - **Route cleanup, #64 (`920650c`, `4.31.9`), one batched PR with the user's approval:**
    - Baseball, Basketball, Gymnastics, Softball, Swimming & Diving and Track & Field route only to their official pages.
    - A test requires every Utah route to be a sport page the site lists.
    - Preview and production feeds were identical to before for all six sports (36/36 load test each).
  - **Production verification:**
    - Softball shows Oct 11 Game 1 at 1:00 PM and Game 2 at 3:00 PM.
    - K-State XC 18/20, KU XC 26/21 after both merges.

**Merge permission (user, September 29–30).** The user added a standing merge permission to `AGENTS.md` item 6 (commit `afc7ed4`). Follow its conditions exactly.

**Oklahoma State: all sports checked against K-State; production is `4.29.12-oklahoma-state-equestrian-times` (September 30 UTC).** The user said "Finish all of Oklahoma State". Each sport was fixed, verified on its preview, merged by the agent under `AGENTS.md` item 6, and verified in production, one at a time:

| Sport | PR | Production |
| --- | --- | --- |
| Football | #27, #30 | `W, 41-24`-style results with exact recaps; verified expanded highlights; published start times |
| Golf | #28 | Placings as `7th of 16` |
| Track & Field | #29 | 200 `[]` instead of 502 |
| Soccer, Softball, Baseball, Basketball, Wrestling, Equestrian | #31–#36 | Published start times; results unchanged (already in K-State's format) |
| Cross Country | #23 | Complete since September 29 |

Details are in `docs/OKLAHOMA_STATE_MODULE.md` under "All sports vs K-State".

Still open for Oklahoma State:
- **Tennis:** empty feed, which matches K-State's behavior; it is a source gap, not a parser bug.
  - The men's page is the "2026-27 Cowboy Tennis Schedule" (downloaded September 30). It lists only 4 fall individual tournaments, all already over: UTR Shootout Stillwater (Aug 29–30), UTR Shootout Tulsa (Sep 12–14), ITA All-American Championships (Sep 19–27) and UTR PTT Norfolk (Sep 21–27).
  - The women's page is still the 2025–26 schedule.
  - Past tournaments without a team result are not listed. K-State is the same: its women's page parses 16 events, and its feed shows only the 8 upcoming (Oct 2–Nov 17) with 0 results.
  - Oklahoma State's feed stays empty until okstate.com publishes October-onward events.
  - Correction: the September 29 note that the men's events were "outside 2026–27" was wrong. It had been inferred from the feed, not checked against the page.
- **Women's Basketball:** start times unverified. Its page returned 403 to the sandbox; the preview showed no timed games.

**Working rule (user, September 29): one sport at a time.** Within a school, fix, verify and publish one sport before starting another. K-State's output is the reference each sport's results section must match.

**Oklahoma State Cross Country is merged, deployed and verified in production.** The user merged PR #23 (https://github.com/egassam/SAS-Sports/pull/23) at about 18:26 UTC on September 29 as merge commit `0629321`. PR #24 (`ae5e65f`, feed retry) merged afterwards, so production now reports `4.29.2-feed-retry`; it carries the same Cross Country code.

At 19:00 UTC, forced production feeds matched K-State's format, and `/live/highlights` was identical to the feed for both meets:

| Meet | Rows | Headline |
| --- | --- | --- |
| Cowboy Preview | 31: `Women's 3K`, then `Men's 5K` | `Women's team: 1st · 26 pts / Men's team: 1st · 31 pts` |
| Cowboy Jamboree | 37: `Women's 6K` (15 athletes), then `Men's 8K` (20 athletes) | `Women's team: 2nd · 64 pts / Men's team: 2nd · 44 pts` |

The table below is the pre-fix production state (user report, September 29), kept for history:

| Item | K-State (reference) | Oklahoma State now |
| --- | --- | --- |
| Result groups | One group per race, labeled by division and distance (`Women's 6K`, `Men's 8K`), with the team row first | Team and individuals split into separate groups (`Men's Team`, `Men's Individual Results`), with no distance |
| Order | Women first, then men | Men first |
| Headline | `Women's team: 18th · 499 pts / Men's team: 17th · 449 pts` | Raw schedule text for one team only (`1st - 31 pts.`) |
| Cowboy Jamboree (Sept 26) | n/a | 1 row, `Result: 2nd - 44 pts.`, with no athletes, although the official results PDF and recap links are present |
| Recap fields | `recap_result_count` set; highlights from the official recap | No `recap_result_count` in the feed |
| Schedule source | n/a | Only the men's `mxct` schedule; the women's program schedule is not loaded |

Cowboy Preview does carry 31 correct rows: both teams 1st (men 31 pts, women 26 pts), 15 men and 14 women with places and times. Its data is right; its format is not.

**Oklahoma State module is merged, deployed and live as `4.29.0-oklahoma-state-module`.** The user merged PR #21 (https://github.com/egassam/SAS-Sports/pull/21) at 17:31 UTC on September 29 as merge commit `da5b91efa3647fed90dc0a1ef247db89f4d05992`. Production verification is recorded under "Oklahoma State production verification" below. See `docs/OKLAHOMA_STATE_MODULE.md`. Oklahoma State's athlete-certification failure was a validator rule, not an app defect. It is fixed by the new opt-in `athlete_profile_fallback_sports` certification field, which affects only Oklahoma State. Verified schools are now K-State, KU and Oklahoma State. Utah and Alabama still fail athlete checks unchanged.

**Project scope (user, September 29): only K-State and KU are expected to work correctly now.** Every other school still needs its own school module built the same way as `src/schools/kstate.mjs` and `src/schools/kansas.mjs`, one school per session, with tests against that school's real official sources. Until a school is converted, its live-certification failures are expected. They are not regressions and not a reason to patch that school inside shared code. As of this date, Oklahoma State, Utah and Alabama fail athlete-Instagram checks, and the other 13 non-module schools pass only the basic certification checks.

**The September 29 local-time fix is merged, deployed and live as `4.28.1-local-time`.** PR #19 merged at 15:25 UTC as `79c157d8ce8349439cab3c23931d46f5fb920682`, and production switched at about 15:29 UTC.

Official schedule times are stored as the school's local wall clock, while ESPN times are true UTC and "today" was computed in UTC. So a 7 PM Central K-State game failed to reconcile with its ESPN score, appeared as a separate next-day Live card, and dropped out of Upcoming at 00:00 UTC. The fix adds a per-school time zone (a state map plus a Tennessee override). It converts ESPN times into that frame and uses the school's local date in the shared `makeEvent`, `groupEvents` and text-row checks and in the KU module.

An actual evening game has not yet been observed through the fix; deterministic fixtures cover it.

**K-State live display preview is deployed.** PR #18 corrected the initial PR #17 preview after the user selected Football and saw an empty Live tab. The opt-in URL `https://sas-sports.lovetogivepain.workers.dev/?school=kstate&demo=live` now opens on Football + Live with a persistent, clearly labeled 28–21 sample and supports Basketball's 71–68 sample when selected. The button moves the example through Final, Upcoming, and Live while selecting the corresponding tab. The regular app and feed API retain genuine data only. This demonstrates display states, not a real in-progress ESPN game. September 29 forced Football and Basketball production feeds had no live K-State contest.

**The September 28 K-State dual-team and live-score work is complete, merged, deployed, and live as `4.28.0-kstate-live-scores`.** PR #15 added explicit men’s and women’s K-State Golf sources and labels while preserving both Basketball teams. Production Golf verification returned both divisions, 4 results and 22 upcoming events. PR #16 added independent ESPN scoreboard inputs for K-State Football and both Basketball programs, merged at application commit `a23a16b3b1d2a5fafec5327041953fcb4b672d43`. The scoreboards run alongside the official K-State schedules, reconcile on sport/date/division, and can supply a game even when the school schedule has no usable live state. Production returned the new version and healthy current Football/Basketball feeds; no K-State game was in progress at verification time, so an actual live-game transition was not observable. Historical live payload fixtures verify score, clock/period, final state, team identity, and men’s/women’s isolation.

**KU module is complete, merged, deployed, and live as `4.26.1-kansas-recap`.** PR #14 merged at 13:54:46 America/Chicago on September 28, producing `c9a02452107bad023ff06214f4ba99668f06d5a4`. Post-merge certification run `36468538013` passed. Production status and the exact South Dakota State volleyball event were rechecked after deployment: the card now uses the correct September 11 KU recap and its expanded endpoint returns four verified event-specific highlights. The broader KU verification below remains accurate, with the documented tennis, softball, and track source limitations. KU is finished; do not begin another school until the user starts a new school-module session.


**K-State module extraction is complete, merged and live as `4.25.0-kstate-module`.** [PR #12](https://github.com/egassam/SAS-Sports/pull/12) was merged after user approval on September 27 at 14:50:17 UTC (09:50:17 America/Chicago), producing application commit `30d6edd0f46f1ceebaed1fd7f5eca54921f0f095`. This completion session verified the production version and opened both expanded cross-country races in the live app. Gans Creek retains 18 rows (9 women, 7 men, 2 teams); Platte River retains 20 rows (11 women, 7 men, 2 teams). KU is being completed in the September 28 session below.

**Outstanding shared operational issue:** post-merge workflow run `36327362690` failed its live cross-school-isolation job with HTTP 503 / Cloudflare Error 1102 (Worker exceeded resource limits). Guardrails, certification matrix and Cloudflare build passed; dependent live-school certification was skipped. Do not report the full live audit as passing. K-State module completion means extraction parity plus the scoped live verification below, not fresh certification of every sport.
See `docs/KSTATE_MODULE.md` for the ownership inventory and test contract. K-State's existing school-specific backend policies are now in `src/schools/kstate.mjs`; generic publisher logic and shared catalog/display metadata remain shared.

| Item | Verified value |
| --- | --- |
| Repository | `egassam/SAS-Sports` |
| Default branch | `main` |
| Live K-State page | https://sas-sports.lovetogivepain.workers.dev/?school=kstate |
| Working application version | `4.28.0-kstate-live-scores` |
| Verified application commit | `a23a16b3b1d2a5fafec5327041953fcb4b672d43` |
| Pre-extraction recovery tree | `b8b7958477f593181f8ba2e52355e65f768c5bb8` |
| Preserved baseline branch | `checkpoint/kstate-xc-verified-20260926` |
| Baseline branch target | `19ec2ecb2ac03b8c7d242cb14a23146878857ab0` |
| Merged correction | https://github.com/egassam/SAS-Sports/pull/11 |
| Correction commit | `0d7212d952a1f1c4254b6e699cbfeeb2331a712b` |
| Prior KU correction | https://github.com/egassam/SAS-Sports/pull/10 |

The baseline branch is a named recovery checkpoint. Do not move it during normal development. Documentation commits after this application commit do not represent additional application changes. Use the current main branch for new work, retaining the September 26 baseline branch target as the pre-extraction comparison/recovery reference.

## What was fixed and why it mattered

The September 4 Platte River Rumble Gold event had a saved, exact-event table built from the official recap. Its reliable results were not dependent on live AI generation.

For September 25 Gans Creek, the live feed selected only the women's result PDF, returning nine women and marking the result verified. The expanded view used a separate prose parser that could overwrite those rows with incorrect results. One observed response contained an incorrect men's team win and an athlete named `Junior Brock`; AI returned `ai_failed`. Generic TFRRS enrichment could also replace the original race's good table with malformed group labels and `0th` DNF/DNS rows.

The deployed K-State-only fix reads the exact official recap's labeled women's and men's team-finishes and individual-results sections. It extracts division/distance, K-State team placing/points, and each published athlete/place/time. Both the feed and expanded view use that same result path. Complete recap rows cannot be overwritten by a single PDF or AI/prose extraction. Incomplete or unavailable sections are explicitly marked partial. A matching future recap does not require a new hand-entered race record.

Official recap sources:

- https://www.kstatesports.com/news/2026/9/25/cross-country-wildcats-showcase-significant-personal-improvement-at-gans-creek-classic
- https://www.kstatesports.com/news/2026/9/4/cross-country-k-state-clinches-team-wins-at-platte-river-rumble-gold

### Verified live results (rechecked September 27)

| School / event | Women | Men | Team rows | Total rows |
| --- | ---: | ---: | ---: | ---: |
| K-State — Gans Creek | 9 | 7 | 2 | 18 |
| K-State — Platte River Rumble Gold | 11 | 7 | 2 | 20 |

Gans Creek: women 18th / 499 points; men 17th / 449 points. The expanded live page displayed every runner, including the final listed women and men, with the expected names, places and times. Platte River's expanded live page retained the complete original table and highlights.

KU's live feed after the September 26 correction retained 26 Gans Creek rows and 21 Bob Timmons rows. Those KU live counts were not rechecked in this completion session. This is a scoped K-State/KU verification, not a claim that every sport at every school is currently correct.

### September 26 correction validation

- `npm run test:release` passed.
- `npm test` passed.
- `git diff --check` passed.
- Offline esbuild Worker bundle passed.
- Wrangler deployment dry-run passed after user approval.
- Actual downloaded K-State schedule/recap processed through production `fetchLive` and expanded-event code: 18/20 rows and matching feed/modal results.
- GitHub PR guardrails and certification-matrix jobs passed before merge (workflow run `36276099363`). Live-school jobs intentionally skipped for this PR.
- Remote correction tree matched the tested local tree exactly.
- Production status confirmed `4.24.1-kstate-recap-results`.
- Browser verification opened both K-State races and checked full result text and layout after deployment.
- Local regression protections covered the original K-State record, KU records, school/date identity, later matching recaps, incomplete/failed sources, 18 certified schools and 71 school/sport cache identities.

## School-module direction agreed with the user

The app should have one module per school, with sport handlers inside each school module as needed. School-specific source selection, schedule parsing, recap extraction and athlete verification belong there. Shared display, selection, refresh, caching and standardized event/result structures remain shared.

Separate files alone do not guarantee isolation. Test each module against that school's real publisher formats, and test shared changes against verified schools. Keep complete men's/women's result sections and source links in a consistent result format.

Agreed sequence:

1. **Completed:** preserve today's working version as the baseline.
2. **Completed:** K-State module extraction, approved merge/deployment, and scoped live cross-country verification.
3. A separate later session: bring KU's existing cross-country adapter into the school-module structure.
4. Correct and verify each remaining school individually, one school per new session.

The September 26 “Do the first one” applied to baseline preservation. The separate September 27 “Start KSTATE module” request authorized the extraction now prepared on its own branch.

## Instructions for the next session

- **Live scores (ESPN), open checks:**
  - Watch a real volleyball final reach the card as `W, 3-1` (fixture-tested only).
  - Watch a K-State or BYU basketball game go live (season from Oct 16).
  - Consider giving football/basketball finals K-State's `W, 71-68` wording: today a scoreboard final overwrites the official headline with `71–68`.
  - ESPN lags, especially between sets. StatBroadcast is behind a bot challenge; do not work around it.
- **Global source cache (paused by the user, October 1):** one copy of each school page for all Cloudflare locations, via one Durable Object per school site. The plan is in the session record below. Do not start it until the user switches the Worker to Cloudflare "Worker Previews" (dashboard; irreversible). The current Builds preview model (Version URLs) generates no preview URLs for Workers with a Durable Object, which would break the merge gate.
- **BYU is complete** (#94, #97–#107). Gymnastics and Track & Field become non-empty when byucougars.com publishes 2026-27 schedules; no code change is needed. Open items are under Limitations in `docs/BYU_MODULE.md` (athlete certification not reviewed). Next: the next Big 12 school the user names. On October 1, arizonawildcats.com and baylorbears.com still returned 403 to the sandbox; ucfknights.com (SIDEARM) returned 200.
- **Scheduled feed refresh (item 3), if retried:** start from the #87/#88 code (`git show c9c0c65`, `47aedb0`). First deploy only the failure reporting with the Cron Trigger rebuilding one feed, read `/api/feed-store` `last_run.errors`, and confirm the deploy actually landed (the version flips on `/api/status`) before enabling more. If schools refuse Cron-Trigger traffic, the scheduled approach does not work on Workers. An alternative is Cloudflare Queues or a Durable Object alarm, which may run on different machines; that is unverified.
- **Source fetching (PR #85):** use `/api/diagnostic`'s `source_cache`/`upstream_status` to tell a school refusal from a parser fault. Still open from the bot-defense discussion: (1) per school, prefer SIDEARM calendar (.ics)/RSS feeds over full HTML pages, one sport per PR, during that school's session; (3) a scheduled Cron prefetch so visitors never trigger downloads; (5) when a site blocks the sandbox, ask the user to save the page from their browser as a fixture; (6) ask schools/SIDEARM for allowlisting or a feed. The user has not said whether `/bot` should list a contact address; do not add their email without being asked.
- **Arizona State is complete** (see "Current state"). Next: the next Big 12 school the user names. Most Big 12 sites returned 403 to the sandbox on October 1; ucfknights.com, byucougars.com (custom platform) and gobearcats.com (custom) returned 200.
- **Utah is complete except for source-blocked items:** Baseball and Women's Basketball start times, once utahutes.com allows the page downloads (fixture-verified, one sport per PR). Earlier list, for reference:
  - Volleyball athlete certification: get the official `womens-volleyball` roster (403 on September 30). If it publishes no personal links for most players, add Volleyball to Utah's `athlete_profile_fallback_sports` in `tests/certified-schools.json`, as done for Oklahoma State.
  - Golf placings, if a verifiable official source exists.
  - Start times for the other game sports (Soccer, Volleyball, Baseball, Softball, Basketball) via the page-data enricher's `timeSports`, each checked against its page.
  - Utah routes still carrying unused generic or homepage candidates: Baseball, Basketball, Gymnastics, Softball, Swimming & Diving, Track & Field. They work today; remove them only with a fixture-backed check.
  - utahutes.com returns HTTP 403 to the sandbox on most attempts. Retry with spacing; do not circumvent.

- **Oklahoma State is complete except for source-blocked items.** When okstate.com lets the sandbox download them:
  - Take the women's Basketball page as a fixture and check its times.
  - Watch for October-onward Tennis events on either page. The men's 2026–27 page was inspected September 30; see the Tennis note above.

  One sport per PR, as before.
- **Other Oklahoma State follow-ups:** the women's cross country/track roster; deep recap certification.
- **Observed outside scope (not changed):** K-State Football's Sept 26 Cincinnati expanded view uses a Cincinnati-site article whose URL says "31-20", but the game was 31–26. Check it in a K-State session.

  Otherwise, start the next school the user names.

- Next work: convert the next school the user names into its own module. Before or with the first conversion, consider defining a common school-module interface (schedule parser, recap matcher, results handlers, scoreboards, time zone). Shared code should then look up handlers by school instead of using `school.id==='kansas'` / `'kstate'` branches.
0. If the user approves, merge PR #19 (local-time fix; preview already verified), confirm CI, merge, and verify production `/api/status` returns `4.28.1-local-time`. Then check a forced K-State Basketball feed during an evening game if one is available. Until then, the fix is local/branch-only.
1. Read this file from current GitHub main and inspect the current source/version before editing.
2. KU and K-State are complete. Start no additional school until the user names it in a new school-module session; do not reopen PR #12 through #16.
3. Keep one school per session. After KU is complete, stop; wait for the user to name the next school in a new session.
4. Preserve K-State's 18/20 and KU's 26/21 XC rows. Keep all deterministic module, school and cache protections; run `npm run test:release` for code changes.
5. Do not claim all sports have finals where the school has not published results. KU tennis/softball/track source limitations are in `docs/KANSAS_MODULE.md`. Reviewed golf rows apply only to four exact unchanged articles.
6. Update this same handoff with actual publication/live evidence and append the session record. The previous cross-school resource-limit failure remains unresolved unless fresh evidence establishes otherwise.


## Publication and permission history

Automatic review initially blocked a Cloudflare dry-run and a GitHub push pending explicit publication approval. The user then approved pushing the fix to `egassam/SAS-Sports`, merging it, and deploying to the existing Cloudflare app. Publication and deployment subsequently succeeded.

Shell `git push` had no GitHub credentials. The connected GitHub tools successfully created the exact tested tree, commit, branch and PR. PR #11 was merged after checks passed. Cloudflare's existing GitHub integration deployed it; no separate direct deployment was needed.

The earlier `docs/KSTATE_CROSS_COUNTRY_CHECKPOINT.md` records pre-approval blockers. This current handoff supersedes that document's publication status. Prior approval was for the completed correction; it is not blanket authorization for unrelated future actions.

## Session conversation — September 26, 2026

This record preserves the user messages and substantive final assistant replies visible in this session. Progress/tool activity is summarized afterward; this is not a raw tool-log export or a reconstruction of earlier sessions.

### User — reported regression

> Now KSTATE cross country isn't working correctly. Only women show up in the new race.
> Figure out why everything works perfectly in the first KSTATE cross country event and repeat it. I believe you used AI to go into the official recap to get the results for our results page

### Assistant — diagnosis, implementation and approval request

I found the cause and fixed the code, **but it isn’t live yet**.

The first race uses a complete saved table from its official recap. The new race was reading only the women’s PDF; opening it then triggered another parser that produced incorrect results.

The fix reads both labeled sections directly from the recap, producing **nine women, seven men, and both team scores** in the first race’s format. Tests pass, including protection for the original event and KU.

Automatic approval review blocked both GitHub publication and the Cloudflare check because they send code externally.

**Approve pushing this fix to `egassam/SAS-Sports`, merging it, and deploying to your existing Cloudflare app?** I’ll then verify the live results page.

### User — approval

> Approve

### Assistant — verified completion

**Fixed and live.** I verified both expanded K-State results pages:

- **Gans Creek:** all nine women, seven men, and both team scores.
- **First race:** all 20 original result rows preserved.

[Open SAS Sports](https://sas-sports.lovetogivepain.workers.dev/?school=kstate) and tap **Refresh**.

A screenshot of the live results was included in the reply. Saved filename: `SAS_Sports_KState_Verified_Results_20260926.jpg`.

### User — school-module proposal

> This looks great now to me I think moving forward we should make corrections to each school making each school a single module? What do you think?

### Assistant — recommended architecture and sequence

**Yes. Each school should have its own module, with a shared core keeping SAS Sports consistent.** That would make school-specific corrections easier to contain and test.

I’d organize it this way:

| Part | Responsibility |
| --- | --- |
| **School module** | Official sources, schedule formats, recap extraction, and athlete verification for that school |
| **Sport handlers within it** | Cross-country tables, football scores, tennis results, and other sport-specific differences |
| **Shared core** | Display, school selection, refreshing, caching, and a standard results format |

Every school would deliver the same structured information to the app. For cross country, that means clearly labeled divisions, team scores, athlete names, places, times, and source links.

**Moving code into separate files alone won’t prevent regressions.** Each module also needs tests using that school’s actual official pages, plus checks that shared changes preserve working schools.

I recommend this sequence:

1. Preserve today’s working version as the baseline.
2. Move K-State’s working logic into its school module and verify identical output.
3. Bring KU’s existing cross-country module into that structure.
4. Correct and verify each remaining school individually.

That gives us a repeatable process: **fix one school, verify its results in the live app, then move on.**

### User — save baseline, conversation and session workflow

> Do the first one them we will saving the conversation into a .md file, then end this session. We will start a new session for each school module going forward. Each new session I want you to read the current .md file to begin the new section.

### Assistant — scope confirmation and completed handoff

The assistant explained that “the first one” means preserving today's working baseline, then saving this conversation and a current handoff file. A repository startup instruction was added to read this file before each future school-module session. No module migration was started.

### Progress and tool activity summary

The current repository, merged KU work, live feed, expanded-result API, and K-State's official recap pages were inspected. The women's-only feed and incorrect expanded results were reproduced. The scoped fix and meaningful regression tests were written and tested against actual source HTML. After approval, the exact tested tree was published through GitHub, merged, and deployed by the existing Cloudflare integration. Both K-State races were opened in the live browser; KU's feed was checked for preservation. The working application commit was then preserved on a named checkpoint branch, and this current handoff plus root startup instructions were saved. Application code was unchanged during the final baseline/documentation step.

## Future session records

Append each new school-module session here. Keep the current-state and next-session sections above accurate so the next session can begin without reconstructing the entire history.


### September 27, 2026 — save verification and completion

The user asked, "Did you finish before I ran out of usage?" The assistant initially could not verify the handoff save from conversation history. The user then instructed, "Confirm saving."

Direct GitHub inspection confirmed the recovery branch checkpoint/kstate-xc-verified-20260926 exists at 19ec2ecb2ac03b8c7d242cb14a23146878857ab0. The handoff and startup instructions existed in local documentation commit 9735515 but were absent from GitHub main. This session publishes those documentation files to finish the authorized save. The earlier wording that the handoff was saved referred to the local copy; the GitHub save was outstanding.

Scope clarification: the requested "first one" in the September 26 sequence was preserving the working baseline, which was completed. School-module migration was deliberately deferred to the next session. K-State remains the next module. This session changes documentation only; no new application tests or live verification were performed. The September 26 results above retain their original verification date.


### September 27, 2026 — K-State module implementation

User: “Start KSTATE module.” Earlier in the thread the user ended the save session; no module changes had been made at that point. This request begins the actual module implementation.

The current GitHub handoff and AGENTS.md were read before work. Main was fetched at `3ed968bda3ecef6bf6003b0663456e2beab7d383`; an isolated worktree/branch was created from that commit. The previous application baseline passed the release suite before extraction.

Implemented `src/schools/kstate.mjs`: six schedule overrides, three verified tennis identities, institutional social exclusion, five saved soccer recaps, original meet snapshot/highlights, and all K-State cross-country guards/parser/completeness/enrichment. Common publisher helpers, cache behavior, UI and shared metadata remain in their existing owners. Existing test harnesses now inject the real module. Added a permanent module test and frozen pre-refactor baseline fixture. Candidate version is `4.25.0-kstate-module`.

Validation actually completed:
- `npm run test:release` passed, including 18 protected schools and 71 critical school/sport cache identities, KU and K-State cross-country checks, and the new module test.
- `npm test` passed, including roster social identity checks.
- All ten K-State schedule/roster route outputs, five soccer enrichments and three verified tennis identities passed baseline checks; the tennis accounts were tested through the featured-athlete function with a deterministic roster fixture.
- Before/after comparison preserved 218 catalog school/sport schedule and roster route combinations and all saved game/social/source maps.
- Saved official K-State schedule/recap HTML replayed through production fetchLive and expanded results produced matching outputs (ignoring execution timestamps), including 18 Gans Creek rows and 20 Platte River rows.
- Offline esbuild bundle and actual bundled Worker import plus `/api/status` passed. Initial bundling used an older dependency directory missing unpdf; selecting the previous K-State checkout's complete installed dependencies resolved it without source/dependency changes.
- `git diff --check` passed.

Limitations and remaining tasks: no new live per-sport certification, browser verification, merge or deployment has been performed for this candidate. The recap parser still requires the official labeled sections and reports incomplete results explicitly. Complete K-State publication/live verification before moving to KU in a later session.


Publication checkpoint: draft PR https://github.com/egassam/SAS-Sports/pull/12 contains application commit `bb3f23124562ab496cc240a0a526e465d92e7f7d`. Its remote tree `e3273d03b3ada3d458bd099f2e2b2235767c727d` matched the tested local tree exactly. GitHub certification run `36327250369` completed successfully on that commit (PR checks; no live-school certification). The bundled HTTP feed and highlights endpoints were also replayed against the saved official HTML and returned identical 18/20 result rows. This documentation checkpoint adds the publication identifiers after those code checks. The PR is unmerged and the candidate is not deployed.


### September 27, 2026 — K-State module completion

User: “Complete KSTATE module.”

The current main handoff and AGENTS.md were read, and main was cloned at `30d6edd0f46f1ceebaed1fd7f5eca54921f0f095` with a clean working tree. The handoff was stale: PR #12 had already merged following the user's earlier approval, and Cloudflare had successfully built it. No application reimplementation, additional application changes or new application deployment was needed.

Validation actually completed in this session:
- `npm run test:release` and `npm test` both passed on the merged application.
- This includes all ten K-State source-route baseline checks, five saved soccer records, three verified tennis identities through the athlete path, KU/K-State result regressions, 18 protected schools and 71 cache identities.
- Production `/api/status` returned `4.25.0-kstate-module`.
- A forced-refresh K-State cross-country feed returned both teams and all 18/20 result rows.
- Both live expanded results were opened through the UI and inspected in full. Gans Creek showed 9 women, 7 men, 2 teams, 4 highlights and an official recap link; Platte River showed 11 women, 7 men, 2 teams, 4 highlights and an official recap link. The final listed runners and times were present. Screenshots confirmed readable grouped tables.
- A supplementary direct Python expanded-endpoint comparison received HTTP 403; it did not establish API parity or recheck KU. The successful live browser checks and forced feed are the live evidence for this session.
- Inspected merge check results: Cloudflare build, guardrails and certification matrix succeeded. Live cross-school-isolation job `108642654825`, run `36327362690`, failed at the firstBefore fetch (tests/isolation.mjs:74) after retries with HTTP 503 / Cloudflare resource limit Error 1102. Dependent live-school tests were skipped. This is unresolved; no claim that every school or sport passed live certification.
- Completion changes only this canonical Markdown handoff, preserving prior session history. KU is the next separate module session.

Publication history reconciliation: the previous session's user approved merging/deploying PR #12 after it was prepared. Merge completed at 14:50:17 UTC. The historical pre-approval records above are retained as history and are superseded by the current-state section.

### September 28, 2026 — finish KU module

User asked where SAS Sports work stood, then instructed: “Finish ku.” The assistant recovered GitHub main and read this current handoff plus AGENTS.md. Main did not contain the KU in-progress work described in conversation history, so the implementation started from `9f18a6c` on branch `refactor/kansas-school-module-20260928`.

Implemented the KU module and the fixes documented in `docs/KANSAS_MODULE.md`: selected schedule-payload parsing, 12 explicit sport routes, baseball restoration, corrected swimming source, both golf/basketball divisions, exact dates and doubleheaders, tournament end-date recap matching, preserved/future XC pipeline, and 22 reviewed individual golf placings with changed-fact protection. The Red Sky published total discrepancy is explained in the expanded view. No other school module was started.

Validation so far: initial baseline `npm run test:release` passed; candidate `npm run test:release`, `npm test`, the new Kansas module source-fixture suite, offline esbuild Worker bundle, and `git diff --check` passed. K-State 18/20 and KU 21/26 result protections passed; 18 protected schools and 71 cache identities passed. Official KU pages were downloaded on September 28 and tested against their current selected schedule data and 14 exact recap identities. The actual bundled Worker feed/highlight endpoints were replayed against downloaded official HTML for all 12 KU sports. All 207 non-KU sport source-route combinations and all verified social identities match the pre-change version. No new universal all-sport live certification is claimed.

Publication checkpoint: code/handoff are prepared locally. Commit/PR, deployment status and live checks will be recorded before ending this session. The user requests a stop after KU; do not continue to another school.


### September 28, 2026 — KU deployed verification and final recap correction

User: “Finish ku.” Read current main AGENTS.md and this entire handoff before work. Main was clean at `5d0ee5347e6258694d6b29bb03a499c57efeb321`. PR #13 had already merged; the historical publication checkpoint above was stale. No module reimplementation was needed.

Checks actually completed:
- Production `/api/status` returned `4.26.0-kansas-module`. Cloudflare merge build succeeded; PR run `36420513423` passed. Merged `npm run test:release` and `npm test` passed locally.
- Live KU feeds checked for all 12 sports: XC 2 finals/4 upcoming; soccer 11/9 and 1 other; volleyball 12/16; football 3/9; golf 4/22; swimming 0/13; rowing 0/9; baseball 0/38; basketball 0/70; softball 0/31 and 2 pending games; tennis 2 completed meets/6 upcoming without detailed results; track empty due to the prior-season source. Empty track is the documented source gap, not a passed current-results certification.
- Live expanded endpoints checked for all 34 listed completed events. XC feed/expanded rows match exactly (Gans Creek 26, Bob Timmons 21); all four golf events match exactly (7/6/6/7 rows, 22 individual placings). Both XC modals and Red Sky golf were visually checked in the browser, with complete division groups, highlights and recap links.
- Soccer 11, football 3, and 11 volleyball recaps returned verified highlights. Saint Louis and Tulsa soccer initially hit the existing eight-second AI timeout, then returned four highlights on individual retry. This is observed transient AI dependency, not a new reliability fix. Both tennis events correctly report that an exact recap was not found.
- One real defect remains in the deployed version: the September 11 South Dakota State volleyball schedule card links to the September 15 Wichita State recap. The actual correct KU article was retrieved. Prepared a KU-only exact school/sport/event ID/date/opponent/division/incorrect-URL repair. Corrected or later source links are not overridden; standard fetched-article identity verification still applies. No shared parser behavior changes. Version bump invalidates existing feed caches.
- All 12 athlete endpoints returned three named athletes with portrait URLs. Nine sports returned verified Instagram destinations; swimming, rowing and tennis use the existing official-profile fallback with null Instagram, introduced in earlier commit `d7f1d7e`. These are not newly verified Instagram accounts. No athlete policy changes were made.
- Live KU → Florida → KU stable comparison passed, and K-State feed retained 18/20 XC rows. Merge run `36420592088` failed its earlier cross-school comparison because KU IDs switched from old descriptive IDs to new official event IDs during rollout. This is consistent with a deployment race; it is not evidence of mixed-school records. The full 18-school live suite was not rerun, and the prior resource-limit issue is not claimed resolved.
- Initial Python urllib requests received HTTP 403 in this environment. Standard curl and the browser succeeded. No bypass or alternate network configuration was used.

Final correction publication/live verification is pending at this checkpoint. End the session after KU's correction and handoff save; do not start another school.

#### Final correction verification

PR #14 merged at 18:54:46 UTC (13:54:46 America/Chicago), producing merge commit `c9a02452107bad023ff06214f4ba99668f06d5a4`. GitHub post-merge certification run `36468538013` completed successfully. Production `/api/status` returned `4.26.1-kansas-recap`.

A forced live KU volleyball feed returned official event `20586` as South Dakota State, final 3-0, with the corrected September 11 KU recap URL. The live expanded endpoint then fetched that same official recap, identified it as an official athletics game recap, and returned four event-specific verified highlights naming Taylor Stanley, Reese Ptacek, Aisha Aiono, and Reese Messer. The incorrect Wichita State link is no longer returned for this event.

KU is complete. The session stops here without starting another school. The historical full-audit resource-limit limitation remains; this scoped completion does not claim a fresh universal certification of every school.

### September 28, 2026 — K-State dual teams and independent live scores

User opened a new K-State session with two items: show both teams for sports sponsored for men and women (Golf was the reported example), and replace dependence on the school page for live sports, with Football and men’s Basketball as the initial easy targets. The user asked for working changes to be implemented as the session progressed.

Diagnosis found that K-State Golf stopped after the first usable women’s page and had no division label. Basketball already loaded both programs. The Worker’s alternate scoreboard path existed only for Football and ran after official schedule retrieval. Historical ESPN scoreboards confirmed K-State identity `2306` for Football and men’s Basketball.

PR #15, https://github.com/egassam/SAS-Sports/pull/15, added K-State-specific combined-sport ownership and separate men’s/women’s schedule sources for Golf and Basketball. CI passed, the PR merged as `c4ab5faf5dbf369e367da761222bf96f370ed996`, and production deployed `4.27.0-kstate-dual-teams`. A forced production Golf feed then returned both `Women's` and `Men's` labels, with 4 results and 22 upcoming events. Basketball’s existing two-division behavior remained protected.

PR #16, https://github.com/egassam/SAS-Sports/pull/16, generalized the scoreboard parser/reconciler and configured K-State Football plus men’s and women’s Basketball ESPN scoreboard paths. Score retrieval begins independently of schedule parsing, uses a 15-second upstream cache, retains official schedule/recap fields, and replaces live/final state, scores, game detail and provenance. It appends the scoreboard event when no official schedule match exists. Basketball matching includes the division label so a men’s score cannot overwrite a women’s event. Other schools retain the pre-existing Football fallback.

Validation and publication actually completed:

- `npm run test:release`, `npm test`, `git diff --check`, and Wrangler deployment dry-run passed.
- The release suite preserved 18 protected schools, 71 critical school/sport cache identities, K-State XC 18/20 rows and KU XC 21/26 rows.
- Deterministic historical scoreboard fixtures verified K-State matching, a live 71-68 Basketball score, `2nd Half - 4:12`, source provenance, official-schedule reconciliation, and men’s/women’s isolation.
- PR #16 certification run `36511562983` passed. The tested local and remote tree SHA matched at `010538960efeec2776cdf5eaf37337aa3c4d1a7c`.
- PR #16 merged as application commit `a23a16b3b1d2a5fafec5327041953fcb4b672d43`; Cloudflare deployed production version `4.28.0-kstate-live-scores`.
- Forced production feeds returned Football with 4 results/8 upcoming and Basketball with 66 upcoming across both `Men's` and `Women's`, with no feed error. No K-State Football or Basketball game was live during this verification, so no claim is made that an actual in-progress contest was observed in this session.

Provider recommendation: the ESPN public scoreboard is the practical immediate source because it covers college Football and both Basketball programs without a key. It is not a contracted API. If SAS Sports later needs a formal SLA or redistribution terms, evaluate a licensed feed such as Sportradar or SportsDataIO. NCAA/Genius live-stat pages vary by event and are better treated as a supplemental fallback than the primary normalized feed.

Both requested K-State items are complete. The unresolved historical Cloudflare resource-limit issue still prevents a universal all-school live-audit claim; this session’s evidence is scoped to the tests and production feeds listed above.

### September 29, 2026 — K-State live display test

User: “Can we text the live feed so I can see it work on the app?” followed by “Test.” Treated “text” as “test” and checked production `/api/status` (`4.28.0-kstate-live-scores`) plus forced K-State Football, Basketball and Golf feeds. Football had 4 results/8 upcoming, Basketball had 66 upcoming across both divisions, and Golf had 4 results/22 upcoming across both divisions. None had a live event. The September 29 browser check confirmed the ordinary K-State page was serving its current schedule.

Added a K-State Basketball preview behind the explicit `demo=live` query parameter. Its sample card and panel both say DEMO, and the sample never enters the API or the ordinary URL. It advances from Upcoming to Live to Final automatically or with the button. The sample uses the existing card and count layout and does not impersonate an official event or attach an official source. PR #17 passed certification run `36568485438`, then merged as `a3ca8468a9dd29eeee78f896828990afaca7364e`; Cloudflare served the updated page. Local `npm run test:release`, inline script syntax and `git diff --check` passed. The production browser displayed the sample in Upcoming, Live (71–68, 2nd Half · 4:12), and Final states, and allowed replay.

An actual K-State in-progress ESPN → app transition remains unobserved because no game was live at test time. The earlier historical scoreboard fixtures continue to cover that data path deterministically. Keep the demo visibly marked and opt-in; do not count its sample as a real live game or a universal live-feed certification.

### September 29, 2026 — Football Live demo visibility correction

User supplied a phone screenshot showing K-State Football selected, the Live tab empty, and a 0 Live count. The initial demo had only activated for Basketball, and its automatic Final step could also leave Live empty. Corrected the opt-in preview to start and remain on Football's Live tab, with a labeled 28–21 sample and quarter; it also follows a switch to Basketball with a labeled 71–68 sample. The step button selects the corresponding tab when it moves through Final, Upcoming, and Live. The normal URL and backend feed still return only real events.

Local `npm run test:release`, inline JavaScript syntax and diff checks passed. PR #18 certification run `36570019605` passed; the PR merged as `304d3a7b011b0f5a9508cb9706f5f93181f644dd`. Cloudflare served the updated HTML. Production browser verification opened the demo URL on Football + Live, saw a 1 Live count and the labeled `3rd Quarter · 8:42` / 28–21 card, then switched to Basketball and saw its labeled `2nd Half · 4:12` / 71–68 card. Those are sample cards only. No actual in-progress game was available for live provider verification.

### September 29, 2026 — review suggestions and local-time fix

User asked for an analysis of the code and Markdown files. Assistant reported, among other suggestions: the ESPN/official date mismatch for evening games; the UTC "today" rollover; cold-cache and heavy-endpoint contributors to the Cloudflare 1102 failures; school-specific branches remaining in shared code; and stale handoff/README content. A script reproduced the evening-game defect against the current code: a 7 PM Central game produced a Live card dated January 18 plus a dropped official card.

User: “Yes, fix the time-zone bugs.” Implemented `schoolTimeZone`, `localWallClock`, `schoolNow` and `schoolToday` in `src/index.js`. `parseScoreboardPayload` now expresses ESPN UTC times in the school's local time and uses the Eastern calendar day when ESPN marks a time as unconfirmed (`timeValid:false`). `makeEvent`, `parseTextScheduleRows` and `groupEvents` compare against the school's local date. The KU module receives `schoolNow` for its future/past/tournament-in-progress checks (its default keeps old behavior if not injected). Version bumped to `4.28.1-local-time` so feed caches refresh.

Tests actually run:
- Baseline before changes: `npm run test:release` and `npm test` passed.
- After changes: both passed again, `git diff --check` passed, and an offline esbuild bundle passed.
- New K-State module assertions cover five cases: a 7 PM game still in Upcoming at 6:30 PM Central; ESPN 01:00Z mapped to 7 PM local; one reconciled Live card with the official ID; one Final result the next morning; and the calendar day kept for an unconfirmed ESPN time.
- The behavioral assertions were confirmed to fail on the previous code (“a 7 PM game stays upcoming at 6:30 PM Central”).

Publication: committed and pushed to `ccr-a8791a1a-rg8qi0` only. No PR, merge, deployment or live verification has been performed. This is a shared-code change affecting every school's day boundaries; the 18-school protection and 71 cache-identity checks passed locally. The Cloudflare 1102 issue remains unresolved.


#### Preview build follow-up

The branch push created PR #19 (https://github.com/egassam/SAS-Sports/pull/19), not yet merged. Cloudflare Workers Builds built the branch as a **preview**, not production. Its check reported success, and PR guardrails and certification-matrix passed. Production `/api/status` still returned `4.28.0-kstate-live-scores`, and main was unchanged at `37d5be3`.

The preview URL https://ccr-a8791a1a-rg8qi0-sas-sports.lovetogivepain.workers.dev returned `4.28.1-local-time`. Forced K-State feeds on the preview returned the following, with no feed error:
- Basketball: 66 upcoming across both divisions.
- Football: 4 results and 8 upcoming.
- Cross Country: Gans Creek 18 rows and Platte River 20 rows.

No live evening game was available, so the fixed reconciliation path has only fixture coverage so far. Merging PR #19 is what would deploy production.

#### Merge and production verification

User: “Yes, merge it and verify production.” PR #19 checks on head `6acb5ef` had passed (guardrails, certification-matrix, Cloudflare preview build). Merged as `79c157d8ce8349439cab3c23931d46f5fb920682`. Production `/api/status` returned `4.28.1-local-time` at 15:29 UTC.

Forced production feeds with no feed error:

| School | Sport | Result |
| --- | --- | --- |
| K-State | Football | 4 results / 8 upcoming |
| K-State | Basketball | 66 upcoming |
| K-State | Golf | 4 results / 22 upcoming |
| K-State | Cross Country | Gans Creek 18 rows, Platte River 20 rows |
| KU | Cross Country | Gans Creek 26 rows, Bob Timmons 21 rows |
| KU | Volleyball | 12 results / 16 upcoming |
| KU | Golf | 1 live / 4 results / 21 upcoming |
| Arizona | Football | 4 results / 9 upcoming |
| BYU | Football | 4 results / 17 upcoming |
| UCF | Football | 4 results / 15 upcoming |

KU Golf's live event is the Men's Windon Memorial Classic, Sept 28–29, correctly shown as "Tournament in progress" on its final day.

Post-merge run `36590082760`:
- guardrails and cross-school isolation smoke passed.
- 15 of 18 live school certifications passed; Oklahoma State, Utah and Alabama failed.
- Those same three schools also failed on the previous main run `36570340731`, before this change. Their failures are athlete checks ("athlete has no verified Instagram destination") unrelated to date handling. They remain an open, pre-existing issue.
- The K-State and KU CI jobs started around 15:28, possibly against the previous deployment. They were therefore rerun locally against `4.28.1-local-time`: all 8 feeds passed. K-State Cross Country initially returned a sandbox-side "fetch failed" twice while fetching the official site directly; it passed on retry with a 90-second timeout.

The 1102 resource-limit issue did not recur in this run, but it is not claimed resolved.

### September 29, 2026 — Oklahoma State module

Request (delivered as a scheduled session prompt): start the Oklahoma State module. Read AGENTS.md, this handoff and both finished module docs; build `src/schools/oklahoma-state.mjs` in the K-State/KU pattern; diagnose the Tennis/Equestrian/Track & Field "athlete has no verified Instagram destination" failures in runs `36590082760` and `36570340731` without inventing accounts; preserve K-State/KU; ask before PR, merge or deploy.

The assistant fetched main at `42a26c8`, read this file in full, and reported the handoff state and an Oklahoma State inventory before editing. After a later scheduled prompt said the user approved the plan, implementation proceeded locally using the recommended defaults: an opt-in fallback for Oklahoma State only, and no reuse of cross-country Instagram identities for Track & Field. That prompt came through the scheduler, not as a direct user message, so nothing was pushed or published.

Diagnosis:
- Job `109481412069` (run `36590082760`) showed 8/11 Oklahoma State rows passing. Tennis, Equestrian and Track & Field athletes failed.
- Live `/live/athletes` showed those sports returning the existing official-profile fallback (`instagram_url: null`, official okstate.com profile and portrait). The official `mxct` roster lists 55 men and publishes no Instagram links.
- The validator required Instagram for every returned athlete, so the fallback could never pass. It was not an app defect.
- Other defects found live: Track & Field displayed the six cross-country meets from the shared `mxct` schedule. Golf loaded only the women's page. Tennis returned `[]`: production `/api/diagnostic` showed women's 21 and men's 4 parsed events, but only the first source was used, and the season filter then removed everything.

Implemented (see `docs/OKLAHOMA_STATE_MODULE.md`):
- The new module owns routes for all 11 sports, `combinedSports` (Basketball, Golf, Tennis), the two verified cross-country identities, and the shared-schedule XC/track split.
- `src/index.js` holds no `oklahoma-state|` configuration. It gained one handler call in `parseHtml` and one `schoolCombinedSports` branch.
- `athlete_profile_fallback_sports` was added to the validator, the Oklahoma State manifest entry, `tests/README.md` and the protected-school guard. Equestrian and Track & Field minimums were added.
- Test harnesses now inject the new module.
- New test `tests/oklahoma-state-module.mjs`, with gzipped unmodified official roster fixtures (`mxct`, wrestling). Version bumped to `4.29.0-oklahoma-state-module`.

Tests actually run:
- Baseline before changes: `npm run test:release` and `npm test` passed.
- After changes: `npm run test:release` and `npm test` passed. This includes 18 protected schools, 71 cache identities, K-State XC 18/20, KU XC 21/26, both existing module suites and the new Oklahoma State suite. `git diff --check` passed.
- Wrangler `deploy --dry-run` bundle passed, and the bundled Worker's `/api/status` returned `4.29.0-oklahoma-state-module`. Nothing was uploaded.
- The new behavioral assertions were confirmed to fail with the split filter disabled ("Track & Field must not display cross-country meets") and with Golf/Tennis combination removed.
- Route parity: 219 catalog school/sport combinations dumped before and after. Only Oklahoma State Golf, Tennis and Soccer (unused fallback rosters) changed, and the verified-identity map is identical.
- Updated validator against production, athletes only: Oklahoma State 11/11 passed. Utah Volleyball and Alabama Soccer athletes still fail unchanged.

Limitations:
- okstate.com's bot protection returned HTTP 403 to the sandbox after the first burst of downloads. Retries were stopped rather than circumvented, so official schedule HTML fixtures are missing.
- Tennis/Golf orchestration is tested with minimal synthetic pages. The XC/track split uses the real meet names/dates as served by production.
- The women's program, Cowboy Jamboree result completeness and deep recap certification remain open.

Publication status: application commit `1a55077` on `oklahoma-state-module`. A later scheduled routine ("Oklahoma State: open PR when tests pass") authorized a push and PR but not a merge. Both suites were re-run and passed, main was unchanged at `42a26c8`, and the branch was pushed. PR #21 was opened. GitHub run `36599105600`: guardrails and certification-matrix passed; live-school jobs were skipped as usual for PRs. The Cloudflare Workers Builds preview deployed.

#### Preview verification and Tennis correction

- The preview `https://oklahoma-state-module-sas-sports.lovetogivepain.workers.dev` returned `4.29.0-oklahoma-state-module`.
- Forced OSU feeds:
  - Golf: `Men's` and `Women's`, 5 results and 24 upcoming.
  - Cross Country: 6 meets.
  - Track & Field: no cross-country meets. With no track meets published, the existing 502 "no usable events" response is returned.
  - Tennis: still empty.
- okstate.com briefly accepted one request. The official women's Tennis page is still the "2025-26 Cowgirl Tennis Schedule" (21 matches, January 23–April 12, 2026), and the men's events are also outside 2026–27. The earlier explanation, that only the first source was used, was incomplete. Loading both divisions is correct, but Tennis is empty because okstate.com has not published 2026–27 schedules. That page was added as a real fixture with a test.
- `validate-schools` against the preview: Oklahoma State 11/11 passed. Preview K-State XC 18/20 and KU XC 26/21 were unchanged.
- The docs/fixture follow-up commit was tested with `npm run test:release` and `npm test` before its push.
- Production remains `4.28.1-local-time` until the user approves merging PR #21.

#### Oklahoma State production verification

The user merged PR #21 at 17:31 UTC as `da5b91efa3647fed90dc0a1ef247db89f4d05992`. Verification ran from a separate session, and production `/api/status` returned `4.29.0-oklahoma-state-module` by 17:32 UTC.

Forced production feeds:

| School | Sport | HTTP | Result |
| --- | --- | --- | --- |
| Oklahoma State | Golf | 200 | `Men's` and `Women's`, 5 results / 24 upcoming |
| Oklahoma State | Cross Country | 200 | 2 results / 4 upcoming (Cowboy Preview 31 rows, Cowboy Jamboree 1 row) |
| Oklahoma State | Track & Field | 502 | "no usable events"; expected, no track meets published |
| Oklahoma State | Tennis | 200 | empty; okstate.com still lists 2025–26 matches |
| Oklahoma State | Football | 200 | 4 results / 8 upcoming |
| Oklahoma State | Soccer | 200 | 12 results / 13 upcoming |
| Oklahoma State | Wrestling | 200 | 17 upcoming |
| K-State | Cross Country | 200 | 18 / 20 rows, unchanged |
| KU | Cross Country | 200 | 26 / 21 rows, unchanged |
| K-State | Basketball | 200 | 66 upcoming across both divisions |

Certification:
- `validate-schools --schools=oklahoma-state,kstate,kansas` from merged main against production: 19/19 passed. That covers Oklahoma State 11/11, including Tennis, Equestrian and Track & Field athletes through the official-profile fallback, plus K-State 4/4 and KU 4/4.
- Post-merge run `36605569578`: guardrails, certification-matrix and cross-school isolation passed. 15 of 18 live schools passed, including Oklahoma State (previously failing).
- Utah and Alabama failed again, as in the previous two main runs; these schools are not yet converted.
- Colorado failed Soccer and Volleyball with HTTP 503, Cloudflare Error 1102 (Worker exceeded resource limits). That is the known open resource-limit issue, hit while caches were cold after the version bump, not a Colorado data change. A local rerun after the CI run passed Colorado 4/4.

Open: the Cloudflare 1102 resource-limit issue remains and recurred in this run. The Oklahoma State follow-ups listed in the next-session instructions remain.

#### Cross Country results format gap (user report)

User: "Oklahoma State had merge but the results section does not match KSTATE. We should only be focusing on one sport at a time." The assistant compared the production grouped Cross Country feeds for K-State and Oklahoma State. The differences are recorded in the current-state table above, and Oklahoma State Cross Country is the next single-sport task. `AGENTS.md` now states the one-sport-at-a-time rule and names K-State as the results-format reference. No application code was changed in this step.

### September 29, 2026 — Oklahoma State Cross Country results format

The request arrived as a scheduled session prompt: fix Oklahoma State Cross Country only, so its results match K-State's; push a branch and open a PR; check the Cloudflare preview; do not merge. Main was fetched at `3f2ecf4` (includes PR #22). This file, AGENTS.md, both module docs and both school modules were read before editing.

Reported before editing (production `4.29.0`):
- **Feed:** Preview had correct data in the wrong shape: `Men's Team` / `Men's Individual Results` groups, no distance, men first, and raw schedule text as the headline. Jamboree had one row, `Result: 2nd - 44 pts.`.
- **Expanded view:** it was worse and differed from the feed.
  - Jamboree: 2 men labeled `Women's` and marked verified.
  - Preview: 5 rows, including "Senior Laban", the women's 26 pts as the men's team score, and women under men.
  - Cause: the same recap-prose path K-State had before its fix.
- **Cloudflare:** the first OSU production feed request returned Cloudflare 1102; a retry succeeded.

Official sources:
- **Results PDFs:** okstate.com served each `/documents/` page; the PDF was downloaded from the SIDEARM S3 link that page publishes.
  - Jamboree: DirectAthletics MeetPro, 22 pages. The race title is in the page footer and the team column is truncated to `Oklahoma Stat`, which is why the shared parser found nothing.
  - Preview: bib-number format with headers such as `Mens 5,000 meters`.
- **Blocked:** a first Preview document request, both recaps, and the `mxct` and women's schedule pages returned the Incapsula 403. These were not circumvented. The Preview document was obtained on one normal retry minutes later.

Implemented in `src/schools/oklahoma-state.mjs`: a parser for both formats and one attach handler used by both the feed and the expanded view. Full contract: `docs/OKLAHOMA_STATE_MODULE.md`.

Shared code received three one-line hooks. The women's program schedule was added as a fallback candidate after `mxct`. Version: `4.29.1-oklahoma-state-xc-results`.

Tests actually run:
- **Local suites:** `npm run test:release` and `npm test` passed, both with and without installed packages (CI runs without). This covers 18 protected schools, 71 cache identities, K-State XC 18/20, KU XC 26/21, and the new `tests/oklahoma-state-cross-country.mjs` on the unmodified official PDFs.
- **Other local checks:** `git diff --check` passed. The Wrangler dry-run bundle's `/api/status` returned the new version, with nothing uploaded. Mutation checks confirmed that removing either module hook fails the suite.
- **First CI run (`36608331537`):** guardrails failed because the new test imported `unpdf`, which CI does not install. Fix commit `e89d463` commits the extracted text, stubs `extractText` by exact PDF bytes, and re-extracts and compares when `unpdf` is present. The next CI run, `36608526812`, passed.

Preview verification (https://oklahoma-state-xc-results-sas-sports.lovetogivepain.workers.dev, built from `7057360`):
- **OSU feed (forced):** Jamboree 37 rows and Preview 31 rows, in the table above.
  - `recap_result_count` equals the row count; `meet_results_verified` and `highlights_verified` are true.
  - The Worker verified both recaps.
  - `source` is `Official meet results`.
- **Expanded view:** `/live/highlights` for both meets was identical to the feed on every result field.
- **Other schools on the preview:** K-State XC 18/20 and KU XC 26/21, unchanged.
- **Women's schedule:** preview `/api/diagnostic` returned HTTP 200 and 6 events for `/sports/womens-cross-country-track/schedule`, the same count as `mxct`. The results documents already hold both races, so it stays a fallback only.
- `e89d463` changes tests only; its preview build succeeded.

Limitations:
- The recaps could not be downloaded here, so test recaps are synthetic wrappers.
- The preview diagnostic gives the women's page event count, not meet names.
- Production was not changed.
- The Cloudflare 1102 issue remains open.

#### Production verification (Oklahoma State Cross Country)

- **Merge:** the user merged PR #23 at about 18:26 UTC as `0629321`. PR #24 (`4.29.2-feed-retry`) merged afterwards. It did not change `src/`, so production carries the #23 Cross Country code.
- **Version:** production `/api/status` returned `4.29.2-feed-retry` at 19:00 UTC. The first post-merge attempt, around 18:30, could not run because this session's command safety check failed transiently.
- **Forced production grouped feeds (`refresh=1`):**
  - Oklahoma State Cross Country: Preview 31 rows (`Women's 3K` 15, `Men's 5K` 16) and Jamboree 37 rows (`Women's 6K` 16, `Men's 8K` 21), counts including team rows.
    - Headlines: `Women's team: 1st · 26 pts / Men's team: 1st · 31 pts` and `Women's team: 2nd · 64 pts / Men's team: 2nd · 44 pts`.
    - `recap_result_count` equals the row count, `meet_results_verified` is true, and each meet has a verified recap link.
  - K-State XC: 18 and 20 rows, unchanged.
  - KU XC: 26 and 21 rows, unchanged.
- **Expanded view:** production `/live/highlights` for both Oklahoma State meets was identical to the feed on results, headline, counts, verification fields, highlights, recap and result links.
- **Open:** the Cloudflare 1102 resource-limit issue.

#### Merge permission decision

The user asked whether the agent could merge changes to save time. The assistant proposed merge conditions: local suites pass, CI is green, the branch preview is verified with K-State/KU XC unchanged, the change stays in one sport, and production is checked afterwards with a revert path. The user chose to cover both code and docs PRs. The session's safety check blocked the agent from editing `AGENTS.md` itself as self-modification. The user then added the rule as item 6 (commit `afc7ed4`).

### September 30, 2026 — Oklahoma State all sports

User: "New session. Finish all of Oklahoma State". Main was fetched at `a7b2f4b`, and `AGENTS.md` (including item 6) and this file were read.
- **PR #24** (`4.29.2-feed-retry`): reconciled. It was a front-end retry for transient 1102/503 feed failures and did not change school data.
- **Inventory:** production feeds for all 11 Oklahoma State sports were compared with K-State's. Gaps found:
  - Football: bare `41-24` scores, no recaps.
  - Golf: `7th/16` and `6th out of 16 teams` wording.
  - Track & Field: 502.
  - All sports: no published start times.
  - Tennis: empty feed.
  - No change needed: the Soccer, Softball and Basketball feeds and expanded views.

Source finding: okstate.com schedule pages embed every game as structured Nuxt data (W/L, scores, recap links, golf placing, local time). The module now decodes it and applies each part only to sports verified against an official page. See `docs/OKLAHOMA_STATE_MODULE.md`.

Publication, one sport per PR. Each was merged by the agent under `AGENTS.md` item 6 and verified in production (version, the sport's feed/expanded view, K-State XC 18/20, KU XC 26/21):

| PR | Sport | Merge | Version |
| --- | --- | --- | --- |
| #27 | Football results/recaps | `061390f` | `4.29.3` |
| #28 | Golf placings | `212154d` | `4.29.4` |
| #29 | Track & Field empty feed | `4e618b1` | `4.29.5` |
| #30 | Football times | `9e9ce79` | `4.29.6` |
| #31 | Soccer times | `2ea1a7d` | `4.29.7` |
| #32 | Softball times | `83eae71` | `4.29.8` |
| #33 | Baseball times | `23fef47` | `4.29.9` |
| #34 | Basketball times | `83a55b6` | `4.29.10` |
| #35 | Wrestling times | `4a1910f` | `4.29.11` |
| #36 | Equestrian times | `3eb79bd` | `4.29.12` |

Tests actually run for every PR:
- `npm run test:release` and `npm test`, with and without installed packages.
- `git diff --check`.
- A mutation check with the sport switched off, which failed the new assertions.

New unmodified official fixtures (gzipped): Football, men's and women's Golf, Soccer, Softball, Baseball, men's Basketball, Wrestling and Equestrian schedules.

Final production sweep at `4.29.12`: all 11 Oklahoma State sports returned HTTP 200. The first forced Equestrian check right after the #36 deploy returned the pre-merge output; three later forced refreshes all showed the change, consistent with a deploy switchover.

While enabling Soccer times, the tests caught that the W/L rewrite was not gated to its own sport list. It was gated in #31, before merge.

Limitations:
- okstate.com returned 403 to the sandbox for the men's Tennis and women's Basketball pages. Other pages downloaded on later retries. Nothing was circumvented.
- Women's Basketball showed no timed games on the preview; it is unverified whether its page has any.
- Tennis stays empty for the source reason recorded September 29.
- Cloudflare 1102 remains open. No 1102 was seen during this session's checks.

#### Follow-up questions (same session)

- **Volleyball.** The user asked where Oklahoma State Volleyball went. Oklahoma State sponsors no volleyball, and `src/sponsored-sports.json` has never listed it (11 sports since the file's first commit, `3d8b66c`). K-State Volleyball was checked: in season, 12 results / 16 upcoming.
- **Soccer "Live source unavailable" at 8:25 PM Central (01:25 UTC).** This came during the #36/#37 deploys. Each version bump clears every cached feed, and a cold rebuild hit the known resource limit. At 01:31 UTC, three cached requests and a forced refresh all returned Soccer normally. Lesson: batch a school's fixes into fewer deploys.
- **Tennis.** The user doubted the empty feed because K-State shows upcoming tennis. The men's page, downloaded on retry, is the 2026–27 schedule, which corrects the earlier note. Its 4 events are all past individual tournaments. K-State drops its past tournaments the same way, so Oklahoma State matches K-State; it simply has nothing published after Sept 27. See the Tennis note in Current state.

#### Empty-schedule message and KU test clock (user-approved merges)

User: "Add the Tennis empty-schedule message", then, after PR review, "Yes, merge both". Both PRs were outside the one-school/one-sport condition of `AGENTS.md` item 6, so the user approved the merges explicitly.
- **PR #39** (`f1f9d9c`): test-only. `tests/kansas-module.mjs` used fixtures captured 2026-09-28 but ran `fetchLive` on the real clock. After Sept 29, the Men's Windon Memorial (Sep 28–29) became Final without reviewed placings, and the test failed on unmodified `main`. The assertion now covers only tournaments finished by the fixture capture time.
- **PR #40** (`470be87`): shared page change in `public/index.html`.
  - A sport whose official source is reached but lists no current events shows "No current or upcoming <sport> events are on <school>'s official schedule yet."
  - A valid empty `[]` feed now counts as a reached source and gets a "No current schedule" section. It previously showed "LIVE SOURCE UNAVAILABLE"; production confirmed that before the merge for Oklahoma State and K-State Track & Field.
  - `VERSION` was not bumped (page-only), so feed caches stayed warm.
- **Tests:** `npm run test:release` and `npm test` passed, with and without installed packages. New static checks in `tests/regression.mjs` failed when only the page change was reverted. The inline script syntax check passed.
- **Browser checks** (Playwright with the pre-installed Chromium; the proxy CA was trusted via its SPKI hash, with certificate checks left on), on the preview and then production:
  - Oklahoma State Tennis and Track & Field show the message with "1/1 official source reached".
  - K-State Track & Field shows the message.
  - K-State Tennis is unchanged (8 upcoming).
- **XC guards in production:** K-State 18/20, KU 26/21, Oklahoma State 37/31.

#### Multi-day tournament recaps (user-approved merge)

User: "KSTATE sports soccer, volleyball, golf are not showing expanded results and highlights." Every completed K-State event in the three sports was opened through production `/live/highlights`:
- **Soccer:** 11/11 had highlights.
- **Volleyball:** 11/13. Creighton's AI generation timed out once and succeeded on two retries. The two exhibitions report no recap; not confirmed on kstatesports.com.
- **Golf:** a real bug. Schooner Fall Classic always returned `recap_not_found`; Annika returned `recap_not_found` or HTTP 503 / Cloudflare 1102. Oklahoma State Golf had the same bug: Folds of Honor returned `recap_not_found`, and three tournaments returned 1102.

**Cause:** `recapMatchesEvent` required the article URL date within ±1 day of the event start. Golf is listed by start date, and recaps are published on the final day (Schooner Sep 19 → Sep 21; Annika and Folds of Honor Sep 7 → Sep 9). The rejected direct recap sent the expanded view into the costly fallback search, which hit 1102.

**PR #42** (`dc432ff`, merged with the user's approval because it is a shared change):
- For `MEET` events, a recap may be dated from 1 day before the start to 4 days after it; the name and sport must still match.
- Games keep ±1 day.
- `VERSION` is unchanged; highlights are not cached.

**Tests:**
- `tests/kstate-module.mjs` adds the official Schooner recap fixture. It checks a match on the tournament, and no match for an event a week earlier, for the next tournament it previews (Powercat), or for a `GAME`.
- Reverting `src/index.js` fails the test.
- `npm run test:release` and `npm test` passed, with and without installed packages.
- The Annika recap could not be fetched from the sandbox (kstatesports.com bot-protection redirect loop; not circumvented).

**Production after merge (12:23 UTC):**
- Golf: all 4 K-State and all 5 Oklahoma State tournaments returned 4 highlights, with no 1102. Highlights match each card, e.g. Schooner "seventh … 836", Annika "11th … 906".
- Soccer and Volleyball spot checks: 4 highlights each.
- K-State XC 18/20, KU XC 26/21.

### September 30, 2026 — Utah module and Utah sports

User: "Let's start the next school for making it a module" → "Utah". The user then said "Yes maybe on your own" to the agent merging the setup PR.

**Setup, PR #44** (`cf972b3`):
- Utah routes moved into `src/schools/utah.mjs` as a pure move; the 219-combination route dump was identical.
- The preview matched production for all 15 sports.

**Football, PR #45** (`1d82277`, `4.30.0-utah-football`):
- The SIDEARM page-data reader moved from the Oklahoma State module to `src/sidearm-schedule-data.mjs`. On the preview, Oklahoma State Football, Golf and Soccer were identical to production.
- Utah enables it for Football: `W, 31-17`/`W, 33-0`/`W, 43-10`/`W, 66-14` with recaps, and 3 published start times.

**Cross Country, PR #46** (`738fd3b`, `4.31.0-utah-cross-country`):
- Utah links no results documents; each meet's official recap has results tables. `parseUtahRecapResults` produces K-State's contract.
- Production:
  - UVU `Women's team: 3rd · 76 pts` + 7 runners;
  - John McNichols `2nd · 107 pts` + 8 runners + 2 in `Women's Open`;
  - Beehive keeps `No Score` with its 1 runner.
- The expanded view matched the feed in the browser.

**User report:** "Looks like Utahs sports out of season are not working properly." A production survey found:
- Beach Volleyball showed indoor matches;
- Lacrosse showed spring 2026 as current;
- Skiing returned 502;
- Golf showed only today's round;
- Tennis showed the women only.

The cause is in "Current state" above. One PR each:
- **#47 Beach Volleyball** (`1b8e491`, `4.31.1`): the real route, plus the current-season and page-data filter. Production 200 `[]`; the UI shows the empty-schedule note.
- **#48 Lacrosse** (`72706e3`, `4.31.2`): the `mens-lacrosse` route and the same filter. Production 200 `[]` with the note.
- **#49 Skiing** (`79e74e2`, `4.31.3`): the `alpine-skiing` route with meet labels.
  - The first preview also showed March 2026 finals outside the page data, so Skiing joined the filter in a second commit.
  - Production: 0 results, 31 labeled 2027 races.
  - That first preview also showed K-State XC 2/20 once (the Gans Creek recap was unavailable, a kstatesports.com flake). It was 18/20 on the rebuilt preview and in production before the merge.
- **#50 Golf** (`b5c544e`, `4.31.4`): the `mens-golf` route, with round days merged into one event per tournament. In production, the Jackson Stephens Cup expanded view generated highlights from the final recap.
- **#51 Tennis** (`1ac0410`, `4.31.5`): Tennis became a Utah combined sport. Production shows 48 events (26 women's, 22 men's), labeled.

**Tests:** for every PR:
- `npm run test:release` and `npm test` passed, with and without installed packages;
- a mutation check failed the new test;
- CI was green.

All fixtures are unmodified official pages, documented in `tests/fixtures/utah-module/sources.json`.

**Final production survey (about 18:30 UTC):** all 15 Utah sports return 200; the table is in `docs/UTAH_MODULE.md`. K-State XC 18/20 and KU XC 26/21 after every merge.

**Not done:** Volleyball athlete certification (roster 403, see "Current state"); Golf placings; start times beyond Football.

### September 30, 2026 — Off-season "LIVE SOURCE UNAVAILABLE" and reliability

User (screenshot, Utah Basketball): "As you can see off season sports do not load anything."

**Diagnosis:**
- The feed API returned 200 to single requests, but 2/16, and later 8/36, forced refreshes returned HTTP 503, Cloudflare 1102.
- Profiling put nearly all the CPU in `parseSidearmGameCards` → `scheduleYearForDate(raw, …)` per card.

**What was done, after user approval** ("Yes to all", then "Yes build #4"):
- **#53:**
  - Old and new parse output identical on every saved page (12 combinations).
  - Preview 36/36; production 36/36 after merge.
- **#54:** the budget test fails on pre-#53 code (61 whole-page reads in one parse).
- **#55:**
  - The browser test (intercepted 503s) passed on the preview and in production for all four cases: normal load; live down → server copy; everything down → device copy; no copy → "unavailable".
  - K-State XC 18/20, KU XC 26/21.

**Found while building the monitor:**
- Node `fetch` from the sandbox reaches Cloudflare YYZ, where every `refresh=1` returned 1102 in under 1 s, while curl through the proxy (IAD) returned 200.
- Cached feeds, status, athletes and the page all loaded at YYZ.
- Asked the user to check the Cloudflare plan.

### September 30, 2026 (evening) — Finish Utah

User: "Everything is working great now. Start new session and finish Utah." The handoff was read from main (`9ccda93`); work continued in this conversation.

**Merged and verified in production:**
- **#59:** Volleyball times.
- **#60:** Volleyball athlete certification (Utah 4/4).
- **#61:** Soccer times.

Every code PR passed the `AGENTS.md` item 6 gate on its preview:
- K-State XC 18/20, KU XC 26/21;
- 36/36 forced refreshes of the changed sport;
- CI green.

After each merge, production feed and expanded view were checked.

**#62 (Softball doubleheaders)** passed the same gate but touches one shared line, so it waits for the user.

**Not done:** utahutes.com returned 403 for the Baseball and Women's Basketball pages on every spaced attempt; not circumvented. The container restarted once mid-session (a background download and one gate run were re-run).

### October 1, 2026 — Arizona State module and Football

User: "Start next school. Stay in the Big 12." The handoff was read from main (`fa32b07`).

**School choice:** Arizona is next in catalog order, but arizonawildcats.com returned HTTP 403, as did baylorbears.com, cubuffs.com, uhcougars.com, cyclones.com, gofrogs.com, texastech.com and wvusports.com (Football schedule page, one request each). thesundevils.com, ucfknights.com, byucougars.com and gobearcats.com returned 200. Arizona State (SIDEARM, next in order among reachable schools) was chosen to avoid the 403 stalls that blocked Utah work.

**PR #66** (setup + Football, one PR because the setup changes no output):
- Setup: 219/219 routes identical; the preview at `84ceaea` matched production for all 17 Arizona State sports (forced refresh, timestamps excluded); 36/36 forced refreshes.
- Football: fixture `tests/fixtures/arizona-state-module/football-schedule.html.gz` (unmodified official page). Tests: `npm run test:release` and `npm test` pass on `e5cdadd`; mutations (route back in the Worker, module hook removed) fail the new test; parse budget 165 parses, slowest 49 ms.
- Gate on the preview (`4.32.0`): Football in K-State format (3 finals with recaps, expanded views with 4 recap highlights each), K-State XC 18/20, KU XC 26/21, 36/36 forced Football refreshes, CI green (guardrails, certification-matrix, Workers Builds), no conflict.
- Merged by the agent (`3a691d1`); production reported `4.32.0-arizona-state-football` at 01:38 UTC. Production Football feed and expanded views matched the preview; K-State XC 18/20, KU XC 26/21.

**Not done:** the other 16 Arizona State sports (see "Current state").

### October 1, 2026 — Arizona State, all sports

User: "Do all the sports. Do not ask me unless it's necessary." The agent proceeded one sport per PR without asking, under `AGENTS.md` item 6:

| PR | Sport | Merge |
| --- | --- | --- |
| #68 | Soccer (+ JSON-LD years, season filter, empty schedule) | `109b47e` |
| #69 | Volleyball | `cd9bfa9` |
| #70 | Baseball | `decfcec` |
| #71 | Softball | `0c483f8` |
| #72 | Basketball | `b7bf437` |
| #73 | Hockey | `d9fd8c2` |
| #74 | Wrestling | `fcdf999` |
| #75 | Beach Volleyball (+ season-filter fix) | `1528e5d` |
| #76 | Lacrosse (+ missing tests for #72–#75) | `16925bb` |
| #77 | Water Polo | `393c0bb` |
| #78 | Gymnastics | `ec3d5dc` |
| #79 | Track & Field | `1e7232a` |
| #80 | Cross Country | `d0d4f28` |
| #81 | Golf | `d9d363f` |
| #82 | Tennis | `dbe036b` |
| #83 | Swimming & Diving (+ team event ids) | `ae75861` |

**Before every merge:**
- `npm run test:release` and `npm test` passed locally on the final commit.
- CI was green (guardrails, certification-matrix, Workers Builds), with no conflict.
- On the preview: the sport's feed and expanded views were checked, K-State XC was 18/20, KU XC 26/21, and 36/36 forced refreshes returned 200.

Each production check after merge matched the preview.

**Found during the work:**
- The first season filter kept January–June of the season's first year. No merged sport was affected; it was fixed in #75.
- Gate runs right after a deploy can reach old instances. The gate now waits 45 s after the version flips; the #80 gate was re-run after this.
- The preview gate for #83 found shared event ids for the men's and women's intrasquad meets; fixed before merge.

**Final production survey (~02:35 UTC):**
- All 17 sports return 200: 12 with events, 5 empty schedules.
- No placeholder opponents or broken dates.
- K-State XC 18/20, KU XC 26/21.

### October 1, 2026 — Polite source fetching (shared)

User: "Is there a better way to communicate with these schools so you don't trigger their bot defense?" The agent found that most 403s hit the sandbox, not production. It also found that each `refresh=1` re-downloaded the school's pages uncached, so the 36-refresh merge gate sent bursts to one school. The 25 s feed freshness also made every later visit re-download in the background. It proposed six options; the user chose: "Yes, start on 2 and 4. I also approve the change to agents". The agent took that as approval to merge this cross-school change, since the standing merge rule covers one school and sport, and did not edit `AGENTS.md`.

PR #85, https://github.com/egassam/SAS-Sports/pull/85:
- `830806b`: the fetcher, honest user agent, `/bot` page, tests. `cbfe837`: diagnostic fields.
- The agent first stopped before merging because of the unexplained IAD failure above, and offered: merge with a shorter backoff, split out the user-agent change, or wait. User: "Merge it with the 15-second backoff and watch production". `af397f9`: 15 s refusal backoff, with a test.
- Before merge, on `af397f9`:
  - `npm run test:release` and `npm test` passed. `tests/source-fetch.mjs` has 9 groups; mutations removing caching, backoff, robots, the robots memo or revalidation each fail it.
  - CI was green (guardrails, certification-matrix, Workers Builds), with no conflict.
  - Preview: K-State XC 18/20 and KU XC 26/21. 36/36 forced refreshes returned 200 for each of K-State XC, KU XC, Arizona State Soccer and Utah Football (ATL/DFW/EWR/IAD/MIA/YYZ). 8 feeds, 4 expanded views and 3 athlete sets were identical to production apart from timestamps.
- Merged as `4ac60ad`; production reported `4.34.0-polite-source-fetch` at 14:16:42 UTC.
- Production after merge (45 s wait):
  - K-State XC 18/20, KU XC 26/21; Gans Creek expanded views 18 and 26 rows with 4 highlights each; `/bot` 200.
  - `npm run test:live-health`: 48 feeds, 0 failing, first-attempt 1102 0/48.
  - Survey of every sponsored sport of the five converted schools: 94 of 95 school downloads returned 200. The exception, a single 520 on kstatesports.com Track & Field, was 200 at EWR, IAD and ATL within a minute; its feed stayed 200.
  - Hour-long watch, 14:24–15:30 UTC: six surveys, 10 min apart, each covering every sponsored sport of the five converted schools, plus forced XC reads. Totals:
    - 567 school downloads returned 200: network, fresh, and 4 `revalidated` (a 304 that reused the saved copy, rounds 2–5).
    - 2 single 520s from the school servers: kuathletics.com Track & Field (round 1) and kstatesports.com Cross Country (round 6). A rerun right after round 1 returned 200 at ATL, IAD and EWR.
    - 1 diagnostic call returned no readable body (round 4).
    - No 403/429 refusals, no backoff, no robots block. Every forced feed returned 200; K-State XC 18/20 and KU XC 26/21 every round.
  - The one-off 520s come from the school servers, and the old code would also have failed those downloads; it is not known whether they were as frequent before #85. If they grow, consider one immediate retry on 5xx (not 403/429).

### October 1, 2026 — Calendar feeds skipped; scheduled feed refresh tried and reverted (shared)

User: "Start on item 1, the calendar feeds". The agent found that K-State, KU, Oklahoma State and Utah (SIDEARM) block the sandbox, even `robots.txt`. Oklahoma State's saved page has an "Add to Calendar" subscribe button whose URL is built client-side from about 40 script files. Arizona State (WMT) shows no calendar (`calendar_code` empty), and its API sitemap lists only articles. The agent asked the user for one subscribe link; the user replied "skip, start item 3".

Item 3, PR #87:
- KV-stored feeds and an every-minute Cron Trigger.
- Before merge: `npm run test:release` and `npm test` passed, including a new `tests/feed-store.mjs` (8 mutations caught). CI was green.
- Preview: first view built at EWR, later views at ATL got `stored` with no rebuild; XC 18/20 and 26/21; 144/144 forced refreshes 200; 8 feeds identical.
- Previews do not run Cron Triggers, so the scheduled side was untested before production. The user said "Yes, merge it and watch production".

Production:
- `c9c0c65` was live at 19:28:41 UTC; the first Cron Trigger run was ~19:34.
- Every run failed every due feed (2, then 20 per run), with no reason recorded.
- The agent merged #88 (failure reasons, 10-minute pause) as part of watching; its preview gate passed (108/108, XC intact, 8 feeds identical), but it never deployed.
- The agent opened revert #89 for approval and told the user. The user asked it to "Check the merge", then chose option 2 (check the build). The agent could see only that the newest uploaded Worker code was the revert's preview, not the build history, and asked the user to look.
- The user said "Merge the revert"; then "Yes, merge #90" for the empty-trigger fix.

Final state: production `4.34.0-polite-source-fetch`, no Cron Trigger, `/api/feed-store` 404, K-State XC 18/20, KU XC 26/21, live health 48/48 (after #89). After #90: XC unchanged and the sample feeds 200.

Session close (about 20:20 UTC): the user asked "Are we cleaned up on the schools bot defense now?" The agent answered:
- Production is in place and verified (#85: per-page caching, robots.txt, Retry-After and refusal backoff, honest user agent with `/bot`).
- Items 1 and 3 are not in use (skipped and reverted).
- The sandbox remains blocked by four of the five converted schools. When fixtures are needed, ask the user to save pages from their browser.
- Not done: allowlisting requests to schools, and a contact address on `/bot` (needs the user's go-ahead).
- Housekeeping: confirm the Cron Trigger list is empty in the dashboard; the unused `sas-sports-feeds` KV namespace awaits the user's decision.
- Unexplained, not recurring: the IAD preview failure; the #88 merge never deploying.

User: "Then let's move on. End session". Next: the next school the user names, per the instructions above.

After close, the user said: "Delete the KV namespace. Don't put any contact yet. I don't want them to know what I'm building yet."
- `sas-sports-feeds` (`44e354a55a1c43ce8013e40eb2cc9a75`) was deleted after confirming nothing on `main` binds it. The account has no KV namespaces.
- **No contact address on `/bot`, and do not contact schools about allowlisting, until the user says otherwise.** The user agent stays honest (`SAS-Sports/<version>; +…/bot`). Hiding the identity or presenting as a browser would be evasion and is out of bounds. `public/bot.html` still describes the app in one sentence; trimming that wording is the user's call.

### October 1, 2026 — BYU module and Football

User: "Let's add the next big 12 school". The handoff was read from main (`095d198`).

**School choice:** one Football schedule request each:
- arizonawildcats.com and baylorbears.com returned 403;
- byucougars.com and ucfknights.com returned 200.

BYU (next in catalog order among reachable schools) was chosen.

**PR #94** (setup + Football, one PR as with Arizona State #66):
- `40ce36f`: module, route parity (438/438), card reader, fixture and test.
- Preview gate on `40ce36f`:
  - the feed was correct;
  - 2 of 3 expanded views were `recap_not_found`, and Sep 12 got its highlights through a fallback;
  - production's expanded views used other teams' games.
- `3796ecc` fixed the matcher (see "Current state"), adding the three unmodified recap fixtures and tests. Mutations fail the test: the parse hook removed, the recap hook removed, the card-bound condition dropped.
- **Before merge, on `3796ecc`:**
  - `npm run test:release` and `npm test` passed.
  - CI was green (guardrails, certification-matrix, Workers Builds), with no conflict.
  - Preview: Football feed in K-State format; 3/3 expanded views `recap_generated` with 4 highlights from the right BYU recap; K-State XC 18/20, KU XC 26/21; 36/36 forced Football refreshes 200 (EWR/IAD).
- **Merged** as `8cbbb30`. Production reported `4.36.0-byu-football` at 21:07:49 UTC.
- **Production after a 45 s wait:**
  - the Football feed and all 3 expanded views matched the preview;
  - K-State XC 18/20, KU XC 26/21.

**Testing note:** Python's `urllib` gets HTTP 403 from the Worker's own host; use curl for gate checks.

**Not done:** the other 11 BYU sports (see "Current state"). BYU athlete certification was not reviewed.

### October 1, 2026 — School load at scale; global source cache planned and paused

User: "If schools are still blocking you what will they do if 20000 people are using the app?" The agent answered:
- The 403s hit the development sandbox, not production.
- Since #85, school downloads scale with Cloudflare locations × pages ÷ save window, not with users. A 15-sport school could see roughly 300 schedule checks a minute at 20,000 users spread over about 40 locations.
- If a school blocks us, users get the labeled saved copy for up to 7 days.

The agent recommended item 1: one copy per school page for the whole network.

**Plan approved by the user, then paused:**
- One SQLite-backed Durable Object per school host, behind the existing per-location cache.
- Single-flight downloads, with the existing save windows and conditional rechecks.
- robots.txt rules and refusal backoff shared globally.
- A ceiling of about 20 downloads a minute per school; over the ceiling, the saved copy is served.
- A per-school downloads-per-hour view; a code off switch; direct fetch only if the Durable Object itself fails (never to route around a school refusal).
- Merge only with the user's yes. The user dropped the hour-long post-merge watch (no users yet); a short production check is enough.

**Blocker found before any code was written:**
- Cloudflare's Version URLs (the model this Worker's Builds still uses for `<branch>-sas-sports` previews) "are not generated for Workers that implement a Durable Object".
- Worker Previews support Durable Objects, but they need:
  - a one-time, irreversible dashboard switch by the user;
  - a `previews` block in `wrangler.jsonc` with the AI and Durable Object bindings, since Previews do not inherit production settings;
  - Wrangler 4.135.0 or later (the lockfile installs 4.133.0).
- Workers KV was rejected as the alternative: changes take up to 60 s to reach other locations, so most locations would still download each schedule.

User: "Pause". Nothing was built or pushed. Rough cost estimate for later: Durable Object requests are 1 million/month included, then $0.15/million, plus duration; the agent guessed $10–60/month at 20,000 users, to be measured on a preview.

### October 1, 2026 — Finish BYU (all sports)

User: "How many schools are complete now?" The agent answered:
- complete: K-State, KU, Oklahoma State, Utah and Arizona State (some with source-blocked gaps);
- in progress: BYU (Football only);
- not converted: 62 other schools, including 10 Big 12 schools.

User: "Finish BYU, do all the sports". All 17 official schedule pages downloaded (200). One sport per PR, each merged by the agent under `AGENTS.md` item 6:

| PR | Sport | Merge | Notes |
| --- | --- | --- | --- |
| #97 | Volleyball | `594fdf8` | `No.` rankings, plain Recap links, internal scrimmage skipped |
| #98 | Soccer | `1dc49ec` | Tournament names, recap date check; second commit: recaps must name BYU |
| #99 | Cross Country | `bd00cd7` | Both teams, team finishes, recap-table race rows; regression route check accepts lists |
| #100 | Basketball | `437b046` | Both pages only; `TBD` bracket game named |
| #101 | Baseball | `ee15b9c` | Official page only |
| #102 | Softball | `25365aa` | Official page only |
| #103 | Golf | `d449e91` | Both teams, placings; final recaps only (`end_time`, title states place) |
| #104 | Tennis | `47d8b10` | Both teams, tournaments named by headings; multi-day recap dates |
| #105 | Swimming & Diving | `8613b16` | Both pages only; internal meets skipped |
| #106 | Gymnastics | `1365361` | Current-season filter, empty schedule, decimal scores |
| #107 | Track & Field | `c6682ba` | Official pages (was 502); two-team empty schedule fix |

**Before every merge:**
- `npm run test:release` and `npm test` passed on the final commit, and named mutations failed `tests/byu-module.mjs`.
- CI was green (guardrails, certification-matrix, Workers Builds), with no conflict.
- Preview: the sport's feed in K-State format, expanded views checked, K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes. After #106, all 12 BYU sports were recounted on the preview.

**After each merge:** a production check after a 45 s wait (version, feed, expanded views, XC). The final survey (~23:10 UTC) gave all 12 BYU sports 200 and XC 18/20 and 26/21.

**Found by the gates and fixed before merge:**
- Soccer Sep 3 used a Colorado story.
- Golf used day-one stories.
- The tennis USTA recap was refused by the one-day window.
- Track & Field returned 502 because of the labeling identity issue.
- A Cross Country highlight read "finishing 13:21.4".

**Not done:** BYU athlete certification review. Recap coverage is limited where BYU publishes none (see `docs/BYU_MODULE.md`).

### October 1, 2026 — K-State Volleyball live scores (PR #109)

User: "KSTATE volleyball had a match right now. Can we find a live feed and have live results on the KSTATE volleyball page?" ESPN's women's college volleyball scoreboard listed BYU at Kansas State (7:30 PM EDT). The agent:
- added it to K-State's live scoreboards;
- captured the real in-progress event (23:35 UTC, 1st set 2-1) as a fixture.

**Found on the preview:**
1. **No live card.** ESPN returned 403 to the app's user agent (any `+https://…` link, `/bot` or `/about`), so all ESPN scores had failed since #85. The agent asked the user. User: "Do one" (drop the link for ESPN only).
2. **Phantom New Hampshire final.** Once ESPN answered, New Hampshire Wildcats matched K-State's "Wildcats" alias. Fixed with a second real fixture (the Sep 30 New Hampshire vs Stonehill event).

**Merged** under the gate after both fixes, and verified in production (above).

Session close (about 00:40 UTC, October 2): User: "End session". Production `4.37.7-byu-basketball-live`. All work is merged (#94, #97–#119); no open PRs from this session.

