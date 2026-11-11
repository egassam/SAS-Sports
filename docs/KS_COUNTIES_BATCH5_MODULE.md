# Atchison, Brown, Coffey, Anderson, Greenwood, Harvey, Rice and Ellsworth counties, Kansas

User, November 10, 2026: "Add more counties" (after "What's next?", where the recommendation was more counties of the agent's choosing, `AGENTS.md` 5c). The eight were chosen next to counties already in the app, leaving out the metro counties (Johnson, Wyandotte, Sedgwick, Leavenworth) for a session of their own.

Every school is a data entry (`src/schools/data/ks-<county>.json`), built and registered with `npm run add:county` from one multi-county survey (`npm run onboard:hs -- --county=Atchison,Brown,Coffey,Anderson,Greenwood,Harvey,Rice,Ellsworth --out-dir=…`, about 55 minutes). The rules are `AGENTS.md` 5c; every school behaves as `docs/HIGH_SCHOOL_REFERENCE.md` describes.

## Schools added (29)

| County | High schools | Middle schools |
| --- | --- | --- |
| Atchison | Atchison County Community (Effingham)\*, Atchison (4A), Maur Hill-Mount Academy | St. Benedict Catholic School |
| Brown | Hiawatha\*, Horton\* | Everest MS |
| Coffey | Burlington\*, Lebo\*, Southern Coffey County (LeRoy)\*, Waverly\* | — |
| Anderson | Anderson County (Garnett)\*, Crest (Colony)\* | — |
| Greenwood | Eureka\*, Madison\* | — |
| Harvey | Burrton\*, Halstead, Hesston, Newton (5A), Sedgwick\* | Newton Chisholm MS |
| Rice | Chase\*, Little River\*, Lyons, Sterling\* | Little River JH, Sterling JH |
| Ellsworth | Ellsworth | Ellsworth JH |

\* **Few of its own games on Bound** (under 85% of MaxPreps' schedule): these schools also read MaxPreps' schedule (`sports.maxprepsSchedule`). Football games on Bound against MaxPreps: Atchison County Community 4 of 9, Hiawatha 6 of 9, Horton 6 of 9, Burlington 5 of 10, Lebo 1 of 11, Waverly 1 of 9, Anderson County 5 of 9, Eureka 2 of 9, Sedgwick 4 of 9, Little River 1 of 11, Sterling 3 of 11; volleyball: Southern Coffey County 1 of 14, Crest 1 of 15, Madison 1 of 12, Chase 1 of 16. Burrton was set by hand: 2 Bound volleyball matches, no Bound basketball, and too few MaxPreps volleyball games this season (under 4) for the survey to compare.

Middle schools that share their high school's Bound id (Little River, Sterling, Ellsworth) read it at their grade levels, as Marysville JH does.

## Fixed by hand

- **Maur Hill-Mount Academy:** the survey found no MaxPreps page (the guesses use Bound's mascot); it is `atchison/maur-hill-prep-mount-academy-ravens` (school id `a6e57c3e-…`, 30 of the page's school ids). Bound has all 9 of its MaxPreps football games, so it reads Bound's schedule.
- **Burrton:** Bound has only volleyball, cross country and track this year (2 volleyball matches); MaxPreps has volleyball, boys' and girls' basketball and wrestling teams. It reads MaxPreps' schedule, with Basketball and Wrestling added.
- **Southern Coffey County:** Bound's girls' swimming entries are last year's only (2); swimming is left out.
- **St. Benedict Catholic School** (Atchison): `add:county` wrote "Atchison St. Benedict Catholic School Middle School"; the name is KSHSAA's without the town, with the old forms as aliases.
- **Hamilton JH (Greenwood County):** the survey matched Bound's "Hamilton MS", which is **Wichita's** Hamilton Middle School (town Wichita; its meets are Wichita's All City and Westside meets). Left out. `scripts/onboard-hs.mjs` now takes a same-named Bound school from another town only when that town is one of the county's (`matchSchools` `towns`; `tests/onboard-hs.mjs`).

## Results sources

- **Prep.Golf codes** (from the survey): Atchison ATCH, Hiawatha HIAW, Horton HRT, Burlington BURL, Anderson County AC, Eureka EUR, Halstead HAL, Hesston HST, Newton NEW, Sedgwick SG, Lyons LYNS, Sterling STG, Ellsworth EW.
- **TennisReporting:** Hesston HS, Newton HS, Lyons HS, Sterling HS, Ellsworth HS.
- **MileSplit Live team ids** for every high school with cross country except Southern Coffey County and Little River (none in the index), and for the middle schools that run (Newton Chisholm, Sterling, Ellsworth).
- **LetsGoRun:** none of the eight counties' schools ran a 2026 LetsGoRun meet the app does not read already.
- **KSHSAA regionals and state:** read from the MileSplit Live index (Regionals 788038, 788042, 788043, 788044; state 787763).

## Skipped

| School | County | Why |
| --- | --- | --- |
| Central School, Atchison Co Community MS, Atchison MS | Atchison | Not on Bound |
| Hiawatha MS | Brown | Not on Bound (MileSplit Live has its runners, 1 meet) |
| Burlington MS | Coffey | Not on Bound |
| Lebo JH, Waverly JH | Coffey | Share the high school's Bound id with no middle school events |
| Southern Coffey County MS | Coffey | One boys' and one girls' basketball event on Bound |
| Anderson County JH, Garnett-St. Rose, Westphalia | Anderson | Not on Bound |
| Crest MS | Anderson | No middle school events on Bound |
| Hamilton HS and JH, Madison JH | Greenwood | Not on Bound (Hamilton: see above); need a reader of their own |
| Eureka JH | Greenwood | Two or three Bound events per sport |
| Halstead MS, Hesston MS, Sedgwick JH, Opportunity Academy | Harvey | Not on Bound |
| Burrton MS | Harvey | One to three Bound cross country and track events |
| Chase-Raymond JH | Rice | Two basketball and one cross country event on Bound |
| Lyons MS | Rice | Not on Bound (MileSplit Live has its runners, 5 meets) |

## Cross country meets with no results source (checked November 10)

The survey's results-sources table found no MileSplit Live or LetsGoRun results for these meets on their day. They are **not published** on the sources the app may read (Athletic.net disallows the app):
- **Atchison County:** Bobcat Invitational (Sep 3), Silver Lake (Sep 5), Hiawatha (Sep 17), Royal Valley (Sep 22), Nemaha Central (Sep 24), Horton (Oct 1), Sabetha (Oct 8), Pleasant Ridge at St. Mary's (Oct 10), NEKL (Oct 15), Lyle Alley at Jackson Heights (Oct 20).
- **Brown County:** Marysville (Sep 5), Jackson Heights (Sep 14), a Sep 17 meet Bound names "Event", Horton (Oct 1), NEKL middle school (Oct 5), Big East League (Oct 15), Lyle Alley (Oct 20).
- **Coffey and Anderson counties:** Karr Classic at The Orchard (Sep 17), Tonganoxie (Sep 19), Perry-Lecompton (Oct 2), Louisburg (Oct 8).
- **Greenwood County:** Clearwater (Sep 3), Karr Classic (Sep 17), Oxford (Sep 24), Bluestem vs Eureka (Oct 6), TVL (Oct 15).
- **Harvey, Rice and Ellsworth counties:** Valley Center (Sep 8, Oct 2), Ellsworth JH meet (Sep 8), Hesston (Sep 10), Herington (Sep 17), Berean Academy (Oct 1), Goessel (Oct 8; MileSplit Live 781656 has it for the schools whose runners are in it), Sterling (Oct 8), WSL/HOPL (Oct 13), NCAA junior high league (Oct 13).
- **Halstead's "State Cross Country" (Oct 31):** Halstead's runners are not in the 3A state results (787763, where Hesston and Ellsworth are): a state meet the team did not qualify for is not listed (5c).

## Changes to schools already in the app

None from the counties (new schools only). The survey fix (`matchSchools` towns) changes only new surveys.

## Limitations

- **Middle school game scores:** not published (5c).
- **Spring sports for schools with few Bound games** come from MaxPreps' team list. A team MaxPreps lists with no games this season answers no schedule until its season is posted.
- **Newton boys' basketball:** Bound has no boys' basketball events for Newton in either school year (girls' 24 and 23); the boys' schedule fills when Newton enters it on Bound. MaxPreps gives scores for games Bound lists.
