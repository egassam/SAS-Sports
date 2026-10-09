# Northwestern school module

`src/schools/northwestern.mjs` owns Northwestern's nusports.com routes, program combinations, verified Instagram pins and its WMT card reader. The event/result contract, caching, display and generic parsing stay shared.

Northwestern was added to the app on October 9, 2026, with Minnesota. All 14 sports were built and tested one at a time and published in one PR (#280). The catalog lists nusports.com as SIDEARM; it is **WMT** (server-rendered cards `schedule-event-item__*`, the generation Auburn's and Texas A&M's reader reads). `start-schools` ported Nebraska's reader by default; it was re-ported from Auburn's (`scripts/port-wmt.mjs --from=auburn`).

## Status (`4.74.1-minnesota-northwestern`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 4 finals with stories (3-1); ESPN live score |
| Volleyball | `womens-volleyball` | 15 finals with stories; ESPN live score |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; women's 14 finals (the Sep 20 draw at Minnesota from the archive), men's 10; ESPN live scores |
| Field Hockey | `field-hockey` | 12 finals with stories (12-0); ESPN live score |
| Cross Country | `womens-cross-country` | Women only; TFRRS (`IL_college_f_Northwestern_IL`): Badger 2nd, McNichols 5th, Loyola Lakefront 3rd |
| Golf | `womens-golf`, `mens-golf` | Labeled; places from the final story (women 2nd, 9th, 9th; men 9th, 12th, 4th); Kemper Lakes (individuals only, no story) not listed |
| Fencing | `womens-fencing` | Remenyik ROC/RJCC "Completed" with its story; October NAC under way |
| Swimming & Diving | `womens-`/`mens-swimming-and-diving` | Labeled; Miami (OH) duals W 230-87, W 187-130 |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; women's ITA Regional under way; past ITA All-American and Spartan Invite have no story (archive checked): not listed |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; 2026-27 upcoming |
| Softball | `softball` | Fall games upcoming |
| Wrestling | `wrestling` | 2026-27 upcoming |
| Baseball, Lacrosse | `baseball`, `womens-lacrosse` | Pages show 2026 with no games: valid empty until 2027 is published |

## Northwestern rules (beyond Auburn's)

- **Routes:** cross country and fencing are women's pages (`womens-cross-country`, `womens-fencing`); `port-wmt` now finds such one-team menu routes.
- **Golf place:** the cards publish none; the final story's headline gives it ("Runner-Up Finish", "in Ninth", "Take Fourth Place"), or, when the headline names a player, the story's sentence whose subject is the team ("the 'Cats ... in 12th place", "the Northwestern women's golf team finished the event in ninth").
- **Recaps:** a card's own story may be a roundup up to two days after the match ("Cats Split Matches in Allstate Big Ten/SEC Challenge", Sep 5, for Sep 3 and 4); a meet's story may drop its event word ("OFCC Fighting Illini Invitational" for the "Olympia Fields Fighting Illini Collegiate").
- **"at":** fencing events and tennis events named "Sectional"/"Masters".
- **Scores:** men's swimming writes "187.0-130.0": shown as "187-130".

Every rule was mutated, and every mutation fails `npm run test:northwestern-module`.

## Athletes

Three per sport (`scripts/athlete-evidence.mjs`, Oct 9). **Pins:** Golf (6 of 19 profiles), Softball (8 of 23), Volleyball (7 of 18), Tennis (1 of 24). **Profile cards:** Tennis's remaining two slots (24 profiles, one Instagram link).

## Limitations

- **Waiting on publication:** Baseball and Lacrosse fill when nusports.com publishes 2027; women's tennis ITA All-American and Spartan Invite list when a story is published.
- **Live cards:** no live card observed yet (field hockey vs Iowa, volleyball at Penn State, Oct 9).
