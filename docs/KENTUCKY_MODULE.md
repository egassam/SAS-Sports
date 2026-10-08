# Kentucky school module

`src/schools/kentucky.mjs` owns Kentucky's ukathletics.com schedule and roster routes, its program combinations, its verified Instagram pins and its own schedule-card reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Kentucky was added to the app on October 8, 2026, with Oklahoma (PR #259). All 14 sports were built and tested one at a time and published in one PR. ukathletics.com is WMT's WordPress template, not SIDEARM and not WMT Nuxt. The addresses use the site's sport codes (`/sports/mbball/schedule/`), so the module has its own reader.

## Status (`4.66.1-oklahoma-kentucky`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals, each with its Recap; 4-1 (SEC 2-1); `W, 35-34 (OT)`; ESPN live score |
| Volleyball | `wvball` | 14 finals and 2 exhibitions; 11-3 (SEC 3-1); ESPN live score |
| Soccer | `msoc`, `wsoc` | Labeled per team. Men's 1-6-3 (**Sun Belt** 1-1-1), women's 6-5-1 (SEC 2-2-1), as the stories publish; ESPN live scores (men's and women's) |
| Cross Country | `cross` (one page, both teams) | The card's team places (`M: 3rd (48 pts) / W: 2nd (40 pts)`), then TFRRS's complete races (`KY_college_f_Kentucky`, `KY_college_m_Kentucky`) |
| Golf | `mgolf`, `wgolf` | Day cards merged. Place and team score from the last played day: `15th of 17` / `852`. Women's cards publish no field size: `8th` / `886 (+22)`. The Ally's cancelled final round ends it Oct 6 |
| Rifle | `rifle` | `W, 4723-4722` at Georgia Southern; record 1-0; Smallbore/Air Rifle day cards merged |
| Swimming & Diving | `swimming` (one page) | One dual per team, the score read for Kentucky: `Women's team: L, 115-183 / Men's team: L, 103-194`. Story from the news search |
| Tennis | `mten`, `wten` | Women's 2026-27: tournaments listed only with a story. Men's page still shows 2025-26: a valid empty schedule |
| Basketball | `mbball`, `wbball` | Labeled; exhibitions labeled; Big Blue Madness left out; ESPN live scores |
| Baseball, Softball | `baseball`, `softball` | Fall games (records leave them out); doubleheaders `W 17-2, 17-6` split into Game 1 / Game 2 |
| Gymnastics | `wgym` | 2027 meets upcoming |
| Track & Field, STUNT | `track`, `stunt` | The pages still show last season (2025-26, 2026): valid empty schedules until the new season is published |

## Kentucky rules

- **Cards:** `div.schedule__item` with the venue class (`home`/`away`/`neutral`; `tourney` marks a tournament's first card) and `<time><span>Sat.</span><span>Sep 5</span></time>`. The opponent is in `h3` (with `<small>(EXH)</small>`). The result slot holds the result, a place, or the time (`7:00 pm`, `TBA`, `All Day`).
- **Season years:** from the page heading. In `2026-27`, July-December is 2026. A one-year heading is that year, except fall cards listed before a spring season (the `2027` baseball page's October exhibitions are 2026).
- **Current season only:** cards before July 1 of the current academic year are last season's.
- **Scores** are written in either order (`L 3-1`, `L 0-3`); they are read with Kentucky's score first.
- **Meets** (golf, track, rifle, swimming): day cards with one name (`(Day 2)`, `Smallbore Day 1` / `Air Rifle Day 2` removed) within two days become one event. A finished meet takes the last day's result and story.
- **Left out:**
  - internal events (spring game, Blue-White, Big Blue Madness, swimming's Blue vs. White, scrimmages);
  - players' pro and junior tennis events (ITF, ATP Challenger, Futures, US Open Junior) and individual NCAA matches (`Jack Loutit (UK) vs. …`);
  - finished tennis tournaments with neither a place nor a story (Big Blue Invite, ITA All-American, women's).
- **Stories** are at `/news/<y>/<m>/<d>/<slug>/`, from the card's Recap link (postgame class or label), and are checked by the shared matcher. The text is in `section.article_text` or `section.article-text` (one or several sections; shared reader).
- **Archive:** a final with no card story takes one from the news search (`/wp-json/wp/v2/posts?search=`; the site files stories under no sport). The search covers the day before the event to three days after it. A story qualifies when it names the sport and the opponent, and for a game the score. Previews ("hosts", "heads to") are skipped.
- **Conference:** men's soccer counts regular-season games against Sun Belt members, labeled Sun Belt. A record can carry its own `conference_name`; this shared change is used by this team only.

Every rule was mutated, and every mutation fails `npm run test:kentucky-module`.

## Athletes

14/14 on the preview, three per sport.
- **Pins:** Softball (11 links in 22 profiles) and Tennis (9 in 18) are pinned (`verifiedInstagrams`).
- **Profile cards** (`athlete_profile_fallback_sports`): `scripts/athlete-evidence.mjs` (Oct 8) read every profile page of these sports, and none publishes an athlete Instagram link:
  - Baseball: 39 pages;
  - Rifle: 11 pages;
  - Swimming & Diving: 53 pages.

## Limitations

- **Waiting on publication:**
  - Track & Field, STUNT and men's tennis fill when ukathletics.com publishes the 2026-27 seasons.
  - Women's golf cards publish no field size.
- **No story published:**
  - Softball's and baseball's fall games, and volleyball's two exhibitions (news search checked).
  - The Big Blue Invite and the women's ITA All-American: no story or place, so they are not listed.
- **Live cards:** no live card observed yet (volleyball vs LSU Oct 9, football vs LSU Oct 10).
