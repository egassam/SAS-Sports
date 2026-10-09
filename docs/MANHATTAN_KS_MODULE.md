# Manhattan High School (Kansas 6A): module notes

The first high school (user, October 9, 2026: "Let's do some highschool. The menu box should go by state for first box then schools for second drop down menu and then sports just like college.. we will start with Kansas, and just the 6A for now. We will focus on Manhattan high school first").

## Decisions (user, October 9)

| Question | Answer |
| --- | --- |
| Results source | School calendar for the schedule, MaxPreps for final scores |
| Athletes | None for high school (minors): no featured athletes, no Instagram |
| Kansas 6A list | Only schools that are built (Manhattan) |

## Menus

High School level: first box **State** (Kansas), second box **School**, grouped under its class (6A), third box **Sport**. The school line reads "Manhattan High School · 6A · Centennial League". `level`, `state` and `classification` in `src/schools.json`; `LEVELS` in `public/index.html`.

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
| Cross Country | None yet: waiting on the timer's public results link (user's choice). MileSplit shows results only to PRO accounts and robots.txt blocks its API; Athletic.net answers 403 | Coming meets only |
| Golf (Girls fall, Boys spring) | None yet | Coming meets only (regionals Oct 12, state Oct 19) |

Winter (basketball, wrestling, boys swimming, bowling) and spring sports are added as their seasons are published.

## Middle schools (USD 383)

User, October 9: "My timer friend also does middle schools so let's add the Manhattan area middle schools as well". Listed under Kansas with a **Middle School** heading (user's choice), below 6A.

| School | id | Calendar | Sports listed |
| --- | --- | --- | --- |
| Susan B. Anthony Middle School | `anthony-ms-ks` | `ams.usd383.org` calendar 128968 | Cross Country, Football, Volleyball (only fall is published so far; add basketball, wrestling and track when Anthony publishes them) |
| Dwight D. Eisenhower Middle School | `eisenhower-ms-ks` | `ems.usd383.org` calendar 128776 | Basketball (7th/8th, girls and boys), Cross Country, Football, Track & Field, Volleyball, Wrestling (boys and girls) |

- Titles are typed by hand ("7th VB @SH", "8h Girls BB @ Washburn Rural"); `parseMiddleSchoolTitle` in `src/high-school.mjs` reads them, and `USD383_ABBREVIATIONS` (`src/schools/manhattan-ks-middle.mjs`) expands the league short names (SH, WRN, JC, EMS, AMS, FR, LWMS...). B-team days, scrimmages, tryouts, practices and pictures are not games.
- Teams are the grades (7th, 8th; 7th Girls, 8th Boys in basketball).
- **No results source:** no site publishes middle school scores; past games and meets are not listed (K-State's rule), so each sport shows its coming schedule. Cross country and track results would come from the timer's public results link, as for the high school.

## Limitations

- **No live scores.** No ESPN-style live feed exists for Kansas high schools; a game shows "Today" until MaxPreps has the final.
- **Scores depend on coaches reporting to MaxPreps.** A past game without a reported score is not listed until it is reported.
- **Meets without a results source:** cross country and golf list coming meets only; tennis invitationals not on TennisReporting are not listed (MaxPreps has no contests for these Manhattan teams, checked Oct 9).
- MaxPreps volleyball pages hold pool placeholders (0-0 ties, no result); those are not matches.
