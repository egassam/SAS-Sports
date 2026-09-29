# Oklahoma State school module

`src/schools/oklahoma-state.mjs` owns Oklahoma State's okstate.com routes, program combinations, the split of the shared cross-country/track schedule, and the two existing verified athlete identities. The Worker imports its configuration and creates its handler with no shared-parser changes. The event/result contract, caching, display and generic SIDEARM parsing remain shared.

## Ownership inventory

| Behavior | Owner |
| --- | --- |
| Explicit schedule routes for all 11 sponsored sports | `oklahomaStateSchool.scheduleUrls` (previously six inline `KNOWN_URLS` entries plus generic fallbacks) |
| Explicit roster routes for all 11 sports | `oklahomaStateSchool.rosterUrls` (previously two inline `KNOWN_ROSTER_URLS` entries plus generic fallbacks) |
| Men's and women's programs loaded and labeled for Basketball, Golf and Tennis | `oklahomaStateSchool.combinedSports` |
| Two cross-country Instagram identities verified by official team-account tags | `oklahomaStateSchool.verifiedInstagrams` |
| Shared `/sports/mxct/` schedule split between Cross Country and Track & Field | `createOklahomaStateHandlers().filterEvents`, called from `parseHtml` only for `oklahoma-state` |
| Generic SIDEARM parsing, roster/profile parsing, social identity guards, official-profile fallback, feed orchestration, cache, UI | Shared Worker (unchanged) |

## Fixes

- **Track & Field no longer shows cross-country meets.** Both sports read the same official `mxct` schedule. A meet named "Cross Country"/"XC" is cross country; a name with indoor/outdoor/relays/track/field/multi-event words is track; otherwise August–November is cross country and December–July is track. Only the okstate.com shared program pages are split. On September 29 all six published meets were cross country, so Track & Field is correctly empty until indoor meets are published.
- **Tennis: both divisions loaded; the feed stays empty because of the source.** Production diagnostic showed the women's page parsing 21 events and the men's page 4. Tennis was not a combined sport for Oklahoma State, so only the women's page was used. Both divisions are now loaded and labeled. The official women's page, retrieved September 29, is still the "2025-26 Cowgirl Tennis Schedule" (21 matches, January 23–April 12, 2026). The preview feed shows the men's 4 events are also outside the 2026–27 season. Tennis is therefore correctly empty until okstate.com publishes the 2026–27 schedule; this is a source gap, not a parser defect.
- **Men's Golf was missing.** Only the women's schedule was loaded. Both golf schedules and rosters are now loaded and labeled.
- **Athlete certification (Tennis, Equestrian, Track & Field).** The app was already returning the official-profile fallback (official okstate.com roster profile, portrait, no Instagram) for rosters that publish no personal links. `tests/validate-schools.mjs` rejected every athlete without Instagram. Oklahoma State's certification entry now lists these three sports in `athlete_profile_fallback_sports`. For those sports only, an athlete may have no Instagram if its profile is an https okstate.com roster URL; any Instagram that is present must still be an Instagram destination. Other schools keep the stricter rule unchanged. `athlete_minimums` now protects Equestrian and Track & Field too. No Instagram accounts were added, inferred or copied between sports.

## Validation

`npm run test:oklahoma-state-module` (also in `npm test` and `npm run test:release`) checks:

- All 11 sponsored sports route to okstate.com through the module; no `oklahoma-state|` configuration remains in `src/index.js`; other schools keep the shared combination policy.
- The six real `mxct` meets (names/dates from the official schedule as served by production on 2026-09-29) all stay in Cross Country and none appear in Track & Field. Track-named and winter/spring meets classify as Track & Field. Other schools, other pages and non-official hosts are not filtered.
- Tennis and Golf orchestration through `fetchLive` loads and labels both divisions (minimal synthetic pages). The real official women's Tennis page (retrieved 2026-09-29, gzipped fixture) parses all 21 published 2025-26 matches and presents none of them as the current season.
- The real official `mxct` and wrestling roster pages (retrieved 2026-09-29, stored gzipped and unmodified) produce the two verified cross-country identities, three profile-only Track & Field athletes that satisfy the fallback rule, and three wrestlers with athlete-bound roster Instagram links and no extra biography fetches.

A before/after route dump across all 219 catalog school/sport combinations changed only three Oklahoma State entries: Golf and Tennis (combined, unused fallbacks removed) and Soccer (unused fallback rosters removed; `womens-soccer` remains first). The verified-identity map is unchanged.

## Known source gaps

- okstate.com's bot protection (Incapsula) returned HTTP 403 to the development sandbox for most downloads on September 29. Only the women's Tennis schedule was obtained as an official schedule fixture. The production and preview Workers were not blocked.
- The women's program (`/sports/womens-cross-country-track/`) is not loaded. The `mxct` roster is 55 men and is already more than the athlete scan budget, so adding the women's roster has no effect without a roster-combination change. Whether the `mxct` schedule contains both divisions' results needs the official HTML.
- Cowboy Jamboree (Sept 26) reports 1 result row versus 31 for Cowboy Preview. Cross-country result completeness has not been diagnosed.
- The men's golf page has no fixture. On the Cloudflare preview it returned both divisions: 5 results and 24 upcoming events, with men's events labeled.
- No deep (recap/highlight) certification has been run for Oklahoma State.

## Preview verification (PR #21, commit `1a55077`)

Branch preview `https://oklahoma-state-module-sas-sports.lovetogivepain.workers.dev` returned `4.29.0-oklahoma-state-module`. Forced feeds:

- **Golf:** both `Men's` and `Women's`, 5 results and 24 upcoming.
- **Cross Country:** the same 6 meets.
- **Track & Field:** no cross-country meets. The standard "no usable events" response is returned because no track meets are published.
- **Tennis:** empty, for the source reason above.

`node tests/validate-schools.mjs --schools=oklahoma-state --base=<preview>` passed 11/11. On the preview, K-State XC kept 18/20 rows and KU XC kept 26/21.
