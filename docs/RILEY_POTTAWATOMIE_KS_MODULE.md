# Riley County and Pottawatomie County, Kansas: middle and high schools

User, October 25, 2026: "Let's add all of the middle schools and high schools of Riley county and Pottawatomie county of Kansas. Please check all available websites for these middle school and high school sports. Don't leave any Stone unturned. Learn and optimize".

Manhattan High School and Manhattan's two middle schools (USD 383) were already in the app (`docs/MANHATTAN_KS_MODULE.md`). This session adds every other middle and high school in the two counties. Code: `src/schools/riley-pottawatomie-ks.mjs` (school data) and the shared readers in `src/high-school.mjs`; Worker path `fetchHighSchool` in `src/index.js`.

## Schools

Counties checked with the US Census geocoder (each school's street address). Fort Riley Middle School is in Geary County (left out); Manhattan's east side, where Flint Hills Christian stands (3905 Green Valley Rd), is in Pottawatomie County.

| School | id | County · town | Class · league | Schedule source |
| --- | --- | --- | --- | --- |
| Riley County High School | `riley-county-ks` | Riley · Riley | 3A · Big East League | Bound `rileycountyhs` |
| Blue Valley High School | `blue-valley-randolph-ks` | Riley · Randolph | 1A · Twin Valley League | USD 384 calendar (ParentSquare 151215) |
| Wamego High School | `wamego-ks` | Pottawatomie · Wamego | 4A · North Central Kansas League | Bound `wamegohs` (the district's calendar page links it) |
| Rock Creek High School | `rock-creek-ks` | Pottawatomie · St. George | 4A · North Central Kansas League | Bound `rockcreekhs` |
| St. Marys Junior/Senior High | `st-marys-ks` | Pottawatomie · St. Marys | 2A · Big East League | Bound `stmaryshs` |
| Onaga High School | `onaga-ks` | Pottawatomie · Onaga | 1A · Twin Valley League | Bound `onagahs` |
| Flint Hills Christian School | `flint-hills-christian-ks` | Pottawatomie · Manhattan | Private | The athletics sheet its site links (Google Sheet CSV) |
| St. Mary's Academy | `st-marys-academy-ks` | Pottawatomie · St. Marys | Private, not a KSHSAA member | Bound `saintmarysacademy` |
| Riley County Middle School | `riley-county-ms-ks` | Riley · Riley | Middle school | Bound `rcmsks` |
| Blue Valley Junior High | `blue-valley-randolph-ms-ks` | Riley · Randolph | Middle school · Blue Valley League | USD 384 calendar ("MS" entries) |
| Manhattan Catholic Schools (Luckey) | `manhattan-catholic-ks` | Riley · Manhattan | Middle school · Blue Valley League | MCS calendar (ParentSquare 152066) |
| Wamego Middle School | `wamego-ms-ks` | Pottawatomie · Wamego | Middle school | Bound `wamegoms` |
| Rock Creek Middle School | `rock-creek-ms-ks` | Pottawatomie · St. George | Middle school | Bound `rockcreekms` |
| St. Marys Junior High | `st-marys-jh-ks` | Pottawatomie · St. Marys | Middle school | Bound `stmaryshs` (grade levels) |
| Onaga Middle School | `onaga-ms-ks` | Pottawatomie · Onaga | Middle school | Bound `onagahs` (middle school levels) |
| Flint Hills Christian Middle School | `flint-hills-christian-ms-ks` | Pottawatomie · Manhattan | Middle school | The athletics sheet ("MS" blocks) |
| St. Mary's Academy Junior High | `st-marys-academy-jh-ks` | Pottawatomie · St. Marys | Middle school | Bound `saintmarysacademy` (7th and 8th grade boys' basketball) |

Checked and not added: Archangel Gabriel Catholic School (Manhattan; no athletics published anywhere), Manhattan C.H.I.E.F. (a homeschool association on Bound, not a school), elementary schools.

## Sources (every website checked, October 25)

- **Bound** (`beta.gobound.com`, the KSHSAA scheduling platform; robots.txt allows everything): every school above has a Bound page. `GET /api/schools/<id>/events?startDate&endDate&includePractices=false&ticket=false&idAct=<act>` gives one act's school year with every team, level, home flag and the finals the schools enter (one read per act, kept ten minutes). An act has one id for all of Kansas; events a host made under another state's act carry a second id (Onaga's own wrestling invite), so both are read (`BOUND_ACTS`). Read with the scoreboard identity Bound answers (user, October 21: "Go with option 1"). Bound lists placeholders beside real entries (a state day with only the school on it, the same game twice, a "Conway Springs vs Wamego" cross country entry on state day): `boundDedupe` keeps one entry per meet day and each game once (doubleheaders keep both games), and joins a two-day event ("State Volleyball" Oct 31 and Nov 1).
- **School and district sites:** usd378.org (Riley County) and usd323.org (Rock Creek) answer robots with a Finalsite "Client Challenge" page (not bypassed; Bound has their schedules); usd320.com (Wamego) links its Bound calendars; usd384.org (Blue Valley) and manhattancatholicschools.org publish ParentSquare calendars (read: Bound has few of their events); usd322.org (Onaga) is an Apptegy site; kawvalley.k12.ks.us (St. Marys) and usd321.org did not answer; flinthillschristianschool.com links a Google Sheet of every team's season; smac.edu (St. Mary's Academy) answers 403.
- **MaxPreps:** scores the coaches report, for the eight high schools (school ids in the module and `src/schools.json`). Read only for teams with past games.
- **LetsGoRun Timing (MeetPro):** cross country team places and every runner (Clay Center, Rock Creek, Wamego, NCKL and Blue Valley League middle school meets...). Team names vary by meet ("Flinthills Christian", "FH Christian MS", "Luckey" for Manhattan Catholic, "Rock Creek MS", "Wamego Middle School").
- **Prep.Golf:** Wamego (school 124, code WAM; 2026 4A girls state champions), Rock Creek (119, RC), Riley County (177, RC), St. Marys (186, STM), Onaga (303, ONA), Flint Hills Christian (347, FHC), St. Mary's Academy (366, SMA). Riley County and Rock Creek share the code RC: when both played a tournament the golfers are not listed (team places still are).
- **TennisReporting:** Wamego HS (4A regional at McPherson, 4A state).
- **Apptegy (Onaga USD 322):** `thrillshare-cmsv2.services.thrillshare.com/api/v4/o/2099/cms/events?page_no=<n>&page_size=100` (coming events only; `per_page` is ignored, 20 a page). Onaga enters part of its season on Bound (6 varsity basketball dates); its calendar adds the rest ("HS Basketball @ Northern Heights", "JH Boys Wrestling at Doniphan West"), for coming dates only.
- **Not usable:** Athletic.net (403), MileSplit (members only), KSHSAA's site (no machine-readable directory; robots Crawl-delay 30), Trackwrestling (406, as for Manhattan).

## Rules

- Bound levels: high schools read `Varsity`; middle schools read the grades (`7th Grade`, `7th A`, `8th Grade A-Team`...) as teams 7th and 8th, and whole-team entries (`Middle School`, `Junior High`, `JH A`) without a grade. B teams are not listed.
- Blue Valley and Manhattan Catholic titles are typed by hand (`parseFreeTitle`): "HS Football- Home vs. Canton-Galva", "MS/HS Cross Country- Abilene Meet at Great Life Golf & Fitness" (counts for both), "Volleyball Away Game at Valley Heights", "XC @ Clay Center". Practices, photos, first days, rain dates and JV/C-team-only entries are not games. Manhattan Catholic's calendar is fed from Google in UTC; its times are read in Kansas time.
- Flint Hills Christian's sheet (`sheetCalendar`): blocks "HS Volleyball Schedule 2026" side by side; "@" marks an away game, the location FHCS a home one; bracketed teams decide the level ("(MS, JV, V)", "(HS & MS)"); the last of several times is varsity's.
- Game sports: MaxPreps finals, then Bound finals MaxPreps lacks, then the coming games and tournament days.
- K-State's rule: a past game or meet with no published result is not listed.

## State on October 25 (preview 4.218.0)

All 108 school-sports answer on the preview. Fall results: football and volleyball finals from MaxPreps for all eight high schools (Wamego football 6-1, NCKL 4-0; Riley County 6-2; Blue Valley 3-5; St. Marys 2-6; Onaga 5-3; St. Mary's Academy 7-2; volleyball records 7-26 to 32-9); Wamego girls flag football 4-0 from Bound; St. Mary's Academy boys soccer 8-9-1; Wamego girls golf (2026 4A state champions) 12 finals from Prep.Golf, Rock Creek 6, St. Marys 3; Wamego girls tennis regional and state from TennisReporting; middle school cross country from LetsGoRun (Rock Creek MS, Wamego MS, Flint Hills Christian MS, Manhattan Catholic, Blue Valley, St. Marys); a few middle school finals the schools entered on Bound. Winter and spring sports list their coming games and meets.

## Limitations

- **Past events without a published result are not listed** (K-State's rule). Most middle school games have no score anywhere (as at Anthony and Eisenhower); a school can enter finals on Bound or use SAS Scorer.
- **Cross country and track results** come only from LetsGoRun Timing's MeetPro pages. Meets timed by others (Riley County's, Onaga's, St. Marys' and most high school invitationals) have no published results and are not listed. LetsGoRun's track meets use MeetPro's event pages (a different layout from cross country); reading them is the first job of the spring season (fixtures: the 2026 Rock Creek MS and Wabaunsee invitationals).
- **Wrestling, bowling and track** list their coming meets; no source publishes their team results (Trackwrestling refuses robots).
- **Riley County and Rock Creek share Prep.Golf's code RC**: their golfers are not listed for a tournament both played.
- **Riley County golf** (fall 2026) is not on Prep.Golf with a team place (fewer than four players): not listed.
- **Bound placeholders**: playoff rounds a school entered ahead ("Regional Football", "TBD") show until the school's season ends; a home flag on a state day is not trusted (shown neutral).
- **Blue Valley and Manhattan Catholic titles are typed by hand**; a new form of title may need a parser rule. Flint Hills Christian's sheet lists one basketball schedule for both teams (shown for each).
- **Flint Hills Christian football** plays with the Manhattan C.H.I.E.F. homeschool program (not on the school's sheet): not listed. St. Mary's Academy has no site that answers (smac.edu 403); Bound is its only schedule.
- **Records** count MaxPreps finals and Bound finals; MaxPreps can list a match twice when both coaches enter it (Wamego–Rock Creek volleyball, Oct 13).
