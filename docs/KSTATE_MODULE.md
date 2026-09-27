# K-State school module

`src/schools/kstate.mjs` owns the existing K-State-specific backend policies. The Worker imports its configuration and creates its handlers with shared parsing utilities and transport. This preserves the existing event/result contract without a circular import.

## Ownership inventory

| Behavior | Owner after extraction |
| --- | --- |
| Six explicit schedule overrides: cross country, track and field, soccer, volleyball, football, rowing | `kstateSchool.scheduleUrls` |
| Three already-verified tennis Instagram identity matches | `kstateSchool.verifiedInstagrams` |
| Institutional Instagram exclusion | `kstateSchool.blockedInstagramHandles` contributes to the shared denylist |
| Five exact soccer recaps, highlights and stats | `kstateSchool.verifiedGameDetails`; common exact-event lookup remains shared |
| Original Platte River meet snapshot and its four highlights | Module-private snapshot and `applyVerifiedMeet` |
| Cross-country school/event guard, labeled recap parser, completeness check and enrichment | `createKStateHandlers` |
| Remaining schedule candidates and all roster candidates | Existing shared sport paths; K-State had no roster overrides |
| Common SIDEARM/WMT schedule and roster parsing, recap identity check, football scoreboard, image/social validation | Shared Worker utilities; these serve multiple schools |
| School catalog, sponsored-sports guard, browser fallback, theme and initial school | Shared metadata/display; unchanged |
| Feed, expanded-result orchestration, caching and UI | Shared; existing K-State call sites now invoke module handlers |

Baseball, basketball, golf and tennis keep their inherited schedule candidates. All ten sponsored sports keep identical schedule and roster URL order. No roster verification was broadened and no new social accounts were added.

## Contract and maintenance

- Module configuration keys include the exact `kstate` school identity.
- Saved events keep exact school, sport, date and opponent keys.
- Cross-country handlers reject other schools/sports, non-meet events and non-final events.
- Both the feed and expanded results use the same recap handler, preserving both divisions and explicit partial-source status.
- Shared functions are injected once; construction performs no fetches. Transport is injected so tests cannot silently contact the network.
- Keep generic publisher logic shared. Add genuinely K-State-specific formats inside this module and test against official source fixtures.
- Static source checks now inspect the module for moved records. Runtime tests also exercise the assembled Worker, so disconnected configuration cannot pass solely by existing in a file.

## Validation

`npm run test:kstate-module` checks frozen pre-extraction outputs from application commit `19ec2ecb2ac03b8c7d242cb14a23146878857ab0`: ten sport schedule/roster routes, five soccer enrichments, three tennis accounts through the actual featured-athlete path, school/event isolation, institutional-account rejection and independent meet snapshots. It runs in both `npm test` and `npm run test:release`.

Existing `tests/kstate-cross-country.mjs` still verifies Gans Creek's 18 rows, Platte River's 20 rows, feed/modal parity, future matching recaps, incorrect school/date/opponent rejection and partial/unavailable sources. Existing KU and 18-school isolation checks remain enabled.

During extraction, a before/after comparison also checked 218 catalog school/sport schedule and roster route combinations and all existing source, social and saved-game maps. Saved official K-State HTML was replayed through `fetchLive` and expanded-result enrichment with equal output apart from execution timestamps. This verifies refactor parity, not live correctness for every sport or future publisher layout.
