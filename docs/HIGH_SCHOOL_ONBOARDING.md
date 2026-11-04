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
| `sports.grades` | how Bound writes the grade teams (`usd475`: "7th Grade - A - 1", "7A"); default "7th", "7th Grade A" |
| `stateXc` | the KSHSAA state cross country card: class, names in the results, sexes |
| `extraMeets`, `milesplitNames` | still read, but the statewide index and the alias table replace them |
| `note` | free text, not read |

The county module exports each school (`export const junctionCityKsSchool=DATA['junction-city-ks']`) and its lists; `src/index.js` registers the lists in `HIGH_SCHOOL_MODULES` as before. Then, as for any school: the catalog entry (`src/schools.json` with `county` and `city`), `src/sponsored-sports.json`, `src/team-themes.json` (Bound's colors are in the report), the module doc and tests.

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
