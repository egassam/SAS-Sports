# K-State school module

`src/schools/kstate.mjs` owns the existing K-State-specific backend policies. The Worker imports its configuration and creates its handlers with shared parsing utilities and transport. This preserves the existing event/result contract without a circular import.

## Ownership inventory

| Behavior | Owner after extraction |
| --- | --- |
| Explicit schedule overrides, including separate men’s/women’s Basketball and Golf sources | `kstateSchool.scheduleUrls` |
| Independent Football and men’s/women’s Basketball scoreboard configuration | `kstateSchool.liveScoreboards`; shared parsing/reconciliation remains in the Worker |
| Three already-verified tennis Instagram identity matches | `kstateSchool.verifiedInstagrams` |
| Institutional Instagram exclusion | `kstateSchool.blockedInstagramHandles` contributes to the shared denylist |
| Five exact soccer recaps, highlights and stats | `kstateSchool.verifiedGameDetails`; common exact-event lookup remains shared |
| Original Platte River meet snapshot and its four highlights | Module-private snapshot and `applyVerifiedMeet` |
| Cross-country school/event guard, labeled recap parser, completeness check and enrichment | `createKStateHandlers` |
| Remaining schedule candidates and all roster candidates | Existing shared sport paths; K-State had no roster overrides |
| Common SIDEARM/WMT schedule and roster parsing, recap identity check, scoreboard parsing/reconciliation, image/social validation | Shared Worker utilities; these serve multiple schools |
| School catalog, sponsored-sports guard, browser fallback, theme and initial school | Shared metadata/display; unchanged |
| Feed, expanded-result orchestration, caching and UI | Shared; existing K-State call sites now invoke module handlers |

Basketball and Golf now enumerate their K-State men’s and women’s schedule pages explicitly and label every merged event by division. Baseball and tennis keep their inherited schedule candidates. No roster verification was broadened and no new social accounts were added.

Football and Basketball live state is read from a short-cache ESPN scoreboard independently of the school schedule. Football has one provider; Basketball has separate men’s and women’s providers. Official K-State pages remain the schedule and recap source of record. Matching scoreboard state replaces only status, score, clock/detail and live provenance; a scoreboard-only event is retained if the school page fails to supply it. ESPN’s public JSON endpoint is not a contracted feed, so a licensed provider such as Sportradar or SportsDataIO remains the upgrade path if a formal availability guarantee is required.

## Contract and maintenance

- Module configuration keys include the exact `kstate` school identity.
- Saved events keep exact school, sport, date and opponent keys.
- Cross-country handlers reject other schools/sports, non-meet events and non-final events.
- Both the feed and expanded results use the same recap handler, preserving both divisions and explicit partial-source status.
- Shared functions are injected once; construction performs no fetches. Transport is injected so tests cannot silently contact the network.
- Keep generic publisher logic shared. Add genuinely K-State-specific formats inside this module and test against official source fixtures.
- Static source checks now inspect the module for moved records. Runtime tests also exercise the assembled Worker, so disconnected configuration cannot pass solely by existing in a file.

## Validation

`npm run test:kstate-module` checks frozen pre-extraction outputs from application commit `19ec2ecb2ac03b8c7d242cb14a23146878857ab0`: ten sport schedule/roster routes, five soccer enrichments, three tennis accounts through the actual featured-athlete path, school/event isolation, institutional-account rejection and independent meet snapshots. It also checks both Basketball/Golf divisions and historical independent live-score payloads, including K-State identity, score/detail parsing and men’s/women’s reconciliation isolation. It runs in both `npm test` and `npm run test:release`.

Existing `tests/kstate-cross-country.mjs` still verifies Gans Creek's 18 rows, Platte River's 20 rows, feed/modal parity, future matching recaps, incorrect school/date/opponent rejection and partial/unavailable sources. Existing KU and 18-school isolation checks remain enabled.

During extraction, a before/after comparison also checked 218 catalog school/sport schedule and roster route combinations and all existing source, social and saved-game maps. Saved official K-State HTML was replayed through `fetchLive` and expanded-result enrichment with equal output apart from execution timestamps. This verifies refactor parity, not live correctness for every sport or future publisher layout.

