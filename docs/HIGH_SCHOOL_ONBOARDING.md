# Middle and high school onboarding

User, November 4, 2026: "Is there anything that we can do to make Middle School and high School onboarding and getting data easier?", then "Do 1-3 now". Three pieces came out of it:

1. **A discovery script**: a county in, a draft data file and a coverage report out (`scripts/onboard-hs.mjs`).
2. **Schools as data**: a school whose schedule is on Bound is a JSON entry (`src/schools/data/<state>-<county>.json`), built by `src/high-school-builders.mjs`.
3. **Sources indexed once for the state**: the statewide MileSplit Live meet index and the state's alias table (`src/schools/data/ks-aliases.json`).

The rules for middle and high schools are still `AGENTS.md` item 5c.

## 1. Survey a county

```
NODE_USE_ENV_PROXY=1 SAS_SOURCE_KEY=... node scripts/onboard-hs.mjs --county=Ellis \
  --out=<scratchpad>/ellis-draft.json --report=<scratchpad>/ellis-report.md
```

It reads, in order:

| Step | Source | What it gives |
| --- | --- | --- |
| County | Census county list (`www2.census.gov/geo/docs/reference/codes2020/cou/`) | the county's FIPS code |
| Schools | NCES Common Core of Data through the Urban Institute's Education Data API (`educationdata.urban.org`) | the county's public middle and high schools (grades reaching 7 or more), and every town with a school |
| Members | KSHSAA's directory (`kshsaa-api.kshsaa.org/directory/search/city/<town>`), once every 30 s (robots.txt `Crawl-delay: 30`) | member schools of each town, private ones too: class, league, website. Only school fields are kept, never a person's name, phone or e-mail |
| Bound | Bound's state schools page (`beta.gobound.com/ks/schools`, its page data) | Bound id, page slug, town, address, mascot, colors; then each school's events by sport at its level (varsity, or middle school grades) for two school years |
| MileSplit | The statewide MileSplit Live index (below) | the school's MileSplit team id, by name and level |
| Golf | Prep.Golf's school list (`ks.prep.golf/schools`) | the Prep.Golf school id |
| MaxPreps | The app's private source route (`SAS_SOURCE_KEY`), once every 30 s | the school page from its town, name and mascot: MaxPreps id and team pages |

Schools are matched across sources by name without level words (`schoolKey`: "Junction City Sr High", "Junction City HS" and "Junction City High School" are all "junction city"), level and town, and a Bound school by its street address when its name differs ("St. Francis Xavier Catholic" is KSHSAA's "St. Xavier HS").

Since November 5 it also fills in what was looked up by hand for Dickinson, Wabaunsee, Morris, Clay and Marshall:

- **Prep.Golf golfer code:** the code all of a school's posted varsity tournaments share (`prepGolfCode`; of two left, the one matching the name's initials).
- **TennisReporting name:** every school in the state's TennisReporting events (`tennisReportingName`; "Salina-Central HS" is Salina Central).
- **MaxPreps id** from a school page with no mascot image: the page data's most frequent `schoolId` (Wakefield).
- **Bound coverage:** the school's Bound football (else volleyball) games this year against MaxPreps' schedule. Under 85% gets `sports.maxprepsSchedule` in the draft (60% until November 5: Centralia 6 of 10 and Nemaha Central 7 of 10 were missing games), with a table in the report (`boundCoverage`; Wabaunsee had 1 of 10).
- **LetsGoRun (MeetPro) meets:** the listing's folders for the season, plus last years' folder names with this year's (`letsGoRunGuesses`; the 2026 listing showed one cross country meet, and six more existed). Each is read, and the report lists its date, title, the county's schools that ran it, and whether the app reads it already. Folders go in `LETSGORUN_MEETPRO.folders` by date. When schools already in the app ran the meet, compare first (`npm run diff:feeds`).

**Several counties at once** (November 5): `--county=Washington,Republic,Cloud --out-dir=<dir>` writes `<County>-draft.json`, `<County>-catalog.json` and `<County>-report.md` for each; statewide pages are read once per run.

