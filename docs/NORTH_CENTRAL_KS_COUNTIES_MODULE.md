# Dickinson, Wabaunsee, Morris, Clay and Marshall counties, Kansas: middle and high schools

User, November 5, 2026: "Adding more counties in Kansas. Is it going to be easier to add many schools at once?", then "Change the rule to we can add as many counties we think one session can handle. Add counties of your choosing. Skip any schools that will slow down the process for example ones that you have to build." (`AGENTS.md` 5c, "Several counties per session".)

The five counties border Riley, Pottawatomie and Geary, which were already in the app. Every school added is a data entry. There is no county code:

- `src/schools/data/ks-dickinson.json`, `ks-wabaunsee.json`, `ks-morris.json`, `ks-clay.json`, `ks-marshall.json` (`docs/HIGH_SCHOOL_ONBOARDING.md` gives the format);
- `src/schools/ks-counties.mjs` builds every file (`schoolsFromConfig`) and gives the Worker `KS_COUNTY_HIGH_SCHOOLS` and `KS_COUNTY_MIDDLE_SCHOOLS`. **The next all-data county needs only its data file and one import line there**, plus its catalog, sponsored-sports and theme entries, and a line in `tests/ks-counties-module.mjs`.

The rules for middle and high schools are `AGENTS.md` item 5c.

## How the counties were surveyed (November 5)

`scripts/onboard-hs.mjs --county=<name>` for each county, run one after another, since KSHSAA and MaxPreps get one read every 30 s. Then four checks by hand:

1. **Bound sports, re-counted.** Bound's events API ignores `idAct` for some schools and answers with every sport. Herington and Solomon came back with swimming, bowling and soccer, but the events were volleyball. Since this session the survey keeps only events whose own `IDAct` or `IDActs` is the act asked for, as the Worker's `boundSchedule` already did. The Worker's feeds were never affected.
2. **Bound coverage.** A school that enters only a few of its own games on Bound (Wabaunsee: 1 of its 10 football games; MaxPreps has all 10) also reads **MaxPreps' schedule** for its game sports: `sports.maxprepsSchedule` in the data file (`boundHighSchool` in `src/high-school-builders.mjs`). The feed shows Bound's entries, then every MaxPreps game Bound lacks, upcoming games included. MaxPreps' finals were already shown for every school. Meets (cross country, golf, wrestling, track) stay on Bound. Cross country also gains every meet the statewide MileSplit Live index has the school's runners at.
3. **Prep.Golf golfer codes**: the code shared by the school's players across its posted varsity tournaments.
4. **TennisReporting school names**: every Kansas school named in TennisReporting's 53 events.

## Schools added (16)

