# Maryland Eastern Shore school module

`src/schools/maryland-eastern-shore.mjs` reads umeshawksports.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the MEAC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (8): Baseball, Basketball, Bowling, Cross Country, Golf, Softball, Track & Field, Volleyball.

## Rules

- Baseball plays in the NEC, as the page marks it. Cross country reads the team pages; track reads the indoor and outdoor team pages (`womens-indoor-track`, `mens-indoor-track`, `wot`, `mot`; the outdoor ones labelled by `teamLabels`), all past seasons as of Oct 23. Volleyball reads both teams (men's 2026 is the past spring season). A team that did not race ("DNP": the men at the Salisbury Fall Classic, Sep 5) has no event. A meet named by its host takes TFRRS's name ("Delaware State University Sting Invite"; `hostMeetName`). The 2027 baseball and softball rosters publish no portraits, so profiles without one fill the slots.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the MEAC sponsors football, basketball, softball, volleyball, women's soccer, bowling, tennis, cross country and track, but no baseball (its members play in the NEC, as their pages mark it), lacrosse, swimming, wrestling, hockey, rowing or field hockey.
- Shared MEAC rules (`tests/meac-shared.mjs`): NEC baseball, a site's www host, story headlines in result lines, teams that did not race.

Each rule has a check in `tests/maryland-eastern-shore-module.mjs` (generated page blocks) or `tests/meac-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Bowling, Cross Country, Golf, Softball, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Track & Field and men's volleyball fill when their next seasons are published.
- First live cards not yet observed.
