# Manhattan High School (Kansas 6A): module notes

The first high school (user, October 9, 2026: "Let's do some highschool. The menu box should go by state for first box then schools for second drop down menu and then sports just like college.. we will start with Kansas, and just the 6A for now. We will focus on Manhattan high school first").

## Decisions (user, October 9)

| Question | Answer |
| --- | --- |
| Results source | School calendar for the schedule, MaxPreps for final scores |
| Athletes | None for high school (minors): no featured athletes, no Instagram |
| Kansas 6A list | Only schools that are built (Manhattan) |

## Menus

High School level: **State** (Kansas), **County** (Riley County), **School** grouped under its class (6A) with its town after the name ("Manhattan High School — Manhattan"), then **Sport**. The school line reads "Manhattan High School · 6A · Centennial League". `level`, `state`, `county`, `city` (the town) and `classification` in `src/schools.json`; `LEVELS` in `public/index.html`.

County, not city, since October 21 (user: "I've decided to place the schools by county instead of city because nanny of them are not in a city", then "Yes, go with state, county, school and show the town"; PR #376). Every school is in a county, and public data (NCES) gives each school's county, so imports need no hand-typed places.

## Sources

- **Schedule:** the school's own calendar, `https://mhs.usd383.org/api/calendars/128516/events?start_date=<Jul 1>&end_date=<Jun 30>` (ParentSquare Smart Sites JSON; the school's site lists no other schedule, only PDFs). Titles read `MHS <level> <sport> - <opponent or event> - HOME|AWAY`. Only varsity entries are read; JV, 9th grade and C-team are not. Intrasquad scrimmages are not games.
- **Scores:** MaxPreps team schedule pages (`https://www.maxpreps.com/ks/manhattan/manhattan-indians/<sport>/schedule/`), the scores the coaches report. Each contest gives the score, W/L, whether it was a league game ("their away conference game"), the game page, and an NFHS stream link when one exists. robots.txt allows these pages.
- **Expanded view:** the MaxPreps game page's box score (quarter scores), read only when a final is opened. Highlights are plain facts from the score and box score (result, halftime score, best quarter), labeled "Score and box score as reported to MaxPreps by the team." The recap button reads "View MaxPreps game page".
- **Records:** overall from the finals; league record (Centennial League) from MaxPreps' conference flag.
- Shared code: `src/high-school.mjs` (calendar and MaxPreps readers); school data: `src/schools/manhattan-ks.mjs`; Worker path: `fetchHighSchool` in `src/index.js`.

## Sports

