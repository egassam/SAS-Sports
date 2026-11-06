# Shawnee, Douglas and Saline counties, Kansas

User, November 6, 2026: "Start the next counties" (after "What's next?", where the recommendation was Shawnee, Douglas and Saline: Topeka, Lawrence and Salina).

Every school is a data entry (`src/schools/data/ks-<county>.json`), built and registered with `npm run add:county` from one multi-county survey (`npm run onboard:hs -- --county=Shawnee,Douglas,Saline --out-dir=…`). The rules are `AGENTS.md` 5c.

## Schools added (34)

| County | High schools | Middle schools |
| --- | --- | --- |
| Shawnee | Topeka (6A), Washburn Rural (6A), Highland Park, Seaman, Shawnee Heights, Topeka West (5A), Hayden\\*, Silver Lake, Rossville\\*, Cair Paravel Latin\\* | Robinson, Seaman, Shawnee Heights, Washburn Rural, Washburn Rural North, Rossville JH, Silver Lake JH |
| Douglas | Lawrence, Free State (6A), Eudora, Baldwin, Bishop Seabury | Baldwin JH, Eudora, Lawrence Southwest, Lawrence West |
| Saline | Salina Central, Salina South (5A), Southeast of Saline, Sacred Heart, Ell-Saline\\* | Salina Lakewood, Salina South, Salina Sacred Heart |

Veritas Christian (Lawrence) was already in the app (`src/schools/kas-ks.mjs`).

\\* **Few of its own games on Bound** (under 85% of MaxPreps' schedule). These schools also read MaxPreps' schedule (`sports.maxprepsSchedule`):
- Hayden: 6 of 10 football games;
- Cair Paravel Latin: 3 of 9; it also takes baseball from MaxPreps;
- Rossville: 3 of 10;
- Ell-Saline: 2 of 15 volleyball matches; it also takes football from MaxPreps.

**Results sources:**
- **Prep.Golf codes:** HAY, ROS, SEA, SH, SL, TOP, TW, WR, BALD, BS, EUD, LFS, LAW, ELS, SSH, SCN, SSO, SES.
  - Seaman is SEA: Bound's "Topeka Seaman" does not spell it, but KSHSAA's "Seaman HS" does.
  - Topeka West is TW. Its golfers are in this year's JV tournaments only, and its own varsity invitational lists Topeka High's TOP.
  - Sacred Heart is Prep.Golf's "Salina Sacred Heart", 239.
  - Highland Park is not on Prep.Golf.
- **TennisReporting:** Hayden HS, Topeka-Highland Park HS, Seaman HS, Shawnee Heights HS, Topeka HS, Topeka West HS, Washburn Rural HS, Cair Paravel Latin School, Baldwin HS, Bishop Seabury Academy, Free State HS, Lawrence HS, Sacred Heart HS, Salina-Central HS, Salina-South HS.
- **MileSplit Live team ids** for every high school with cross country, and for the middle schools that run in the index.
- **LetsGoRun:** the Shawnee Heights MS Invitational (Sep 22) and Washburn Rural MS Invitational (Sep 25) are now read (`LETSGORUN_MEETPRO.folders`). They were left out on November 5, when no school in the app had run them. The Sep 22 meet's "Eisenhower" is Topeka's. Manhattan's Eisenhower MS calendar says "at Clay Center" that day, and the folder does not fit it (`meetProFolderFits`).

**MaxPreps pages the survey's guesses missed** (found from links on the county's other school pages, `maxprepsFromLinks`, now in the survey):

| School | MaxPreps path |
| --- | --- |
| Topeka West | `topeka/west-chargers` |
| Cair Paravel Latin | `topeka/cair-paravel-lions` |
| Rossville | `rossville/rossville-bulldogs` (Bound: Bulldawgs) |
| Baldwin | `baldwin/baldwin-bulldogs` (the town is Baldwin City) |
| Bishop Seabury | `lawrence/bishop-seabury-academy-seahawks` |
| Washburn Rural | `topeka/washburn-rural-jr-blues`: the guessed `washburn-rural-junior-blues` answers too, but its team links are under the canonical path, which the survey now follows |

## Skipped

