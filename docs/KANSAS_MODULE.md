# Kansas school module

`src/schools/kansas.mjs` owns Kansas source routes, the selected SIDEARM/Nuxt schedule payload adapter, tournament recap identity, and the existing eight verified athlete-account matches. Its cross-country sport handler remains `src/kansas-cross-country.mjs`; its reviewed golf records are in `src/schools/kansas-golf-results.json`.

## Behavior

- All 12 KU sports have explicit sources. Baseball is restored to the sponsored-sports catalog and UI fallback. Swimming uses the working women's-swimming-and-diving route.
- Basketball and golf load both men's and women's schedules, with labels and separate identities. Other schools retain their existing combination policy.
- Parse the selected schedule object once, excluding unrelated scoreboard and news widgets. Use exact source dates instead of inferring years from headings. The source's end date is retained for tournament matching; invalid end dates before the start are rejected.
- Official event IDs preserve same-day doubleheaders. Past games without published scores are marked pending instead of being carried into upcoming or assigned invented scores. Future cards do not retain stale results.
- KU's exact cross-country snapshots retain Bob Timmons 21 rows and Gans Creek 26 rows, with both team results, all published runners and DNF/DNS. Future unsaved races use the same official race-PDF path for feed and expanded results.
- The September 11, 2026 South Dakota State volleyball card has an exact-identity correction for its erroneous Wichita State recap link. The replacement is fetched and validated normally; later corrected source links remain authoritative.
- Recap matching requires KU's official host, matching sport/opponent/date, and the correct division. Tournament finals match the published end date, including multi-day golf tournaments.
- Four current golf recaps have 22 manually reviewed individual placings. Records require school, sport, event ID, event name, start date, division, exact recap URL, and unchanged athlete/numeric-fact fingerprint. Changed/future articles do not inherit those rows; they retain the normal recap/highlight path. This is not an automatic prose-to-golf-results parser.
- The women's Red Sky schedule incorrectly lists 291 in the team-total field, while its recap lists three rounds (291–283–278). Expanded results display the verified eighth-place/-12 finish and explain this discrepancy; no incorrect total is presented as verified.
- Shared displays, caching, generic publisher adapters, and K-State handlers remain shared/unchanged. Shared orchestration invokes KU handlers through explicit school guards.

## Validation and known source gaps

`npm run test:kansas-module` replays 14 official schedule payloads across 12 sports, including source counts, correct season years, score-zero handling, gender and school isolation, exact IDs, pending results, tournament ends, 14 recap identities, 22 golf placings and verified athlete matching. Fixtures record their source URLs and retrieval date. Existing K-State, KU XC, 18-school protection and 71-cache-identity tests remain enabled.

Current official source gaps: the 2026–27 tennis schedule has ended fall tournaments but no result/recap links; the September 26 softball doubleheader has no published score on the schedule; the track schedule still lists 2025–26 events, which remain excluded from the new season. Future events for swimming, rowing, basketball and baseball are schedules, not missing final results. These limitations must not be described as fresh all-sport result certification. No new Instagram identities were inferred or added.

The older cross-school live audit failed with Cloudflare resource error 1102 before this work. A scoped KU improvement is not evidence that every school's live audit is fixed.
