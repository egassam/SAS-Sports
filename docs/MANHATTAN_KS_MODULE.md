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

| Sport | State | Notes |
| --- | --- | --- |
| Football | Built, tested (`tests/manhattan-ks-module.mjs`) | 3-2, league 1-0 on Oct 9; Rockhurst (Sep 4) has no MaxPreps game page, so no expanded box score |

Next, one at a time: Volleyball, Boys Soccer, Girls Tennis, Girls Golf, Cross Country (fall); Basketball, Wrestling, Boys Swimming, Bowling (winter); spring sports when the calendar publishes them.

## Limitations

- **No live scores.** No ESPN-style live feed exists for Kansas high schools; a game shows "Today" until MaxPreps has the final.
- **Scores depend on coaches reporting to MaxPreps.** A past game without a reported score shows "Final · Score not reported".
- **Meets (cross country, golf, tennis):** MaxPreps holds no results for Manhattan's meets (checked Oct 9: cross-country and girls tennis pages carry no contests), so meets will show as completed without places until an official results source is added (back-burner timer idea in the handoff).
- MaxPreps volleyball pages hold placeholder and duplicate matches for tournaments; volleyball needs its own matching before it is enabled.