| School | County | Why |
| --- | --- | --- |
| Chase, Eisenhower, Jardine, Marjorie French, Landon middle schools (Topeka USD 501) | Shawnee | One or two cross country meets on Bound, nothing else (Robinson, also USD 501, has volleyball, basketball and track there and is in) |
| Capital City, Hope Street Academy, Lawrence Gardner, Avondale Academy | Shawnee | Not on Bound |
| Billy Mills MS, Liberty Memorial Central MS | Douglas | One or two Bound events per sport |
| Ell-Saline MS | Saline | Wrestling only on Bound (two meets) |
| Southeast of Saline JH | Saline | Not on Bound |

## Cross country results (sources checked, November 6)

The survey's results-sources table gives each school's meets this season. The meets below are not on the MileSplit Live index for their day, or on LetsGoRun's folders. The index was read again for the day of each, which caught Rim Rock (Bound's 02:00 UTC entry; the survey now dates Bound in Kansas time). The rest are **not published** on the sources the app may read:
- **Shawnee County meets:** the Topeka West meet (Sep 12), the Seaman Invitational (Oct 3), the Topeka City meet (Oct 10) and the Big East League meet (Oct 15).
- **Topeka's middle school meets:** the Joe Schrag (Sep 12), Seaman MS (Sep 16) and Jeff West MS (Sep 24) meets, and Robinson's city meets (Oct 8 to Nov 4).
- **Lawrence-area meets:** the Bobcat Invitational at Basehor (Sep 3), Tonganoxie (Sep 19), the MCA Invite (Oct 3), the Frontier League meet (Oct 15) and the KVC meet (Oct 17).
- **Salina-area meets:** Hesston (Sep 10), Buhler (Sep 17), Wild Wind at Trinity Academy (Sep 26), Halstead and Beloit (Oct 1), and the AVCTL D2 meet (Oct 17).
- **Out of state:** Free State's Missouri Southern meet (Sep 19) is in Missouri; the app reads Kansas's index.

Athletic.net, which some of these hosts use, disallows the app (`docs/HIGH_SCHOOL_ONBOARDING.md`).

## Opponents stay at their age

With Washburn Rural in the catalog, K-State's opponent "Washburn" (Washburn University) matched Washburn Rural High School. Opponent lookup matches names by substring (`catalogOpponent`), and now looks only at schools of the current school's age: a middle or high school's opponents are middle and high schools, and a college's or pro team's are not. `tests/catalog-module.mjs` checks both.

## Changes to schools already in the app (compared with `npm run diff:feeds`)

All sports, every middle and high school feed: 476 compared, 473 the same, 3 differ, 326 new. Cross country again on `4.274.2`: 64 compared, 63 the same, 1 differs (Republic County), 35 new.
- **Republic County, Oct 24:** production has two cards for one meet. They are Bound's "KSHSAA Regional Cross Country" and MileSplit Live's "KSHSAA 2A Sub-State Republic Co", with the same 7 runners from meet 788048. The preview has one, Bound's card with the 7 runners. A postseason entry is now the day's postseason meet (`sameIndexMeet`). The same rule gives Free State one card for its regional on Oct 24 (the 6A Sub-State at Manhattan, which Bound lists at Rim Rock Farm).
- **Blue Valley-Randolph football, Oct 30:** production shows a stored "W, 58-0 vs Leavenworth", saved November 4. MaxPreps' schedule now has Hanover (Oct 23) and Goessel (Oct 29) and no Oct 30 game, and the fresh build has none. It is retracted (`RETRACTED_FINALS`).
- **St. Mary's Academy basketball:** five games were missing from one preview read under the forced-refresh load, and were back on the next read. Not a code change.

## Limitations

- **Cair Paravel golf:** its golfers are on Prep.Golf (CPLS, 315; at the 2A state tournament), but its golf schedule is not on Bound or MaxPreps. Prep.Golf results attach only to meets on a school's schedule, so its golf needs a reader of its own (Prep.Golf's school page as the schedule). Not built.
- **Spring sports for schools with few Bound games** come from MaxPreps' team list. A team MaxPreps lists with no games this season answers no schedule until its season is posted.
- **Middle school game scores:** not published (5c).
- **LetsGoRun team names:** taken from Bound ("Topeka Seaman", "Hayden Catholic"). Cross country reads MileSplit Live by team id.
