# Jefferson, Osage, Franklin, Marion, McPherson and Chase counties, Kansas

User, November 7, 2026: "Do the cleanup and then add counties" (after "What's next?", where the recommendation was the cleanup, then the next counties of the agent's choosing, `AGENTS.md` 5c).

Every school is a data entry (`src/schools/data/ks-<county>.json`), built and registered with `npm run add:county` from one multi-county survey (`npm run onboard:hs -- --county=Jefferson,Osage,Franklin,Marion,McPherson,Chase --out-dir=…`, about 75 minutes, mostly KSHSAA's and MaxPreps' 30 s spacing). The rules are `AGENTS.md` 5c; every school behaves as `docs/HIGH_SCHOOL_REFERENCE.md` describes.

## Schools added (35)

| County | High schools | Middle schools |
| --- | --- | --- |
| Jefferson | Jefferson County North\*, Jefferson West, McLouth\*, Oskaloosa, Perry-Lecompton, Valley Falls\* | McLouth MS, Oskaloosa JH |
| Osage | Burlingame\*, Lyndon\*, Osage City\*, Santa Fe Trail | — |
| Franklin | Central Heights\*, Ottawa (4A), Wellsville, West Franklin\* | Ottawa MS, Wellsville MS |
| Marion | Centre\*, Goessel, Hillsboro, Marion\*, Peabody-Burns\* | Centre JH, Goessel JH, Hillsboro MS, Peabody-Burns JH |
| McPherson | Canton-Galva\*, Inman\*, McPherson (4A), Moundridge\*, Smoky Valley | Canton-Galva MS, Smoky Valley MS |
| Chase | Chase County\* | — |

\* **Few of its own games on Bound** (under 85% of MaxPreps' schedule): these schools also read MaxPreps' schedule (`sports.maxprepsSchedule`). Football games on Bound against MaxPreps: Jefferson County North 3 of 10, McLouth 4 of 10, Valley Falls 2 of 9, Burlingame 2 of 8, Lyndon 1 of 8, Osage City 6 of 10, Central Heights 1 of 9, West Franklin 4 of 9, Marion 5 of 9, Canton-Galva 3 of 10, Inman 2 of 10, Moundridge 4 of 10, Chase County 1 of 10; volleyball: Centre 9 of 15, Peabody-Burns 7 of 14.

Middle schools that share their high school's Bound id (McLouth, Oskaloosa, Wellsville, Centre, Goessel, Hillsboro, Peabody-Burns, Canton-Galva) read it at their grade levels, as Marysville JH does.

## Results sources

- **Prep.Golf codes:** Jefferson West MJW (Meriden Jefferson West; looked up by hand, 5 of its 6 varsity tournaments), Oskaloosa OSK, Perry-Lecompton PLHS (by hand, 6 of 6), Lyndon LYN, Osage City OSC, Santa Fe Trail SFT, Ottawa OTT, Wellsville WLV, West Franklin WF (by hand), Goessel GS, Hillsboro HSB, Marion MRN, Canton-Galva CGAL, Inman INM, McPherson MP. The survey's code finder needs the code's letters in the name in order; MJW and PLHS carry letters the names lack, and WF's school had two varsity tournaments.
- **Smoky Valley golf:** Prep.Golf has the school (105) with no tournaments posted: its golf reads "No results posted" (not published).
- **TennisReporting:** Perry-Lecompton HS, Ottawa HS, Hillsboro HS, McPherson HS, Smoky Valley HS.
- **MileSplit Live team ids** for every high school with cross country except Peabody-Burns (none in the index), and for every middle school with cross country.
- **LetsGoRun:** none of the six counties' schools ran a 2026 LetsGoRun meet the app does not read already.
- **KSHSAA state and sub-state cross country:** read from the MileSplit Live index on the day of the Bound entry, as for Emporia and Concordia.

## Skipped

| School | County | Why |
| --- | --- | --- |
| Marais des Cygnes Valley HS and MS | Osage | No Bound events (MaxPreps only): needs a reader of its own |
| Lyndon MS | Osage | One volleyball and one cross country event on Bound |
| Burlingame MS, Carbondale Attendance Center, Santa Fe Trail MS, Osage City MS | Osage | Not on Bound |
| Central Heights MS | Franklin | Two boys' and one girls' basketball events on Bound |
| West Franklin MS | Franklin | Not on Bound |
| Jefferson West MS, Nortonville-Jefferson County North MS, Perry-Lecompton MS, Valley Falls MS | Jefferson | Not on Bound |
| Marion MS | Marion | Not on Bound (MileSplit Live has its runners, 7 meets) |
| Elyria Christian | McPherson | On Bound, but MaxPreps has no school page found: every high school reads MaxPreps teams |
| Inman MS | McPherson | One or two Bound events per sport |
| McPherson MS, Moundridge MS | McPherson | Not on Bound |
| Chase County JH | Chase | Cross country only, three Bound entries |

## Cross country meets with no results source (checked November 7)

The survey's results-sources table found no MileSplit Live or LetsGoRun results for these meets on their day. They are **not published** on the sources the app may read (Athletic.net disallows the app):
- **Jefferson County:** Bobcat Invitational (Sep 3), Silver Lake (Sep 5), Topeka West (Sep 12), Jackson Heights (Sep 14), McLouth (Sep 17), Royal Valley (Sep 22), Jefferson County North (Sep 26), Horton and Perry-Lecompton (Oct 1-2), NEKL middle school (Oct 5), Sabetha (Oct 8), Pleasant Ridge (Oct 10), Big East League and NEKL (Oct 15), Lyle Alley at Jackson Heights (Oct 20).
- **Osage County:** Lyndon (Sep 10), Karr Classic at The Orchard (Sep 17), Maple Leaf XC Classic (Oct 3), and the Silver Lake and Royal Valley meets above.
- **Franklin County:** Ottawa MS duals (Sep 5, Sep 10), Basehor-Linwood MS (Sep 30), Eudora MS and Louisburg (Oct 8), Frontier and Pioneer League meets (Oct 15).
- **Marion and McPherson counties:** Hesston (Sep 10), Bennington (Sep 17), Buhler (Sep 17), Wild Wind at Trinity Academy (Sep 26), Berean Academy, Halstead (Oct 1), Sterling (Oct 8), WSL/HOPL (Oct 13), MS CKL (Oct 15), AVCTL Division 3 & 4 (Oct 19).
- **Goessel's own meet (Oct 8)** is on MileSplit Live (781656, Goessel Timing) for other schools; a school whose runners are in it gets its results through the index.
- **Postseason** (regionals Oct 24, state Oct 31): the index has the KSHSAA meets; a school listed there gets the card.

## Changes to schools already in the app

None from the counties (new schools only). The cleanup in the same PR (two capital words together read word by word; a "State University" event is not a state round) is compared with `npm run diff:feeds`; see the session log.

## Limitations

- **Middle school game scores:** not published (5c).
- **Spring sports for schools with few Bound games** come from MaxPreps' team list. A team MaxPreps lists with no games this season answers no schedule until its season is posted.
- **Santa Fe Trail's website:** KSHSAA lists it as an address (`www.198.248.92.140`); the catalog has the district's site, `usd434.org`. `add:county` now refuses an address as a website.