The September 28 releases passed `npm run test:release`, `npm test`, `git diff --check`, a Wrangler deployment dry-run, the 18-school protected guard, and all 71 critical cache-identity checks. Production verified both Golf divisions and healthy Football/Basketball feeds on `4.28.0-kstate-live-scores`. No K-State game was live during the final check, so the actual in-game transition remains covered by deterministic historical scoreboard fixtures rather than a same-session live contest.

## Volleyball live scores (`4.37.2-kstate-volleyball-live`, October 1, 2026)

User request during the K-State vs BYU match: live results on the K-State Volleyball page. K-State Volleyball now has an independent live scoreboard, ESPN's `volleyball/womens-college-volleyball`, in `kstateSchool.liveScoreboards`. It uses the same path as Football and Basketball. The official kstatesports.com schedule stays the schedule and results source of record; the scoreboard only makes today's card Live (`official_schedule+live_scoreboard`).
- **Score.** The score is sets won. While live, the headline adds the current set's points: `1st Set · 2-1`.
- **Final.** A final from the scoreboard reads like K-State's results: `W, 3-1` with one Result row. The volleyball rule is gated to Volleyball, so Football and Basketball output is unchanged.

Fixture: `tests/fixtures/kstate-module/volleyball-espn-live-2026-10-01.json.gz`, the K-State vs BYU event as ESPN served it at 23:35 UTC (in progress, 1st set 2-1). The final case changes only its status and set totals.

**Scoreboard user agent.** On the preview, no live card appeared. ESPN's edge (Akamai) returns 403 to any user agent carrying a web address. That includes the app's identity since PR #85 (`…; +https://…/bot`), and the same string with an `/about` link. As a result, K-State's Football and Basketball live scores had also been failing silently since PR #85. With the user's approval ("Do one", October 1), ESPN scoreboard requests now send `Mozilla/5.0 (compatible; SAS-Sports/<version>)`: the same product name, no link, not a browser identity. School-site downloads keep the full identity with the `/bot` link. `tests/regression.mjs` checks both.

**Nickname-only matches refused.** Once ESPN responded, the preview showed a phantom "Sep 30 · K-State vs Stonehill · W, 3-0". The shared `scoreboardTeamMatchesSchool` matched on `team.name` (the nickname), and K-State's catalog aliases include "Wildcats", so ESPN's New Hampshire Wildcats counted as K-State. The same bug would hit Arizona, Kentucky, Northwestern and Villanova. It had been masked since PR #85 because every ESPN request was refused. A school now matches only on ESPN's location, full or short name, or abbreviation, never on a one-word nickname alias. Fixture: the real Sep 30 New Hampshire vs Stonehill event.

**Set points on the live card (`4.37.3`).** The user's screenshot showed only "LIVE · 1st Set" and `0–0`. The live card displays `recency_label` and sets won, and never `headline`. The current set's points now go in `recency_label` too, so the card reads `LIVE · 1st Set · 14-15`. During a live game the page re-fetches every 30 seconds (`LIVE_REFRESH_MS`).

**Live card and refresh (`4.37.4-live-refresh-15s`).** The user still saw `0–0`: sets won stay 0–0 for the whole first set. While live, the big score now shows the current set's points (`18–21`), and the status line carries sets won (`1st Set · Sets 0-0`). Finals keep sets won (`W, 3-1`). At the user's request the page re-fetches live games every 15 s (was 30 s). A feed with a live game now counts as fresh for 10 s instead of 25 s (`x-sas-live` on the stored feed), so the server does not hold a score longer than the page polls. School pages stay cached by `source-fetch`, so this adds no school downloads.

**Live score over the saved schedule (`4.37.6-live-over-saved-schedule`).** After #115, one forced K-State Volleyball refresh returned 0 results and 0 upcoming: only the ESPN game. A one-off kstatesports.com failure had left the scoreboard as the only source, and that one-game feed was saved over the full schedule. Before ESPN worked again, such a failure returned an error and the app showed the saved copy. Now, when every official page fails:
- the live score is laid over the last good full feed (reconciled by date, as usual);
- that partial feed is never saved as the last good copy;
- with no saved copy, the request is unavailable rather than a one-game feed.

This is shared code; `tests/last-good-feed.mjs` drives the real feed route.
