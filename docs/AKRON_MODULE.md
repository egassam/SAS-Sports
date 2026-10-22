# Akron school module

`src/schools/akron.mjs` reads gozips.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the MAC (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Cross Country, Football, Golf, Lacrosse, Rifle, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball.

## Rules

- Golf is women's golf only (`/sports/womens-golf`); the men's page is the 2019-20 schedule (program ended).
- Football's open week ("Week 9 - BYE WEEK") is no game.
- Rifle: a past meet with no result line and no story (the Zippy Open, Sep 11-13 and Sep 18-20) is not listed (K-State's rule); duals read with both aggregates ("L, 4673-4743").
- Volleyball's Aug 29 match with Auburn links the Liberty match's story (the school's own link; kept as published).
- Shared MAC rules (`tests/mac-shared.mjs`): golf card places beside the team's scores (`golfCardPlace`); the MAC sponsors no hockey, rowing or rifle (no MAC record in those); opponents "Miami (Ohio)", "Miami University (OH)", "Massachusetts" count as MAC members; a neutral "MAC Championship" reads "at"; promotion suffixes ("(Alumni Game)") and a leading season year leave names; scored swim duals inside a meet keep their opponents.

Each rule has a check in `tests/akron-module.mjs` (generated page blocks plus hand checks) or `tests/mac-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

No NIL marketplace linked; roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Football, Golf, Lacrosse, Rifle, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Track & Field, Baseball, Softball and Lacrosse fill when published.
- First live cards not yet observed.