| School | id | County · town | Class · league | Schedule | Results sources |
| --- | --- | --- | --- | --- | --- |
| Abilene High School | `abilene-ks` | Dickinson · Abilene | 4A · North Central Kansas | Bound `abilenehs` | MaxPreps, MileSplit Live 21806, Prep.Golf 65/ABI, TennisReporting "Abilene HS", LetsGoRun |
| Chapman High School | `chapman-ks` | Dickinson · Chapman | 4A · North Central Kansas | Bound `chapmanhs` | MaxPreps, MileSplit 21822, Prep.Golf 78/CHAP, TennisReporting "Chapman HS" |
| Herington High School | `herington-ks` | Dickinson · Herington | 2A · Wheat State | Bound `heringtonhs` | MaxPreps, MileSplit 21870, Prep.Golf 210/HER |
| Solomon High School | `solomon-ks` | Dickinson · Solomon | 2A · Wheat State | Bound `solomonhs` + MaxPreps | MaxPreps, MileSplit 26131, Prep.Golf 243/SLM |
| Abilene Middle School | `abilene-ms-ks` | Dickinson · Abilene | Middle school | Bound `abilenems` | MileSplit Live 33030 (cross country) |
| Wabaunsee High School | `wabaunsee-ks` | Wabaunsee · Alma | 2A · Flint Hills | Bound `wabaunseehs` + MaxPreps | MaxPreps, MileSplit 22001, TennisReporting "Wabaunsee HS" |
| Mission Valley High School | `mission-valley-ks` | Wabaunsee · Eskridge | 2A · Flint Hills | Bound `missionvalleyhs` + MaxPreps | MaxPreps, MileSplit 21897 |
| Council Grove High School | `council-grove-ks` | Morris · Council Grove | 3A · Flint Hills | Bound `councilgrovehs` + MaxPreps | MaxPreps, MileSplit 21896, Prep.Golf 140/CG |
| Clay Center Community High School | `clay-center-ks` | Clay · Clay Center | 4A · North Central Kansas | Bound `ccenter` | MaxPreps, MileSplit 21807, Prep.Golf 79/CC, TennisReporting "Clay Center Community HS" |
| Wakefield High School | `wakefield-ks` | Clay · Wakefield | 1A · Wheat State | Bound `wakefieldhs` + MaxPreps | MaxPreps (`17ca41bd-…`, found by hand: the survey's guess had no id) |
| Clay Center Community Middle School | `clay-center-ms-ks` | Clay · Clay Center | Middle school | Bound `cccms` | — |
| Marysville High School | `marysville-ks` | Marshall · Marysville | 3A · North Central Kansas | Bound `marysvillehs` | MaxPreps, MileSplit 21880, Prep.Golf 166/MVL, TennisReporting "Marysville HS" |
| Valley Heights High School | `valley-heights-ks` | Marshall · Blue Rapids | 2A · Twin Valley | Bound `valleyheightshs` + MaxPreps | MaxPreps, MileSplit 22012, Prep.Golf 298/VH |
| Frankfort High School | `frankfort-ks` | Marshall · Frankfort | 1A · Twin Valley | Bound `frankforths` + MaxPreps | MaxPreps, MileSplit 21958, Prep.Golf 293/FRA |
| Axtell High School | `axtell-ks` | Marshall · Axtell | 1A · Twin Valley | Bound `axtellhs` + MaxPreps | MaxPreps (`485040ec-…`, found by hand), MileSplit 21951 |
| Marysville Junior High | `marysville-ms-ks` | Marshall · Marysville | Middle school | Bound (Marysville HS's id, grade levels) | MileSplit Live 33031 |

Sports per school come from Bound: sports with events at the school's level this school year, or on two days or more last year (`src/sponsored-sports.json`). Bound counts for each school are in the session record (`docs/SAS_SPORTS_HISTORY.md`, November 5).

## Skipped (left out to keep the session fast; each needs work of its own)

| School | County | Why |
| --- | --- | --- |
| Hope High School and Hope JH | Dickinson | No events of their own on Bound. Hope and White City play as **Rural Vista** (MaxPreps lists "Rural Vista [Hope/White City]"); its MaxPreps page was not found at `white-city/rural-vista-heat` |
| White City High School and White City JH (Rural Vista, `ruralvistahs`) | Morris | Few Bound entries (football 2) and no MaxPreps page found: a co-op that needs its own look |
| Chapman Middle School | Dickinson | Not on Bound (KSHSAA lists it; site usd473.net) |
| Herington Middle School | Dickinson | Not on Bound |
| Solomon JH | Dickinson | Few Bound entries (football 2, volleyball 5); no other source for middle school games |
| Mission Valley JH | Wabaunsee | Bound has only wrestling (3 events) |
| Wabaunsee JH, Paxico-Wabaunsee JH | Wabaunsee | Not on Bound (Wabaunsee JH has MileSplit team 43764) |
| Alma St. John's Lutheran | Wabaunsee | Elementary/junior high, independent; nothing published |
| Council Grove MS | Morris | Few Bound entries (cross country, track, wrestling only) |
| Wakefield (junior high) | Clay | Few Bound entries (football 1, volleyball 3) |
| Axtell JH, Frankfort JH, Valley Heights JH | Marshall | Few Bound entries (one or two events each) |
| Marysville Good Shepherd Lutheran | Marshall | Independent junior high; nothing published |

## Limitations

- **Spring sports for sparse schools:** `sports.has` comes from Bound. A spring team that Bound did not list last year (baseball, softball, track at some small schools) appears once Bound lists it, after a data-file edit. MaxPreps also lists wrestling for Axtell and Wakefield, but Bound does not, so it is not read.
- **No LetsGoRun names checked:** each school's meet team name is Bound's ("Abilene", "Clay Center"). Cross country results come from the MileSplit Live index by team id, which does not depend on the name. Track names are checked in the spring when the meets are posted.
- **Middle school game scores:** not published (5c): Bound finals only where a school enters them.
- **Cross country meets with no results** (preview, November 5). Each past meet that read "No results posted" was checked against the statewide MileSplit Live index for that day and the school's team id:
  - **LetsGoRun (MeetPro)** (user, November 5: "Did you look on let's go run for cross country results?"). Its results page (`letsgoruncom.rsupartner.com/race-results`) lists only one 2026 cross country meet, Clay Center's, which the app already read. `results.tfmeetpro.com/LetsGoRun_Timing/` also has 2026 folders under last year's names:
    - **NCKL Cross Country Championships** (10/15/2026): **added** (`LETSGORUN_MEETPRO.folders`). Varsity places and runners for Abilene, Chapman, Clay Center and Marysville, the grade races for Abilene MS and Clay Center MS, and Wamego, Rock Creek and their middle schools. It is read before MileSplit Live.
    - **Compared and added** (user, November 5: "Compare those. Let's go run meats"). Each was added on a preview, and every middle and high school cross country feed (42) was compared card by card with production:
      - **Centennial League** (10/17): Manhattan and Junction City gain team places (Girls 1st of 5 · Boys 2nd of 5; Girls 4th of 5 · Boys 3rd of 5). Runner places are unchanged; times are given to tenths (MileSplit Live: hundredths).
      - **Bob Schmoekel** (10/3): team places unchanged. Runner places are now within the varsity race: St. Xavier's Joshua Welter is 46th of 60, where MileSplit Live gave 59th of 109, a list that runs varsity and JV together. This applies to Junction City, Rock Creek, Clay Center, Council Grove, Flint Hills Christian and St. Xavier.
      - **Abilene Invitational** (dated 9/5 on the page under a leftover Manhattan header; its runners and times are MileSplit Live's September 3 meet, e.g. Chapman's Liberty Cuevas 20:34.8 / 20:34.75). Middle schools gain their grade races with team places: Rock Creek MS adds its 8th grade, Wamego MS 8th Boys 1st of 2, and Abilene MS's places are within its grade race (3rd of 50, where MileSplit Live gave 38th of 77, a list that runs the grades together). The high schools are unchanged. LetsGoRun names the varsity races "High School Boys/Girls", which the high school reader does not take, so they keep MileSplit Live.
      - **Fix found by the comparison:** the first preview gave Rock Creek MS and Abilene MS the high school's places (the races have no "varsity" in their names). Middle school cross country now also leaves out races named "High School" (`MS_XC_EXCLUDE`; Anthony and Eisenhower's own exclusion too).
    - **Shufelberger TopCity Classic** (9/19): found by the survey's new LetsGoRun step (Clay County rerun, November 5) and added. `diff:feeds`: Junction City gains Girls 10th of 10 · Boys 10th of 12; nothing else changed.
    - **Folder check** (`meetProFolderFits`, November 5): a folder filed by day must share a word with the schedule's name, its alias, its venue (Bound's address) or its host, compared with the folder's name, title and place block. It corrected one production card: Junction City's Greg Wilson Classic (Sep 5, at Johnson County Community College) had shown LetsGoRun's Manhattan XC Invitational places (Boys 6th of 11), the same day's meet where a Junction City squad also ran. It now reads "No results posted": MileSplit Live lists Junction City in the Greg Wilson meet (737908) but has no entry for it. **Open:** the Manhattan squad has no card of its own, because Bound lists only Greg Wilson that day.
    - **Compared and left out:**
      - Shawnee Heights MS (9/22): its "Eisenhower" is Topeka's Eisenhower Middle School, but it matched Manhattan's Eisenhower MS, which ran at Clay Center that day.
      - Washburn Rural MS (9/25): no school in the app.
      - The first preview stored that wrong Eisenhower final in the preview's own stored finals, which production never reads.
    - Not on LetsGoRun: Beloit, Burton, Concordia, Sabetha, Horton, Republic County, Marysville, the TVL meet and the 4A West Sub-State (no 2026 folder under any name tried).
  - **Fixed:** the NCKL Championships (October 15, Abilene). Bound names the meet for its course ("Great Life Golf Course meet"), so the alias table now maps that name to MileSplit Live's. This fills Abilene, Chapman, Clay Center and Marysville, and also Wamego and Rock Creek, which were already in production.
  - **Not published:** the team is in no MileSplit Live meet that day and no LetsGoRun folder has the meet:
    - the 4A West Sub-State (October 24: Abilene, Chapman, Clay Center);
    - Beloit (Oct 1), Burton (Oct 15), the Mission Valley Invitational (Sep 3), WCHS (Sep 10), the Wamego XC Invitational as Bound names it (Sep 11: Solomon, Valley Heights, Frankfort), and Silver Lake, Royal Valley, Karr Classic, Concordia, Sabetha, Horton, Republic County and the Marysville meets;
    - the TVL meet (Oct 15) and the Wabaunsee Invite (Sep 19).
  - **Open:** Wabaunsee at the Riley County Invitational (October 10). MileSplit Live lists Wabaunsee (team code 17) in meet 780908, but no varsity result for it is read. Riley County's own card from the same meet reads. Council Grove's Bound entry for September 10 is the Hesston Invitational, while MileSplit Live has Council Grove at the Lyndon XC Invitational that day. Neither was changed this session.
- **Scheduled refresh:** the Cron Trigger rebuilds 8 middle and high school feeds every 10 minutes. With these schools there are 310 feeds (183 before, 127 added), so each one is rebuilt about every 6.5 hours, up from about 4. Visitors still build feeds as before.
