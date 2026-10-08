# Arkansas school module

`src/schools/arkansas.mjs` owns Arkansas's arkansasrazorbacks.com schedule and roster routes, its program combinations, its team Instagram accounts and its own schedule-card reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Arkansas was added to the app and converted on October 8, 2026, together with Auburn (PR #254). All 12 sports were built and tested one at a time and published in one PR. arkansasrazorbacks.com is neither SIDEARM nor WMT Nuxt: it is a WordPress site (the "bordeaux" schedule template, legacy addresses `/sport/m-footbl/schedule/`), so the module has its own reader.

## Status (`4.65.1-arkansas-auburn`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `m-footbl` | 5 finals, each with its story (the result links it); 2-3 (SEC 0-2); ESPN live score |
| Volleyball | `w-volley` | 14 finals, each with its card's Recap; 8-6 (SEC 0-3); ESPN live score |
| Soccer | `w-soccer` | 11 finals and 2 exhibitions; stories from the card or the team's WordPress category; 4-4-3 (SEC 2-1-2), as published ("Soccer Draws Missouri, 1-1"); ESPN live score |
| Cross Country | `m-xc`, `w-xc` | Labeled per team; each event takes its own team's race from TFRRS (`AR_college_f_Arkansas`, `AR_college_m_Arkansas`) and its team's story; Chile Pepper (Oct 3) waits on TFRRS (story shown) |
| Golf | `m-golf`, `w-golf` | Day cards merged; place from the last day's card (`1st of 9`, team score) |
| Swimming & Diving | `w-swim` | Duals `W, 209-83`; invitationals `1st of 5` with team score |
| Tennis | `m-tennis`, `w-tennis` | Labeled; tournaments listed with a story only (ITA All-American, women's); players' pro events (ITF, Futures, UTR/PTT) left out |
| Basketball | `m-baskbl`, `w-baskbl` | Labeled; summer-tour exhibitions (Bahamas) labeled; ESPN live scores |
| Baseball, Softball | `m-basebl`, `w-softbl` | Fall exhibitions; doubleheaders split into Game 1 / Game 2; Red-White games and derbies left out |
| Gymnastics | `w-gym` | 2027 meets upcoming |
| Track & Field | `m-track`, `w-track` | Men's 2026-27 meets upcoming; women's page not published yet (a valid empty schedule) |

## Arkansas rules

- **Cards:** `div.item`: venue type (Home/Away/Neutral), `<strong>Sep. 5</strong>`, the time slot ("3:15 PM", "TBA", "All Day", windows like "Flex 2:30-7 p.m." are no published time, spans "Nov. 20-24" end a multi-day event), the opponent ("at #20 Utah", "No. 9 Texas"), the result.
- **Season:** from the page heading (`<h1><span>2026-27</span>…`).
- **Results** write the winner's score first: `L, 43-10` is read `L, 10-43`. Doubleheaders `W, 12-0 | W, 3-1` / `W, 10-2 & W, 9-1` are two games.
- **Stories** live at `/<slug>/` with no date in the address. A card's Recap link (or the result's own link) is taken; a story is checked against its `article:published_time` (day before the event to four days after its last day) and must name the opponent. The story text is `div.article-paragraph` (shared reader).
- **Archive:** a final with no card story takes one from the team's WordPress category (`ARKANSAS_CATEGORIES`, `/wp-json/wp/v2/posts?categories=`): a game's names the opponent and the score (a draw: "draws"); a meet's names the meet's distinctive words in its title or summary; previews are skipped.
- **Exhibitions** the cards do not label: soccer's Kansas City (Aug 5) and Memphis (Aug 8), from the published record and the stories ("exhibition opener"; Baylor Aug 12 is the "season opener").
- **Team accounts** (`blockedInstagramHandles`): each sport's pages link its own team account (`razorbackswimdive`, `razorbackmtennis`, …); they are never athlete links.

Every rule was mutated, and every mutation fails `npm run test:arkansas-module`.

## Athletes

Roster pages are tables: each row links `/roster/<name>/` and the athlete's Instagram (shared reader now accepts that row shape on the school's own host). 10 sports pass with three Instagram athletes from the roster rows. **Swimming & Diving and Tennis use official profile cards** (`athlete_profile_fallback_sports`): the roster tables publish no personal links, and `scripts/athlete-evidence.mjs` (Oct 8) read every profile page: Swimming & Diving 26 and Tennis 19, each showing only the team account (`razorbackswimdive`, `razorbackmtennis`, `razorbackwten`). Portraits come from the profile pages.

## Limitations

- Men's tennis tournaments with a story naming several events ("Men's Tennis Wraps Up First Tournaments of Fall Schedule") are not matched and so not listed; the ITA All-American (men's) has no story.
- Chile Pepper Festival cross country shows "Completed" with its stories until TFRRS publishes the results.
- Softball and baseball fall exhibitions have no stories (none published).
- Women's Track & Field fills when the 2026-27 schedule is published.
