# Middle and high school reference: Manhattan

User, November 6, 2026: "We need to make the Manhattan schools the next that they can be so we can create rules for every other school. There's been too many mess ups. Like we did with KSTATE being the base for all of college", then "List it has Manhattan high, Anthony, and Eisenhower".

The reference schools are USD 383's **Manhattan High School** (`manhattan-ks`), **Susan B. Anthony Middle School** (`anthony-ms-ks`) and **Eisenhower Middle School** (`eisenhower-ms-ks`). Every middle and high school must behave as they do. Sources and per-sport detail are in `MANHATTAN_KS_MODULE.md`. The rules for listing and finishing a school are in `AGENTS.md` 5c.

## The baseline (like K-State XC 18/20 and KU 26/21)

| Check | Command | What it proves |
| --- | --- | --- |
| Saved-source cards | `node tests/hs-reference.mjs` (in `npm test` and `test:release`) | All 22 sponsored sports of the three schools are rebuilt through the Worker's own `fetchLive` from the real sources saved on the baseline day (156 reads: calendars, MaxPreps, Bound, LetsGoRun, MileSplit Live, Prep.Golf, TennisReporting). They must match the 407 cards checked by eye that day, card by card, and the rules below must hold on them. |
| Page in a browser | `node scripts/check-reference-page.mjs --base=<preview>` | Each team page, at 390 px with every sport's saved copy two days old (football's holding only an old game), shows every in-season sport the Worker lists, its ranks, and no sideways scroll. This is the #544 regression ("It's broke": only soccer and cross country showed). |
| Preview gate | `npm run verify:preview -- --branch=<branch> --school=manhattan-ks,anthony-ms-ks,eisenhower-ms-ks --sports=all --refreshes=3` | 3 forced refreshes per sport, results format, expanded views, K-State and KU XC. |
| Rules on every school | `npm run check:reference-rules -- --base=<url> [--school=<ids>\|--county=<name>] [--sports=<names>] [--refresh]` | The rules below read off every other middle and high school's feeds (all 99 by default; `--refresh` rebuilds each feed instead of reading its saved copy, which after a deploy may predate it). FAIL: a past card not final, a "No score posted" worded otherwise, a game with no opponent, a title with a site note or time, a junior varsity event, a "vs TBD" round, a repeated id, a scored season with no record, a college rank, featured athletes. NOTE (read by eye): capitals, two matches with one opponent at one time (two source pages), a sport with nothing published yet. |
| Rule cases | `node tests/hs-rules.mjs` (in `npm test`) | The cases the rules found on the other counties (November 7, 2026), rebuilt from that day's real sources (`tests/fixtures/hs-rules/`, recorded with `record:reference -- --dir=hs-rules --feeds=<school>:<sport>,…`). |
| Page on other schools | `node scripts/check-reference-page.mjs --base=<url> --school=<ids>` | The page check above on any school; on November 7 one high school and one middle school of every county (37 schools) passed. |

**Re-recording.** `SAS_SOURCE_KEY=… npm run record:reference` saves today's sources and cards (`tests/fixtures/hs-reference/`). Read every card in the new `expected-<date>.json` and every difference from the old one before committing. Delete the older pair. Re-record when a season changes (the first winter results, spring schedules), not to make a failing test pass.

## What every middle and high school must do

1. **Every sponsored sport lists the school's schedule**, all teams the school publishes (girls and boys, 7th and 8th grade), varsity only. `npm run audit:sports` and `npm run audit:bound` fail when a published team is not read.
2. **Results from every source that exists**, in this order, each connected and tested:
   - games: MaxPreps team schedule (scores, league flag, game page, box score in the expanded view), then Bound (score entered by the school);
   - cross country: LetsGoRun MeetPro, MileSplit Live (also the statewide index for meets the schedule leaves out), Midwest Timing (KSHSAA state), Bound team places;
   - golf: Prep.Golf; tennis: TennisReporting; track: MeetPro track; winter meets: Bound team scores.
