# South Carolina school module

`src/schools/south-carolina.mjs` owns South Carolina's gamecocksonline.com schedule and roster routes, its program combinations, its verified Instagram pins, its blocked team accounts and its schedule-card reader. The Worker imports its configuration.

South Carolina was added to the app and converted on October 8, 2026, together with Vanderbilt. All 13 sports were built and tested one at a time and published in one PR. gamecocksonline.com is WMT's WordPress template, but not Kentucky's: the module started from Kentucky's handlers (`scripts/port-handlers.mjs --from=kentucky`) and has its own card reader.

## Status (`4.67.3-south-carolina-vanderbilt`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals, each with its story; 2-3 (SEC 0-3); ESPN live score |
| Volleyball | `wvball` | 14 finals, each with its story; 8-6 (SEC 1-3), equal to the Oct 4 story's; ESPN live score |
| Soccer | `msoc`, `wsoc` | Labeled; women 10-1-1 (SEC 4-0-1), men 7-1-2 (Sun Belt 1-0-2), equal to the latest stories'; every final with its story; ESPN live scores |
| Cross Country | `wcross` | 3 finals with the women's place in the field ("1st of 13") and stories; TFRRS results (`SC_college_f_South_Carolina`) for the Eye Opener (1st, 26 pts) and Joe Piane Invite (3rd, 102 pts) |
| Golf | `mgolf`, `wgolf` | Labeled; round cards merged, placed by the last round with the team score; the Stephens Cup closes with its match-play final ("Won final vs. Wake Forest, 3-2") |
| Equestrian | `equestrian` | 2 finals and 2 exhibitions, each with its story |
| Swimming & Diving | `swimming` | One page for both teams; UNCW dual per team ("Women's team: W, 250-50 / Men's team: W, 165-135") |
| Tennis | `mten`, `wten` | Labeled; Furman Fall Classic with its story; players' pro events (ITF) and past tournaments without a story left out |
| Basketball, Baseball, Softball | | Exhibitions labeled (men's summer tour, women's Sep 27 exhibition, fall baseball and softball); ESPN live scores |
| Track & Field, Beach Volleyball | `track`, `bvball` | Pages still show last season: empty until 2026-27 is published |

## South Carolina rules

- **Cards:** `div.event.schedule-table_row <venue>` with the start as a Unix time (`data-order`); the day and time are written out ("Sat Sep 5 12:45 pm", "Fri Oct 16 - Sat Oct 17", "TBA", "All Day"). A TBA start is midnight UTC, so the written day decides and the year is the one nearest `data-order`.
- **Opponent:** the `<strong>` in `schedule-list__opponent`, after any promotion ("Salute the Troops"); its marks follow: "(EXH)" an exhibition, "(SEC)"/"(Sun Belt)" a conference game (a page with marks sets every game's `conference_game`).
- **Results:** "W 57-0", South Carolina's score first; golf "t-4th, 551 (-17)"; cross country "1st/13"; track "M: 11th | W: 5th"; swimming "Women: W 250-50; Men: W 165-135"; "NTS" reads "Completed".
- **Golf:** "R1 & R2", "R3", "Match Play" round cards are one tournament; a scored card right after one is its match-play final.
- **Stories:** the `schedule-event-link--postgame` link or a link labeled "Recap"; a meet's "Day One Recap"/"Day Two Recap" takes the last.
- **Story text:** two templates, `section.article_text` and `div.article__paragraphs` (the second was unread: 15 expanded views on the first preview had no text).
- **Athletes:** every profile page's menu lists 16 team accounts (`gamecockbaseball` ...) before the athlete's own link; they are blocked (`blockedInstagramHandles`), or every athlete would show the team account.

Every rule was mutated; every mutation fails `npm run test:south-carolina-module` (a ranking rule whose mutation survived was removed: the strong never carries one).

## Athletes

Certification lists all 13 sports (minimum 3). The roster cards publish athlete Instagram (team accounts left out): Swimming & Diving 51/51, Beach Volleyball 15/15, Basketball 15/29, Tennis 11/20, Baseball 7/34, Golf 6/18, Volleyball 4/18, Football 2/111, Cross Country 1/18, Track & Field 1/74; Equestrian (46), Soccer (56) and Softball (23) publish none, and `scripts/athlete-evidence.mjs` (Oct 8) found the same on the profile pages. Sports with 12 links or fewer on the profile pages are pinned (35 pins). Official profile cards fill the remaining slots in Cross Country, Equestrian, Football, Soccer, Softball and Track & Field (`athlete_profile_fallback_sports`); all 13 sports show three athletes.

Shared fix: South Carolina's roster is one `roster-card` element wrapping a schema.org athlete `<li>` per player. The reader treated the whole list as one card and gave Peyton Williams's account to the first player (Lex Cyrus); the duplicate-identity guard then rejected both, leaving Football with one athlete. A card linking several players is now skipped, and each `<li itemprop="athlete">` is read on its own.

## Limitations

- Track & Field and Beach Volleyball fill when 2026-27 is published.
- Golf places have no field size (the cards publish none).
- Cross country's Adidas XC Challenge (Sep 18) is not on TFRRS; its card's place and story show.
- gamecocksonline.com refuses requests from Cloudflare's Paris location (HTTP 403 even for robots.txt; US locations get 200, checked Oct 8). **Fixed Oct 8 (user: "Fix the Paris block with a global saved copy"):** the module sets `globalSavedCopy`; each successful build saves the feed in KV (`HIGHLIGHTS` namespace, key `feed:v1:<school>|<sport>|<version>`, at most one write an hour per sport, kept a week), and a location that cannot rebuild and has no copy of its own serves it, labeled `x-sas-cache: saved-global` with its age (`tests/global-saved-copy.mjs`). Before any US location has built a sport under a new version, Paris still fails.

Shared TFRRS fix: the Joe Piane Invitational lists a Gold race after the Blue one, and both share the group "Women's 5K"; the Gold race (no South Carolina runners) emptied the group. A race the school did not run now leaves the group's runners as they are.