**Results sources table:** for each school's cross country meets this season, the report shows where results are: MileSplit Live (meet id and its timer), a LetsGoRun folder with the school, or "none found".
- **Timers:** MileSplit Live names each meet's timer. Kansas 2026: Midwest Timing & Results 65, Goddard 22, LetsGoRun 17, FAT Dog 13, Heartland 10, Shawnee Mission Timing Team 10, Timer Guys 7, and others. Their own sites point to MileSplit Live (Heartland, Midwest Timing).
- **"None found"** is mostly small meets the host times itself (TVL, Concordia, Beloit, Marysville, Republic County in 2026). Check the host school's site before recording them as not published.

The draft holds one entry for each school found on Bound. The report lists every school found, with what each source had, and what is left to check by hand:

- the school's own calendar (district sites: ParentSquare, Apptegy, Finalsite, Google Calendar) for games Bound lacks; a school with no Bound events needs its own reader in the county module (as Blue Valley, Onaga, Flint Hills Christian, Manhattan Catholic and St. Xavier have);
- private and non-member schools NCES and KSHSAA do not list (Kansas Approved Schools, homeschool programs);
- TennisReporting school names, LetsGoRun (MeetPro) team names (the draft uses Bound's), Prep.Golf golfer codes (`"code":"?"`);
- MaxPreps team pages, and spring sports not yet on Bound.

The Geary County run of November 4 is the reference: see the session record in `docs/SAS_SPORTS_HISTORY.md`.

## 2. The data file

`src/schools/data/<state>-<county>.json`:

```json
{
  "state": "ks",
  "counties": ["Geary"],
  "module_doc": "docs/GEARY_KS_MODULE.md",
  "schools": [
    {"id": "junction-city-ks", "name": "Junction City High School", "level": "high-school",
     "globalSavedCopy": true,
     "bound": {"school": "h20250204045159822386f317805064a", "slug": "junctioncityhs"},
     "maxpreps": {"schoolId": "0db83983-6aab-46c9-9989-88ee256551be", "path": "junction-city/junction-city-bluejays"},
     "meetPro": "letsgorun",
     "prepGolf": {"school": 7, "code": "JC"},
     "sports": {"has": ["Football", "Volleyball", "..."], "meetTeam": "Junction City", "tennis": "Junction City HS",
                "milesplit": 15714, "paths": {"Girls Soccer": "soccer/girls/spring"}}}
  ]
}
```

| Key | Meaning |
| --- | --- |
| `id`, `name`, `level` | the catalog id (`src/schools.json`), the name, `high-school` or `middle-school` |
| `bound` | Bound school id and page slug; no slug when Bound gives the school no page (the feed links Bound's state page) |
| `maxpreps` | MaxPreps school id and path (high schools) |
| `meetPro` | `letsgorun`: LetsGoRun Timing's MeetPro folders (`SHARED_SOURCES`) |
| `prepGolf` | Prep.Golf school id, golfer code, `sharesCodeWith` |
| `globalSavedCopy` | keep a saved copy shared by every Cloudflare location (a source that refuses some locations) |
| `sports.has` | the sports, in `boundHighSchool`/`boundMiddleSchool` names ("Girls Golf", "Boys Tennis", "Girls Swimming", "Unified" bowling under "Bowling") |
| `sports.meetTeam`, `trackTeam` | the names timers write (one or several) |
| `sports.tennis` | the TennisReporting school name |
| `sports.milesplit` | the MileSplit team id |
| `sports.paths` | a MaxPreps team path that differs from the usual one |
| `sports.maxprepsSchedule` | the school enters few of its own games on Bound: its game sports also read MaxPreps' schedule (Bound's entries, then every MaxPreps game Bound lacks). Since November 5 (Wabaunsee: 1 of 10 football games on Bound) |
| `sports.grades` | how Bound writes the grade teams (`usd475`: "7th Grade - A - 1", "7A"); default "7th", "7th Grade A" |
| `stateXc` | the KSHSAA state cross country card: class, names in the results, sexes |
| `extraMeets`, `milesplitNames` | still read, but the statewide index and the alias table replace them |
| `note` | free text, not read |

**A county with only data schools** (November 5: Dickinson, Wabaunsee, Morris, Clay, Marshall) needs no module of its own: add its file to `KS_COUNTY_FILES` in `src/schools/ks-counties.mjs` (one import line), which the Worker already reads. Check each school's Bound counts against MaxPreps (a school with few Bound games gets `maxprepsSchedule`). Also confirm that every Bound event's own `IDAct` is the act asked for: the survey has done this since November 5, because Bound answered Herington's events with every sport. See `docs/NORTH_CENTRAL_KS_COUNTIES_MODULE.md`.

A county module that also holds coded schools exports each school (`export const junctionCityKsSchool=DATA['junction-city-ks']`) and its lists; `src/index.js` registers the lists in `HIGH_SCHOOL_MODULES` as before. Then, as for any school: the catalog entry (`src/schools.json` with `county` and `city`), `src/sponsored-sports.json`, `src/team-themes.json` (Bound's colors are in the report), the module doc and tests.

`tests/hs-config.mjs` checks every data file (known keys only, unique ids, a level, sports) and that the 22 Riley, Pottawatomie and Geary modules are the objects their hand-written modules were on November 4 (`tests/fixtures/hs-config/modules-2026-11-04.json.gz`), apart from the `extraMeets` and `names` that moved to the index and the alias table.

## 3. Sources indexed once for the state

### MileSplit Live meet index

MileSplit Live's public database answers one query for every meet of a state, season and year (`venue.state`, `seasonYear`, `season`: equality filters only; a date range by state needs an index the database does not have). Kansas cross country 2026: 172 meets (163 not college), 659 teams, about 2.4 MB, under a second (`milesplitSeasonQuery`, `milesplitSeasonIndex` in `src/high-school.mjs`).

- **In the feeds:** every cross country team with a MileSplit team id reads the index (`milesplitSeasonFor` in `src/index.js`: kept ten minutes, parsed once per isolate). A meet with the team in it, run by today, on a day the schedule has nothing, joins the schedule (`milesplitIndexGames`) and is read by its MileSplit meet id. It is kept only when the results list the school's runners: a team entered with no runner (St. Xavier at Council Grove, October 1) or a varsity team at a middle school meet is not listed. This replaced the hand-kept `extraMeets` of St. Xavier (October 3, 8, 24), Junction City HS (October 24) and Fort Riley MS (September 15).
- **For onboarding:** team ids by name (`milesplitTeamsNamed`).
- Track (`season` "Outdoor") reads the same way once the spring season is posted; the feeds use it for cross country only so far.

### Alias table

`src/schools/data/ks-aliases.json` → `meets`: a schedule's meet name to MileSplit Live's ("Blue Jay Invitational" is the "Bob Schmoekel Invitational"), read for every Kansas school after the team's own `names`.

### Checked and not built (November 4)

- **Opponent-side scores on Bound:** of 151 middle school games (Junction City, Fort Riley, Wamego, Rock Creek, Riley County MS; football, volleyball, basketball) and 72 varsity games (eight high schools) with no score on November 3, none had a final in the opponent's own Bound entries (69 opponents read). Nobody enters those scores. Not built.
- **KSHSAA team schedules** (`schedules/generalSchedule/teamschedule/<activity>/<school>/<gender>`, from kshsaa.org's page code): HTTP 500 to two requests 30 s apart (Volleyball and Football for Junction City, KSHSAA id 605); the parameters are not published. Not used. KSHSAA's state and regional sites (`playoff-sites/...`) and directory answer.

## Not to be built

User, November 4: "I do not want parents or non time scorers to do results so scratch those ideas". No results from parents, fans or other unofficial scorers: no crowd-sourced scorer links, and no text-in or e-mail-in scores. A game no official source scores stays "No score posted".

## Scheduled refresh (November 4)

User: "Do the schedule refreshed". A Cron Trigger every 10 minutes (`wrangler.jsonc`) rebuilds the next 8 middle and high school feeds (183 in all, about every 4 hours each), one at a time and 20 s apart, as production (`src/scheduled-refresh.mjs`, `runRefreshBatch` in `src/index.js`). A good build becomes the feed's saved copy in KV, shared by every Cloudflare location. Since this change every middle and high school keeps one: a school without `globalSavedCopy` rewrites it at most every 3 hours unless its events changed. A visitor's build that a school's site or MaxPreps refuses then serves a recent copy instead of a blank feed. Visitors still build feeds as before; the refresh does not change what a good build shows.

- `/api/refresh-status`: the schedule, the last run (each feed: ok, time, events, the reason it failed) and totals.
- `/api/refresh-control?action=pause|resume|run` (POST, `Authorization: Bearer <SOURCE_FETCH_KEY>`): pause or resume the Cron Trigger's runs without a deploy, or run 2 feeds now (`&size=` up to 8). On a branch preview a run builds and saves that preview's own copies and record (previews do not run Cron Triggers).
- The October 1 attempt (#87, every college feed every minute) failed every scheduled build and was reverted with no cause found (`SAS_SPORTS_HISTORY.md`). This one is smaller, records each reason, and can be paused at once.

## Stored finals (November 4)

User: "Once we have results from anywhere shouldn't we just be saving them in a database? Results do not change.", then "Yes, build it and merge when everything passes". Every middle and high school final an official source gives (a game's score, a meet's results) is stored in D1 (`CATALOG_DB`, table `finals`, one row per game or meet, created by the Worker on first use; `src/finals-store.mjs`, `withStoredFinals` in `src/index.js`).

- **Written:** a final not stored yet; a final an official source has changed (the row is updated, and the old reading is kept in `history`, the last 5).
- **Read back on every build** (this school year): a game the build shows "No score posted" (a refused MaxPreps read) takes its stored final; a final the sources no longer list is listed again. A game today or live is left as the build has it.
- **Matching:** day, team (girls/boys, grade) and opponent, exact name first and only then a compatible one ("Topeka" and "Topeka High"), so a triangular's matches never trade scores; a doubleheader's second game is its own row (`#2`); a meet by day and team.
- **Saving:** the stored finals complete a build whose scores source failed, so it is saved again unless a game still reads "No score posted" (it may be a new final the store does not have yet).
- **Kept per host:** a branch preview writes and reads only its own rows (`scope`), never production's.
- `/live/status` reports `finals_store: {read, written, filled}` (or its error). Results come only from official sources; nothing else writes to the table.

**Colleges too (November 4, user: "Fix them both").** College builds (`fetchLive` wraps every college and middle/high school build; pro entries are not stored) write and read the same table. A build whose official page failed (`official_failed`, or an error) is left to the saved copies. A college keeps K-State's rule: only finals with a result are stored (a score, or a meet's results), so nothing listed from the store lacks one. A school module's `highlightRevision` is part of its rows' scope (`prod|r2` for Baylor), and `FINALS_EPOCH` in `src/index.js` resets every school: raising either starts the stored finals afresh, so a final a corrected reader no longer gives is not listed again. An expanded view's build only reads, and rows added to a game (a box score) are not a changed result: only its headline or score is. A stored meet with verified official results is never replaced by a build whose results step failed (TFRRS refused a burst of reads on the preview, November 4: cards fell back to the schedule's places without points); the stored result is shown and nothing is written.

**Retracting a wrong stored final (November 5).** Stored finals are listed again when the sources stop giving them. A final later shown to be wrong (a reader fix no longer gives it) therefore needs an entry in `RETRACTED_FINALS` (`src/finals-store.mjs`: school, sport, day, reason); its rows stay in the table but are never listed. The first entry is Junction City's Greg Wilson Classic (September 5), stored with the Manhattan XC Invitational's places before #527's folder check. After a fix that changes what production shows, check production's card itself, not only the preview: production's stored finals can keep the old card.

**Why a scheduled build failed.** A failed scores read now records its page and the reason: `<url>: HTTP 403`, or `HTTP 503 (waiting out an earlier HTTP 403 refusal; no request sent)` while the source layer backs off after a refusal (`/api/refresh-status` and `/live/status` `scores_errors`).

## Comparing with production (November 5)

`npm run diff:feeds -- --branch=<branch> [--sport="Cross Country"|all] [--level=high-school,middle-school] [--school=a,b] [--out=diff.json]` (`scripts/diff-feeds.mjs`):

- **What it compares:** a fresh preview build (`refresh=1&stored=0`) of every middle and high school feed of the sport, against production, card by card (day and title; headline and rows). It exits 1 when a feed differs.
- **`stored=0`:** on a preview only, the build skips its stored finals, so a wrong final saved by an earlier preview build does not show. Production ignores it.
- **When to run it:** a shared source changes for schools already live (`AGENTS.md` 5c). On #525 it found middle schools taking a high school's places and a Topeka school's runners on Manhattan's Eisenhower MS.
- **A LetsGoRun folder filed by day** is taken only when the schedule's name for the meet, its alias, or its host (a team in the results) shares a word with the folder's name or title (`meetProFolderFits`). A name with no word of its own ("MS XC") takes the day's folder.
- **Schedule pairings:** `tests/hs-schedule-pairings.mjs` builds whole feeds through the Worker for Bound alone and for Bound + MaxPreps' schedule (the missing Olpe game of #523's first preview).

## Adding a surveyed county (November 5)

`npm run add:county -- --draft=<County>-draft.json --doc=docs/<DOC>.md [--skip=id,...] [--rename=old:new,...] [--dry-run]` (`scripts/add-county.mjs`):

- **What it writes:** `src/schools/data/ks-<county>.json`, the county's line in `src/schools/ks-counties.mjs`, and each school's catalog entry (`src/schools.json`: name, town, county, class, league, website, aliases, providers), sponsored sports (from the built module) and team colors (Bound's first real color).
- **Before running it:** review the draft (ids, MileSplit team, skipped schools). Then add the county to `tests/ks-counties-module.mjs` and `tests/catalog-module.mjs`.

## MileSplit Live: names and same-day meets (November 5)

- **Team ids by name:** an exact name wins over a longer one (`milesplitTeamsNamed`). "Linn High School" (Washington County) is team 21971, not Jayhawk Linn (21877), which had more meets.
- **A second meet on a day the schedule already has one:** the index's meet gets its own card when it is plainly another meet (`sameIndexMeet`). The test is that the schedule's meet has a name of its own, and neither that name, its alias nor its venue shares a word with the index meet's name, venue or town. Examples:
  - Junction City, September 5: Bound has the Greg Wilson Classic; a second squad ran the Manhattan Invitational (Boys 6th of 11), now its own card.
  - Eisenhower MS, September 22: the calendar says "at Clay Center"; its runners were at the McPherson MS Invitational.
  - Manhattan, October 10: the calendar says the Haskell Invite; its varsity won the Salina Invitational girls' race.

  The index rule still keeps a meet only with the school's own runners: Council Grove's six runners at Lyndon (September 10) were 7th and 8th graders, so its varsity gets no Lyndon card.
- **Listed but no runners:** MileSplit Live listing a team in a meet with zero entries means the results were not posted for it (Wabaunsee at Riley County, October 10; Junction City at the Greg Wilson Classic, September 5).

## Sites that turn the app away (robots.txt, November 5)

| Site | Answer |
| --- | --- |
| Trackwrestling | `User-agent: ClaudeBot Disallow: /` (and HTTP 406) |
| FloWrestling | `ClaudeBot Disallow: /` |
| Athletic.net | disallows ClaudeBot and anthropic-ai |
| SwimCloud | `anthropic-ai Disallow: /` |
| USA Bracketing | robots.txt allows event results pages, but every event page (`/events/<id>`, `/results`, `/schedule`) redirects to its sign-in page (November 6): no public results to read |
| KSHSAA | `Crawl-delay: 30`; its site is a script page, with no readable results found yet |

Do not read the sites that disallow the app.

## Winter sports (November 6, 2026)

- **Schedules:** basketball, wrestling, swimming and bowling come from the same sources as the fall (Bound, MaxPreps' schedule for schools with `maxprepsSchedule`, the school calendars). `npm run audit:sports` checks the calendar schools; `npm run audit:bound` (`scripts/audit-bound-sports.mjs`) checks every Bound school's winter acts this school year against its data file's `has` and `src/sponsored-sports.json`. Run both when a season starts.
- **Bound's guard:** about 350 reads 0.4 s apart drew HTTP 202 with no body; it then kept answering Node's client with 202 while it answered curl. The audit reads with curl, 3 s apart. Production's Bound reads were not affected (`/api/refresh-status`).
- **Results:** basketball finals from MaxPreps, then the school's Bound entry. Wrestling, swimming and bowling meets take the team scores a meet's host enters on Bound (high wins; `boundEntryResults`): last winter that was the bigger meets only (McPherson girls' wrestling invitational, December 6, 2025; Douglass's two varsity tournaments; Topeka West swimming, January 13, 2026). Other meets read "No results posted". Trackwrestling, FloWrestling and SwimCloud disallow the app; USA Bracketing needs a sign-in; KSHSAA posts state and regional bowling results as documents on its own script site (not read).
- **Unified bowling** is a fall KSHSAA sport: its October meets are on Bound under "Unified" (no scores entered).
