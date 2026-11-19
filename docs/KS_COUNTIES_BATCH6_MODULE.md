# Miami, Linn, Allen, Woodson, Doniphan, Barton, Mitchell and Lincoln counties, Kansas

User, November 19, 2026: "Fix royals first then county adding" (after "What should we do next?", where the recommendation was the Royals fix and then a county batch of the agent's choosing, `AGENTS.md` 5c). The eight counties border counties already in the app: Miami, Linn, Allen and Woodson south of Franklin, Anderson and Coffey; Doniphan beside Atchison and Brown; Barton beside Rice and Ellsworth; Mitchell and Lincoln beside Cloud, Ottawa and Ellsworth. Left for later: Leavenworth, Butler, Reno and Jewell, plus the metro counties Johnson, Wyandotte and Sedgwick, which each need a session of their own.

Every school is a data entry (`src/schools/data/ks-<county>.json`), built and registered with `npm run add:county` from one multi-county survey (`npm run onboard:hs -- --county=Miami,Linn,Allen,Woodson,Doniphan,Barton,Mitchell,Lincoln --out-dir=…`, about 55 minutes). Linn, Woodson, Doniphan and Mitchell were surveyed again afterwards, because MaxPreps had refused a burst of reads (HTTP 403) the first time. The rules are `AGENTS.md` 5c, and every school behaves as `docs/HIGH_SCHOOL_REFERENCE.md` describes.

## Schools added (35)

| County | High schools | Middle schools |
| --- | --- | --- |
| Miami | Louisburg (4A), Osawatomie\*, Paola (4A), Spring Hill (5A) | Louisburg MS, Paola MS, Spring Hill MS |
| Linn | Jayhawk-Linn (Mound City)\*, Pleasanton\*, Prairie View (La Cygne) | Pleasanton JH |
| Allen | Humboldt, Iola\*, Marmaton Valley (Moran)\* | Marmaton Valley JH |
| Woodson | Yates Center\* | — |
| Doniphan | Doniphan West (Highland)\*, Riverside (Wathena), Troy\* | Doniphan West JH, Riverside MS, Troy MS |
| Barton | Central Plains (Claflin)\*, Ellinwood\*, Great Bend (5A), Hoisington | Central Plains MS, Ellinwood MS, Great Bend MS, Hoisington MS |
| Mitchell | Beloit, Beloit St. John's\* | Beloit JH |
| Lincoln | Lincoln\*, Sylvan-Lucas Unified (Sylvan Grove)\* | — |

\* **Few of its own games on Bound** (under 85% of MaxPreps' schedule). These schools also read MaxPreps' schedule (`sports.maxprepsSchedule`).
- **Football, Bound games against MaxPreps':** Osawatomie 4 of 9, Jayhawk-Linn 2 of 9, Pleasanton 4 of 9, Iola 2 of 9, Doniphan West 2 of 9, Troy 8 of 10, Central Plains 1 of 10, Ellinwood 6 of 9.
- **Volleyball:** Marmaton Valley 1 of 12, Yates Center 1 of 15, Lincoln 2 of 15.
- Sylvan-Lucas and Beloit St. John's were set by hand (below).

Middle schools that share their high school's Bound id read it at their grade levels, as Marysville JH does: Pleasanton, Marmaton Valley, Central Plains, Ellinwood and Beloit.

## Fixed by hand

- **Prairie View:** the survey found no MaxPreps page, because its guesses used the town as `lacygne`. The page is `la-cygne/prairie-view-buffalos` (school id `9996e546-…`, 35 of the page's school ids).
- **Sylvan-Lucas Unified:** Bound has only spring sports, cross country and wrestling. MaxPreps has football, volleyball and basketball teams, so those three were added and read MaxPreps' schedule. Soccer, which also appears among MaxPreps' links, was left out.
- **Beloit St. John's:** its football and volleyball teams play with Tipton Catholic as "St. John's-Tipton Catholic" (MaxPreps `beloit/st-johns-tipton-catholic-blujays`) and are not on Bound. Both were added and read MaxPreps' schedule.

## Results sources

- **Prep.Golf codes** (from the survey): Louisburg LOU, Osawatomie OSW, Paola PAO, Spring Hill SHL, Jayhawk-Linn JL, Pleasanton PLS, Humboldt HMB, Iola IOLA, Ellinwood EWD, Great Bend GB, Hoisington HOIS, Beloit BT. Prairie View's code was not found (`"?"`), so its golf cards show the team's place without its individual golfers.
- **TennisReporting:** Paola HS, Spring Hill HS, Iola HS, Central Plains HS, Ellinwood HS, Great Bend HS, Hoisington HS, Beloit HS.
- **MileSplit Live team ids:** every high school that runs, and the middle schools that do (Louisburg, Paola, Spring Hill, Riverside, Central Plains, Ellinwood, Great Bend, Hoisington, Beloit).
- **LetsGoRun:** none of the eight counties' schools ran a 2026 LetsGoRun meet.
- **KSHSAA regionals and state:** read from the MileSplit Live index, as for the earlier counties.

## Skipped

| School | County | Why |
| --- | --- | --- |
| Osawatomie MS, Paola Holy Trinity Catholic, Spring Hill Forest Spring MS | Miami | Not on Bound |
| Jayhawk-Linn JH, Prairie View MS | Linn | Not on Bound |
| Humboldt MS, Iola MS | Allen | Not on Bound (MileSplit Live has Iola MS runners, 5 meets) |
| Yates Center MS | Woodson | Not on Bound |
| Ellinwood St. Joseph Catholic | Barton | Not on Bound |
| Tipton Catholic HS | Mitchell | Bound lists only cross country and track (MileSplit 21965, 4 meets), and it has no MaxPreps page of its own: its team sports are the St. John's-Tipton co-op, which is listed under Beloit St. John's |
| Beloit St. John's Elementary, Tipton JH | Mitchell | Share their high school's Bound id, with no middle school events |
| Lincoln JH | Lincoln | Not on Bound (MileSplit Live has its runners, 2 meets) |

These need readers of their own, which is a later session's work (`AGENTS.md` 5c).

## Cross country meets with no results source (checked November 19)

For these meets on their day, the survey's results-sources table found no MileSplit Live or LetsGoRun results. They are **not published** on the sources the app may read (Athletic.net disallows the app):

- **Miami and Linn:** Prairie View (Sep 24), Perry-Lecompton (Oct 2), KC Metro Classic (Oct 3), Louisburg (Oct 8), Frontier League (Oct 15), the Spring Hill MS duals (Sep 10), Eudora MS (Oct 8), Tonganoxie MS (Sep 23), Basehor-Linwood MS (Sep 30).
- **Allen and Woodson:** Missouri Southern Stampede (Sep 19), Cross Country at Central Heights (Sep 30), TVL (Oct 15).
- **Doniphan:** Jackson Heights (Sep 14), Hiawatha (Sep 17), Nemaha Central (Sep 24), Horton (Oct 1), Centralia (Oct 3), Sabetha (Oct 8), the NEKL middle school (Oct 5) and high school (Oct 15) championships, Lyle Alley at Jackson Heights (Oct 20).
- **Barton:** Great Bend MS (Sep 3), Hesston (Sep 10), Buhler (Sep 17), Wild Wind at Trinity Academy (Sep 26), Pratt (Oct 1), Rush at Brownthrush (Oct 3), Sterling (Oct 8).
- **Mitchell and Lincoln:** Concordia (Sep 3), Marysville (Sep 5), WCHS (Sep 10), Smith Center (Sep 17), Republic County (Sep 24), Beloit (Oct 1), the NCAA junior league (Oct 13).
- **Meets Bound names only "Event"** (Sep 17, Sep 22, Oct 6): Bound gives no name or host, so they cannot be matched to a results page.
