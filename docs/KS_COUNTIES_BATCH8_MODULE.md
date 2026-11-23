# Crawford, Cherokee, Labette, Montgomery, Chautauqua, Ellis, Rooks and Phillips counties, Kansas

User, November 22, 2026: "Let's add more counties", following the seventh batch (`KS_COUNTIES_BATCH7_MODULE.md`). The eight counties border counties already in the app:
- Crawford, Cherokee, Labette, Montgomery and Chautauqua, south of Bourbon, Neosho, Wilson and Elk (the state's southeast corner);
- Ellis, Rooks and Phillips, beside Russell, Osborne and Smith.

Left for later: Reno, Butler and Cowley, plus the metro counties Johnson, Wyandotte and Sedgwick, which each need a session of their own.

Every school is a data entry (`src/schools/data/ks-<county>.json`), built and registered with `npm run add:county` from one multi-county survey (`npm run onboard:hs -- --county=Crawford,Cherokee,Labette,Montgomery,Chautauqua,Ellis,Rooks,Phillips --out-dir=…`, about 95 minutes). The rules are `AGENTS.md` 5c, and every school behaves as `docs/HIGH_SCHOOL_REFERENCE.md` describes.

## Schools added (40)

| County | High schools | Middle schools |
| --- | --- | --- |
| Crawford | Arma Northeast\*, Cherokee Southeast\*, Frontenac\*, Girard\*, Pittsburg (5A)\*, St. Mary's Colgan (Pittsburg)\* | Frontenac JH, Girard MS, Pittsburg St. Mary's JH |
| Cherokee | Baxter Springs, Columbus, Galena\*, Riverton | Columbus JH, Galena MS |
| Labette | Chetopa\*, Labette County (Altamont)\*, Oswego\*, Parsons\* | — |
| Montgomery | Caney Valley\*, Cherryvale\*, Field Kindley (Coffeyville)\*, Independence\* | Caney Valley JH, Cherryvale MS |
| Chautauqua | Cedar Vale\*, Sedan\* | — |
| Ellis | Ellis\*, Hays (5A)\*, Thomas More Prep-Marian (Hays)\*, Victoria\* | Ellis JH, Hays MS, Thomas More Prep-Marian JH, Victoria JH |
| Rooks | Palco\*, Plainville\*, Stockton\* | — |
| Phillips | Logan\*, Phillipsburg\* | — |

\* **Few of its own games on Bound** (under 85% of MaxPreps' schedule). These schools also read MaxPreps' schedule (`sports.maxprepsSchedule`).
- **Football, Bound games against MaxPreps':** Arma Northeast 1 of 9, Cherokee Southeast 1 of 10, Frontenac 5 of 12, Girard 3 of 9, Pittsburg 6 of 9, St. Mary's Colgan 2 of 10, Galena 4 of 9, Labette County 3 of 9, Parsons 2 of 9, Caney Valley 4 of 12, Cherryvale 3 of 9, Field Kindley 3 of 9, Independence 5 of 9, Hays 9 of 11, Thomas More Prep-Marian 5 of 11, Plainville 3 of 10, Phillipsburg 4 of 9.
- **Volleyball:** Chetopa 5 of 13, Oswego 4 of 16, Ellis 1 of 13, Victoria 3 of 14.
- **Full on Bound:** Baxter Springs 10 of 9, Columbus 10 of 10, Riverton 10 of 9 football games.
- Cedar Vale, Sedan, Logan, Palco and Stockton were set by hand (below).

Middle schools that share their high school's Bound id read it at their grade levels, as Marysville JH does (Columbus, Galena, Caney Valley, Cherryvale, Ellis, Victoria and the others).

## Fixed by hand

- **Cedar Vale:** the survey's MaxPreps guess (`cedar-vale-mustangs`) missed. MaxPreps lists the Cedar Vale/Dexter co-op, `cedar-vale/cedar-vale-dexter-spartans` (school id `6bf705c1-…`), found through Sedan's schedule links. Bound has only basketball, softball and track; Football and Volleyball were added and read MaxPreps' schedule.
- **Sedan:** the guesses (`sedan-blue-devils`) missed; the page is `sedan/sedan-devils` (`7d5c142c-…`), found through West Elk's basketball schedule. MaxPreps had 9 football and 36 volleyball games, Bound none; Football and Volleyball were added and read MaxPreps' schedule. Cross Country was added for its MileSplit Live team (26451, 7 meets), read from the statewide index.
- **Logan:** Bound has only track. Football, Volleyball and Basketball were added from MaxPreps' schedule.
- **Palco:** Bound has no events for it. Football, Volleyball, Basketball (MaxPreps' schedule) and Cross Country (MileSplit Live team 21986, 7 meets) were added.
- **Stockton:** Bound has cross country and wrestling only. Football, Volleyball and Basketball were added from MaxPreps' schedule.
- **Columbus JH:** the survey listed Golf from Bound, which has no junior high golf in Kansas; it was taken out.
- **Names:** KSHSAA's "Pittsburg-St. Mary's Elementary School" is Pittsburg St. Mary's Junior High (Bound: St. Mary's Colgan), and "Victoria Elementary School" is Victoria Junior High: they field the junior high teams.

## Results sources

- **Prep.Golf codes:** Frontenac FRON, Girard GIR, Pittsburg PITT, St. Mary's Colgan SMC, Baxter Springs BXS, Columbus COL, Riverton RIV, Oswego OWG, Parsons PSN, Caney Valley CV, Independence INDE, Sedan SDN, Ellis EL, Hays HAYS, Plainville PL. No code found for Galena (no posted tournaments) or Labette County (4 tournaments, no shared code), so their golf cards show the team's place without its golfers. Field Kindley, Thomas More Prep-Marian and the smaller schools have no Prep.Golf school.
- **TennisReporting:** Pittsburg HS, Labette County HS, Parsons HS, Field Kindley HS, Independence HS, Hays HS, Victoria HS, Phillipsburg HS.
- **MileSplit Live team ids:** every high school that runs, and the middle schools Frontenac (47761), Girard (39966), Pittsburg St. Mary's (47760), Caney Valley (37859), Ellis (32805, "Washington Ellis Middle School", Mid-Continent League meets), Hays (32824) and Thomas More Prep-Marian (32828).
- **Not published on the sources the app may read:** Cherryvale HS and MS and Columbus JH cross country (no MileSplit Live team in the 2026 Kansas index, checked November 22; Athletic.net disallows the app).
- **LetsGoRun:** none of the eight counties' schools ran a 2026 LetsGoRun meet.
- **KSHSAA regionals and state:** from the MileSplit Live index, as for the earlier counties.

## Skipped

| School | County | Why |
| --- | --- | --- |
| Pittsburg MS, Northeast (Arma) JH, Southeast (Cherokee) MS | Crawford | Not on Bound (MileSplit Live has Pittsburg MS and Northeast JH runners); a reader of their own is needed |
| Baxter Springs MS, Riverton MS | Cherokee | Not on Bound |
| Parsons MS, Labette County JH and the county's grade schools | Labette | Not on Bound (MileSplit Live has Parsons MS and Labette County JH runners) |
| Chetopa JH, Oswego JH | Labette | Share their high school's Bound id, with no middle school events |
| Coffeyville Roosevelt MS, Independence MS, St. Andrew's, Zion Lutheran | Montgomery | Not on Bound |
| Caney Valley Charter Academy | Montgomery | Not on Bound |
| Cedar Vale MS | Chautauqua | Shares Cedar Vale's Bound id, with no middle school events |
| Sedan JH | Chautauqua | Bound has only a spring track entry; nothing to show until the spring |
| Palco JH, Plainville JH | Rooks | Share their high school's Bound id, with no middle school events |
| Stockton JH | Rooks | Not on Bound (MileSplit Live team 32817) |
| Logan JH | Phillips | Shares Logan's Bound id, with no middle school events |
| Phillipsburg MS, Long Island and Northern Valley JH | Phillips | Not on Bound |
| St. Hospital Training Center (Parsons) | Labette | Not on Bound |

## Cross country meets with no results source (checked November 22)

About 30 meets across the eight counties had no MileSplit Live or LetsGoRun results on their day (Cherokee County's 14 the most, mostly small meets the host school times itself). They are **not published** on the sources the app may read (Athletic.net disallows the app), and read "No results posted". The per-county lists are in the survey reports; a later session can repeat the survey (`onboard:hs`) to list them again.
