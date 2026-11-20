# Leavenworth, Bourbon, Neosho, Wilson, Elk, Russell, Osborne, Smith and Jewell counties, Kansas

User, November 20, 2026: "Start the next counties", following the sixth batch (`KS_COUNTIES_BATCH6_MODULE.md`). The nine counties border counties already in the app:
- Leavenworth, beside Atchison, Jefferson and Douglas;
- Bourbon, Neosho, Wilson and Elk, south of Linn, Allen, Woodson and Greenwood;
- Russell, Osborne, Smith and Jewell, beside Ellsworth, Lincoln, Mitchell and Republic.

Left for later: Reno and Butler, plus the metro counties Johnson, Wyandotte and Sedgwick, which each need a session of their own.

Every school is a data entry (`src/schools/data/ks-<county>.json`), built and registered with `npm run add:county` from one multi-county survey (`npm run onboard:hs -- --county=Leavenworth,Bourbon,Neosho,Wilson,Elk,Russell,Osborne,Smith,Jewell --out-dir=…`, about 50 minutes). The rules are `AGENTS.md` 5c, and every school behaves as `docs/HIGH_SCHOOL_REFERENCE.md` describes.

## Schools added (33)

| County | High schools | Middle schools |
| --- | --- | --- |
| Leavenworth | Basehor-Linwood (5A), Bonner Springs (5A), Lansing (5A), Leavenworth (5A), Pleasant Ridge (Easton)\*, Tonganoxie (4A) | Basehor-Linwood MS, Robert E. Clark MS (Bonner Springs), Patton JH (Fort Leavenworth), Richard Warren MS (Leavenworth), Xavier Catholic School (Leavenworth), Tonganoxie MS |
| Bourbon | Fort Scott\*, Uniontown\* | Uniontown JH |
| Neosho | Chanute\*, Erie\*, St. Paul\* | — |
| Wilson | Fredonia\*, Neodesha | Fredonia JH, Neodesha JH |
| Elk | Elk Valley (Longton)\*, West Elk (Howard)\* | — |
| Russell | Russell\* | Russell JH |
| Osborne | Lakeside (Downs)\*, Natoma\*, Osborne\* | — |
| Smith | Smith Center\*, Thunder Ridge (Kensington)\* | Smith Center JH |
| Jewell | Rock Hills (Mankato)\* | — |

\* **Few of its own games on Bound** (under 85% of MaxPreps' schedule). These schools also read MaxPreps' schedule (`sports.maxprepsSchedule`).
- **Football, Bound games against MaxPreps':** Pleasant Ridge 3 of 9, Fort Scott 4 of 9, Uniontown 1 of 9, Chanute 3 of 9, Russell 4 of 9, Smith Center 5 of 11, Rock Hills 1 of 9.
- **Volleyball:** Erie 3 of 13, St. Paul 2 of 15, West Elk 3 of 14, Lakeside 1 of 13, Thunder Ridge 1 of 14.
- Fredonia, Elk Valley, Natoma and Osborne were set by hand (below).

Middle schools that share their high school's Bound id read it at their grade levels, as Marysville JH does: Uniontown, Fredonia, Neodesha, Russell and Smith Center.

## Fixed by hand

- **Fredonia and Neodesha:** the survey's MaxPreps guesses missed them. The pages are `fredonia/fredonia-yellowjackets` (school id `28ad2521-…`) and `neodesha/neodesha-blue-streaks` (`76226870-…`).
  - Fredonia has no football on Bound, so its Football reads MaxPreps' schedule.
  - Neodesha's football is on Bound.
- **Elk Valley:** Bound has only track and wrestling. MaxPreps has football, volleyball and basketball, which were added and read MaxPreps' schedule.
- **Natoma:** Bound has no events for it at all. MaxPreps has football, volleyball and basketball, which were added and read MaxPreps' schedule.
- **Osborne:** Bound has no football or volleyball. Both were added from MaxPreps' schedule.
- **Names:** `add:county` wrote these from KSHSAA's names; the old forms stay as aliases.
  - "Leavenworth Xavier Catholic School Middle School" is now Xavier Catholic School.
  - "Fort Leavenworth-Patton Junior High" is now Patton Junior High.
  - "Bonner Springs-Robert E Clark Middle School" is now Robert E. Clark Middle School.
  - Thunder Ridge's town "KENSINGTON" is now Kensington.
- **Bonner Springs** is listed under Leavenworth County because NCES places it there.
- **Lansing and Bonner Springs** play 4A football (KSHSAA's 2026 bracket lists "Lansing HS" in 4A) while their general class is 5A.

## Results sources

- **Prep.Golf codes:** Bonner Springs BSP, Lansing LSG, Leavenworth LV, Tonganoxie TNG, Fort Scott FTS, Uniontown UN, Chanute CHAN, Erie ERIE, Fredonia FRE, Neodesha ND, Russell RS, Osborne OSB, Smith Center SC. No code found for Basehor-Linwood, so its golf cards show the team's place without its golfers.
- **TennisReporting:** Basehor-Linwood HS, Bonner Springs HS, Lansing HS, Leavenworth HS, Fort Scott HS, Chanute HS, Neodesha HS, Osborne HS.
- **MileSplit Live team ids:** every high school that runs, except St. Paul and Elk Valley (no cross country), and the middle schools Basehor-Linwood, Robert E. Clark, Patton, Fredonia, Russell and Smith Center.
- **LetsGoRun:** none of the nine counties' schools ran a 2026 LetsGoRun meet.
- **KSHSAA regionals and state:** from the MileSplit Live index, as for the earlier counties.

## Skipped

| School | County | Why |
| --- | --- | --- |
| Lansing MS, Pleasant Ridge MS (Easton) | Leavenworth | Not on Bound (MileSplit Live has their runners) |
| "Lansing High 9-12", "Lansing Middle 6-8" | Leavenworth | NCES duplicates of Lansing HS and Lansing MS |
| Fort Scott MS | Bourbon | Not on Bound (MileSplit Live has its runners, 5 meets) |
| St. Paul JH | Neosho | Shares St. Paul's Bound id, with no middle school events |
| Chanute Royster MS, Galesburg MS, Thayer MS | Neosho | Not on Bound |
| Altoona-Midway HS and MS (Buffalo) | Wilson | Not on Bound; needs a reader of its own |
| West Elk JH, Elk Valley MS | Elk | Not on Bound |
| Ruppenthal MS (Russell) | Russell | Not on Bound (Russell JH is on Bound and added) |
| Lakeside, Natoma and Osborne middle schools | Osborne | Share their high school's Bound id, with no middle school events |
| Rock Hills JH | Jewell | Shares Rock Hills' Bound id, with no middle school events |

## Cross country meets with no results source (checked November 20)

For 33 meets across the nine counties, the survey's results-sources table found no MileSplit Live or LetsGoRun results on their day: mostly small meets that the host school times itself. They are **not published** on the sources the app may read (Athletic.net disallows the app). The per-county lists are in the survey reports. A later session can repeat the survey (`onboard:hs`) to list them again, since the reports were kept only in that session's scratchpad.