3. **Played without a score.** A past game or meet with no result anywhere is listed as played: "No score posted" (a meet: "No results posted"). It takes its score when a source posts it. Results nobody publishes are recorded in the module doc as "not published", with the sources checked (middle school game scores, for example).
4. **Rounds never reached are not listed.** A calendar placeholder ("State Championship - TBD", "Sub-State", "Quarter Final") is listed while it is ahead and reads "Manhattan · Sub State - TBD", not "at" or "vs". It goes away once its first day passes with no game, or once the team has a MaxPreps playoff loss (November 7, 2026: Manhattan soccer's state placeholder read "Today" after its Oct 26 loss at Maize).
5. **Titles read as names.** The calendar's notes and shorthand are cleaned:
   - "- HOME 9:30AM (Girls)/1PM (Boys)" and "- AWAY 1:30 Dive/5:00 Swim" give the site and are dropped;
   - "BWR Dual vs EMS" is a dual, "Anthony vs Eisenhower";
   - words typed in capitals read as names ("Double Dual", "Concordia");
   - known slips are corrected ("Norht", "Stare Park");
   - an event named without a place reads "·" ("Eisenhower · League Tournament 1st Round").
   A junior varsity day on a varsity team's calendar ("JV League") is not listed; nor is a junior varsity event Bound files as varsity ("Wabaunsee Track Meet - RC JV", "Louisburg JV Mixer", a middle school's "Eudora MS JV vs Santa Fe Trail 7th Grade"). "JV/V" and "Varsity & JV" are varsity.
   Bound's event names follow the same capitals rule ("EMPORIA Bowling Meet" reads "Emporia Bowling Meet"); league and school codes stay ("NCAA League Tournament", "WCHS Invite", "KSHSAA").
   A Bound game against "TBD", or against a team Bound has not named yet, reads "Silver Lake · TBD", and on a day MaxPreps has the game, gives way to it.
6. **Live.**
   - **Team feeds** take a game's running score from MaxPreps' state scores page when it has the game (fresher than the team page: 22-7 there while the team page read 15-7, Nov 6). It is matched by MaxPreps school id, then by the team page's live flag.
   - **Meets** go live from their timers.
   - **Home** lists every app school's live game for everyone, from the same state page.
   - **Video:** a school channel's live game carries its video on the team page and on Home.
7. **Ranks.**
   - MaxPreps' state and class ranks for the team, read from the team schedule page the app already reads: "No. 10 Kansas · No. 3 6A" after the record.
   - On today's and live games, each side's state rank from the state scores page ("#10 Manhattan vs Garden City").
   - College polls never apply.
8. **Records** come from the finals (overall, and league from MaxPreps' conference flag), every month of the school's season (middle school girls' basketball is played in October; college basketball's November start does not apply).
8a. **One card per match.** Two matches with one opponent on one day (Wamego and Sabetha twice on Oct 10, two MaxPreps match pages) are two cards with their own ids: the later takes "-2". MaxPreps' unscored copy of a scored match (same opponent, same time or none) is not another match (Hanover's 9:00 match with Marais des Cygnes Valley; Frankfort's "White City" slots beside its Rural Vista [Hope/White City] matches). An unscored match against an opponent the day has no scored match with is played, listed once ("Hartford vs Lebo · No score posted").
9. **Saved copies.**
   - Every official final is kept (D1 `finals`) and listed again if a source drops it.
   - A wrong one is retracted in `RETRACTED_FINALS`.
   - The KV saved copy answers while a rebuild runs.
   - On the device, team pages read every in-season sport, and Home re-reads a copy over 12 hours old.
10. **No featured athletes** (minors).

## Before merging a middle or high school change

- `test:release` (it includes `tests/hs-reference.mjs`).
- A shared reader or source change: `npm run diff:feeds -- --branch=<branch> --sport=all` against production. Every changed card is explained.
- On the preview: `verify:preview` for the changed schools and for the three reference schools (3 refreshes), and `node scripts/check-reference-page.mjs --base=<preview>`.
- A change to a shared reader: `npm run check:reference-rules -- --base=<preview>` on every school (then `--refresh` on the schools it flags, since a preview's saved copies can predate it), and `check-reference-page.mjs --school=` on a sample of each county.
- After the merge, check production's cards themselves (`verify:prod`, then the page).

## Known limits of the reference schools (November 7, 2026)

- **Middle school game scores are not published anywhere.** No site has Anthony's or Eisenhower's game scores, so they read "No score posted". SAS Scorer is the only way to get them.
- **Manhattan's Oct 24 sub-state** shows runners only. Bound has no team places entered.
- **Meets that ran under another name.** Manhattan's Oct 10 Haskell Invite and Eisenhower's Sep 22 Clay Center have no results: those days the timers have the teams at the Salina Invitational and McPherson, and those cards are listed.
- **Golf and tennis meets** read "No results posted" when the host posted nothing to Prep.Golf or TennisReporting.
- **Calendar typos the app cannot know**, such as "Hay Tournament", are shown as typed.
- **Calendar capitals in Manhattan's own titles** ("Manhattan at Regional Meet - WARNER PARK") are not cleaned yet; the capitals rule is applied to Bound's names. Changing it moves the baseline: re-record and read the cards.
