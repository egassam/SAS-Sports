# Washington, Republic, Cloud, Ottawa, Jackson, Nemaha and Lyon counties, Kansas

User, November 5, 2026: "Let's add the next counties. Your choice. Learn and optimize. Make sure you think outside the box. I shouldn't have to tell you to look at let's go run out any other sites."

These are the next ring around the twelve counties already in the app. Every school is a data entry (`src/schools/data/ks-<county>.json`), built and registered with `npm run add:county` (`scripts/add-county.mjs`) from one multi-county survey (`npm run onboard:hs -- --county=Washington,Republic,Cloud,Ottawa,Jackson,Nemaha,Lyon --out-dir=…`). The rules are `AGENTS.md` 5c.

## Schools added (23)

| County | High schools | Middle schools |
| --- | --- | --- |
| Washington | Hanover\\*, Linn\\*, Washington County | — |
| Republic | Pike Valley\\*, Republic County | — |
| Cloud | Clifton-Clyde\\*, Concordia | Concordia JH |
| Ottawa | Bennington\\*, Minneapolis, Tescott\\* | Minneapolis JH |
| Jackson | Holton, Jackson Heights, Royal Valley | Jackson Heights JH |
| Nemaha | Centralia\\*, Nemaha Central\\*, Sabetha\\* | — |
| Lyon | Emporia (5A), Hartford\\*, Northern Heights\\*, Olpe\\* | — |

\\* **Few of its own games on Bound** (under 85% of MaxPreps' schedule; Hanover 2 of 10 football games, Pike Valley 2 of 14 volleyball matches, Centralia 6 of 10). These schools also read MaxPreps' schedule (`sports.maxprepsSchedule`) and take the game sports MaxPreps lists that Bound lacks:
- Tescott: football, volleyball, basketball and softball (Bound has only cross country and track);
- Pike Valley: football and softball;
- Northern Heights: baseball, basketball and softball;
- Olpe: baseball, football and softball;
- Clifton-Clyde and Hartford: softball.

**Results sources found by the survey:**
- **Prep.Golf codes** (the code that spells the school's name): HAN, LINN, WACO, PV, RPC, CLCL, CON, MNP, HOLT, RV, CEN, NMC, SB, EMP, HF, OLPE. None for Bennington, Tescott, Jackson Heights and Northern Heights, which have no golf on Bound.
- **TennisReporting:** Concordia HS, Sabetha HS, Emporia HS.
- **MileSplit Live team ids** for every high school with cross country. Linn is 21971, Linn High School; the survey first matched Jayhawk Linn, 21877, which is a different school.

## Skipped (each needs work of its own)

| School | County | Why |
| --- | --- | --- |
| Glasco, Miltonvale (Southern Cloud) | Cloud | Not on Bound |
| Hanover, Linn, Washington County, Clifton-Clyde middle schools; Hanover St. John's, Linn Lutheran | Washington | Not on Bound, or one or two Bound events |
| Pike Valley JH, Republic County MS | Republic | Pike Valley JH has one or two Bound events per sport; Republic County MS is not on Bound |
| Bennington JH, Tescott JH | Ottawa | No Bound events; Tescott JH has two cross country meets only |
| Holton MS, Royal Valley MS | Jackson | Not on Bound |
| Centralia JH, Nemaha Central MS, Sabetha MS, Sts. Peter and Paul | Nemaha | Not on Bound, or no events |
| Emporia MS | Lyon | Few game entries on Bound (2 football, 2 basketball; meets are there) |
| Hartford JH, Olpe JH, Americus/North Lyon County | Lyon | One Bound entry or none |

## Cross country results (sources checked, November 5)

The survey's results-sources table gives each school's meets this season. The timers on MileSplit Live for these counties' meets are Midwest Timing & Results, LetsGoRun Timing and Timer Guys LLC. Their own sites point to MileSplit Live, and Midwest Timing's results page lists its MileSplit meets.

**Not published:** these meets are on no source: the MileSplit Live index, LetsGoRun (listing and folders), Midwest Timing, or Bound's own entries:
- the Marysville Meet (Sep 5)
- the WCHS Invitational (Sep 10)
- the Onaga, Nemaha Central and Centralia meets
- the Concordia Invite (Sep 3)
- the Bennington meet (Sep 17)
- the Republic County meet (Sep 24)
- the Beloit meet (Oct 1)
- the TVL meet (Oct 15)

They are small meets the hosts time themselves.

**Listed but no runners posted:** Wabaunsee at the Riley County Invitational (Oct 10) and Junction City at the Greg Wilson Classic (Sep 5). MileSplit Live lists the team with zero entries.

## Changes to schools already in the app (compared with `npm run diff:feeds`)

The MileSplit Live index now also gives a meet its own card on a day the schedule already has one, when it is plainly another meet (`sameIndexMeet`). Three production feeds gained real results:
- **Junction City, Sep 5:** "Manhattan Invitational", Boys 6th of 11. This is the second squad; Bound lists only the Greg Wilson Classic that day.
- **Manhattan, Oct 10:** "Salina Invitational", Girls 1st of 13 · Boys 3rd of 13. The school calendar's entry that day is the Haskell Invite, which has no results.
- **Eisenhower MS, Sep 22:** "McPherson Middle School Invitational". The calendar says "at Clay Center", but the Clay Center meet was Sep 15; Anthony MS's calendar has McPherson that day.

The calendar entries stay as the calendars give them ("No results posted").

## Sites checked that turn the app away

Trackwrestling, FloWrestling, Athletic.net and SwimCloud disallow the app in robots.txt, and they are not read (`docs/HIGH_SCHOOL_ONBOARDING.md`). USA Bracketing allows reading: check it for wrestling before the winter season.

## Limitations

- **Spring sports for schools with few Bound games** come from MaxPreps' team list. A team MaxPreps lists with no games this season answers no schedule until its season is posted.
- **Middle school game scores:** not published (5c).
- **LetsGoRun team names:** taken from Bound ("Concordia", "Holton"); cross country reads MileSplit Live by team id.