Rule for every sport (K-State's): a past game or meet with no published result is not listed; it appears when MaxPreps, TennisReporting or a meet's results publish it. Coming games and meets always show.

| Sport | Results source | State on Oct 9 |
| --- | --- | --- |
| Football | MaxPreps scores, box score in the expanded view | 3-2, Centennial League 1-0 |
| Soccer (Boys fall, Girls spring) | MaxPreps; halves in the expanded view | Boys 3-5-1, league 2-2. The calendar names a tournament's host ("Blue Valley West"), so MaxPreps' opponent (Blue Valley Northwest) is shown when the names differ |
| Volleyball | MaxPreps, every match (triangulars and tournaments list each match there; the calendar names only the day); sets in the expanded view | 21-7, league 9-1 |
| Tennis (Girls fall, Boys spring) | TennisReporting draws (api.tennisreporting.com, the data behind its public bracket pages): the event found by date and the host site that lists "Manhattan HS"; every Manhattan entry's matches with names, rounds and scores, live during the day; team place once team points post | Oct 9 regional live (Matches 5-1 at 2 PM); 6A state Oct 16. Past invitationals (9) are not on TennisReporting and not listed |
| Cross Country | The timer's MeetPro pages (user, Oct 10: bit.ly/LetsGoRunMHK → LetsGoRun Timing, `results.tfmeetpro.com/LetsGoRun_Timing/<meet>/`): team place and every runner's place and time, varsity races only. Meets are matched by date; known 2026 meets are listed in `LETSGORUN_MEETPRO` (the timer's results list does not link every meet), others are looked up on the list by name, three pages at most | Manhattan Invitational (Sep 5): girls 1st of 5, boys 2nd of 11. Meets timed by others (Emporia, Missouri Southern, Olathe North, Rim Rock, Baldwin) have no published results and are not listed |
| Golf (Girls fall, Boys spring) | **Prep.Golf** since Oct 21 (`ks.prep.golf/schools/11`, where coaches and KSHSAA post results; robots.txt allows every page): the school page's place and score per tournament, the tournament page's team table and every Manhattan golfer (school code `MAN`) with rounds. Matched to the calendar by day, varsity only; by name when two varsity tournaments share a day (Sep 28 Centennial League and Clay Center); the calendar's "Regionals" is KSHSAA's "Sub-State" and may be a day apart (Oct 12 vs Oct 13) | Oct 21: 8 finals, from Queens of the Greens (4th, 348) to 6A State (4th of 12, 687; Maddie Myers state medalist, 63-73, 136, -8). Salina Central (no place posted) and Blue Valley Northwest (not on Prep.Golf) are not listed |

Winter (basketball, wrestling, boys swimming, bowling) and spring sports are added as their seasons are published.

## Middle schools (USD 383)

User, October 9: "My timer friend also does middle schools so let's add the Manhattan area middle schools as well". Since October 21 the middle schools have their own **Middle School** level, first in the level switch (user: "Let's pull middle out to it's own drop down menu. The menu order will be middle school, high school, college, and pro"; PR #376): `level: "middle-school"`, State → County (Riley County) → School (town shown) → Sport, with the same readers as the high school. Before, they were listed under Kansas with a **Middle School** heading below 6A.

| School | id | Calendar | Sports listed |
| --- | --- | --- | --- |
| Susan B. Anthony Middle School | `anthony-ms-ks` | `ams.usd383.org` calendar 128968 | Cross Country, Football, Volleyball (only fall is published so far; add basketball, wrestling and track when Anthony publishes them) |
| Dwight D. Eisenhower Middle School | `eisenhower-ms-ks` | `ems.usd383.org` calendar 128776 | Basketball (7th/8th, girls and boys), Cross Country, Football, Track & Field, Volleyball, Wrestling (boys and girls) |

- Titles are typed by hand ("7th VB @SH", "8h Girls BB @ Washburn Rural"); `parseMiddleSchoolTitle` in `src/high-school.mjs` reads them, and `USD383_ABBREVIATIONS` (`src/schools/manhattan-ks-middle.mjs`) expands the league short names (SH, WRN, JC, EMS, AMS, FR, LWMS...). B-team days, scrimmages, tryouts, practices and pictures are not games.
- Teams are the grades (7th, 8th; 7th Girls, 8th Boys in basketball).
- **Results:** cross country from the same LetsGoRun MeetPro pages (every grade race; JV races left out; team names vary by meet: "Anthony", "Anthony Middle School", "Anthony7G"). Anthony: 5 meets, Eisenhower: 4 (Sep 8 to Oct 2). No site publishes middle school game scores; past games are not listed (K-State's rule).

## Other sources checked (October 21)

User: "look for alternate websites for getting official results for all the sports of middle school and high school".
- **Prep.Golf** (`ks.prep.golf`): built for golf (above).
- **Bound** (`beta.gobound.com`, the KSHSAA scheduling platform Manhattan uses for its schedule and tickets): the school's own scores, entered by the school, from `GET /api/schools/h20250204045200696bcbb2cc6f78a4e/scores?startDate=&endDate=&pageSize=` (the beta site's robots.txt allows everything; `www.gobound.com` disallows `/api/`). Fall 2026 varsity coverage: volleyball 17 of 27 events final, boys soccer 16 of 22, football 3 of 5, golf 4, cross country 1 (Rim Rock Farm Sep 26: girls 1st with 90, boys 7th with 238, a meet LetsGoRun did not time), tennis 1. Not built yet: a fallback for games MaxPreps has no score for and meets no other source covers. Anthony and Eisenhower are not on Bound.
- **Midwest Timing & Results** (`midwesttiming.com`, robots allow): Kansas cross country meets it times (PDFs on MileSplit); none of Manhattan's 2026 meets found yet.
- **KMAN** (`1350kman.com`) and **The Manhattan Mercury** (`themercury.com`): local stories with team places (swimming, track, state results); stories, not result tables.
- **Not usable:** Athletic.net (403 to the app), MileSplit (results for paying members only), Trackwrestling (406), SwimCloud (API disallowed; no Manhattan team pages found).
- **Middle schools:** no site publishes Anthony's or Eisenhower's game scores; their games need the school's own live scoring (SAS Scorer, every sport since October 21).

## Limitations

- **No live scores.** No ESPN-style live feed exists for Kansas high schools; a game shows "Today" until MaxPreps has the final.
- **Scores depend on coaches reporting to MaxPreps.** A past game without a reported score is not listed until it is reported.
- **Meets without a results source:** golf meets not on Prep.Golf (or with no place posted) are not listed; cross country meets timed by someone other than LetsGoRun are not listed; tennis invitationals not on TennisReporting are not listed (MaxPreps has no contests for these Manhattan teams, checked Oct 9).
- MaxPreps volleyball pages hold pool placeholders (0-0 ties, no result); those are not matches.
