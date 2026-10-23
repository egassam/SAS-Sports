# Murray State school module

`src/schools/murray-state.mjs` reads goracers.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Missouri Valley (ported from Richmond's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (15): Baseball, Basketball, Beach Volleyball, Bowling, Cross Country, Football, Golf, Rifle, Rowing, STUNT, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Football plays in the Missouri Valley Football Conference, rifle in the Ohio Valley Conference. Beach volleyball (`bvb`), bowling, rowing and STUNT are in the menu but their pages and rosters are SIDEARM's empty "@season" template (valid empty schedules); men's tennis (`menstennis`) is the template too, so tennis reads the women's page. Pre-Nationals, named by its host ("Indiana State"), reads as the Under Armour Pre-National Invitational (its story). Men's basketball's page counts an Oct 22 game at FIU (1-0); the app's season rule leaves out basketball before November, so the app shows no record yet.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Shared Missouri Valley rules (`tests/missouri-valley-shared.mjs`): golf duals told by their story, bowling places with a match record, classic tournament headers cut at " | ", splash pages without the splash link; the Missouri Valley sponsors no football, gymnastics, wrestling, rifle, bowling, beach volleyball, rowing or STUNT.

Each rule has a check in `tests/murray-state-module.mjs` (generated page blocks) or `tests/missouri-valley-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23) except the men's basketball game noted above.

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Basketball, Cross Country, Football, Golf, Rifle, Softball, Tennis, Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23 (84 checks for the eight schools, none failed).

## Open

- Beach volleyball, bowling, rowing, STUNT and men's tennis fill when published; their rosters are templates, so they are off the athlete list until then.
- First live cards not yet observed.
