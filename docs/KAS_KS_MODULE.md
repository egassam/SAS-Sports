# Kansas Approved Schools state meet teams (Christ Prep, Veritas Christian, Kickapoo Nation, KC Metro Academy)

User, October 29, 2026: "Is there any other schools in that race that we could add to the app? This could be determined from last year's results", then "Add the four schools".

The race is the KAS State X-C Championship (Kansas Approved Schools; run by LetsGoRun Timing, posted to AthleticLIVE). Flint Hills Christian and St. Mary's Academy were already in the app (`docs/RILEY_POTTAWATOMIE_KS_MODULE.md`). The 2025 meet (AthleticLIVE 58501) also ran these four, plus seven homeschool associations that were not added (Wichita Defenders, Northeast Kansas Nighthawks, Smoky Valley Home Educators, Wichita Warriors, Central Kansas Homeschool Athletics Association, Christian Family Educators, Newton Home Educators Association). The 2026 meet (79638, Oct 31) had no entries posted on October 29.

Code: `src/schools/kas-ks.mjs`; the meet's team names in `LETSGORUN_MEETPRO.athleticLive` (`src/schools/manhattan-ks.mjs`); Worker path `fetchHighSchool` (`maxprepsOnly`) in `src/index.js`. Test: `tests/kas-ks-module.mjs` (fixtures `tests/fixtures/kas-ks/`, MaxPreps pages of October 29) and `tests/athletic-live-xc.mjs`.

## Schools

| School | id | County · town | Sports | MaxPreps |
| --- | --- | --- | --- | --- |
| Christ Preparatory Academy (Patriots) | `christ-prep-ks` | Johnson · Lenexa | Football, Volleyball, Soccer (boys fall, girls spring), Basketball (girls, boys), Cross Country | `af82426a-…` `lenexa/christ-prep-academy-patriots` |
| Veritas Christian School (Eagles) | `veritas-christian-ks` | Douglas · Lawrence | Volleyball, Basketball (girls, boys), Cross Country | `6536123d-…` `lawrence/veritas-christian-eagles` |
| Kickapoo Nation School (Warriors) | `kickapoo-nation-ks` | Brown · Powhattan | Cross Country | `3be5f852-…` `powhattan/kickapoo-nation-warriors` |
| KC Metro Academy (Metro Academy Mavericks) | `kc-metro-academy-ks` | Johnson · Olathe | Volleyball, Basketball (boys), Cross Country | `ce052af2-…` `shawnee-mission/metro-academy-mavericks` |

KC Metro Academy is a homeschool sports program for the Kansas City area (kcmetromavs.org; PO Box in Olathe, practices in Lenexa), not a school; it is listed because the user asked for it. Counties follow the towns (the Census geocoder answered 502 on October 29). MaxPreps ids are the school ids in its mascot image paths (checked against Flint Hills Christian's). Colors are MaxPreps' `color1`/`color2`.

## Sources (checked October 29)

- **MaxPreps:** the schedule and the scores for every game sport. A school with no calendar and no Bound page is read as `maxprepsOnly`: finals from MaxPreps, coming games, and past games with no score ("No score posted", `AGENTS.md` 5c). Contests with no opponent (playoff slots) are not listed. MaxPreps' team row carries the home/away type (index 11: 0 home, 1 away, 2 neutral; it agrees with every game summary on Manhattan's and Christ Prep's pages); `contestRelation` now reads it first, since a summary names the school as MaxPreps does ("Christ Prep Academy"). The source route (`/api/source`) now allows `maxpreps.com` for surveys.
- **AthleticLIVE (LetsGoRun Timing):** the KAS state meet for cross country, the only cross country meet any of the four publishes. 2025: Christ Prep won both races (boys 1st of 7, girls 1st of 6); KC Metro girls 6th of 6; Veritas 6 runners and Kickapoo Nation 1 runner without a team score.
- **Bound:** none of the four appears on St. Mary's Academy's or Flint Hills Christian's Bound events as an opponent with a Bound school; Bound refused part of the survey reads with 403 (spaced retries answered again). Not used.
- **School sites:** web searches found no official athletics schedule for Christ Prep or Veritas Christian (search results were MaxPreps, SI and NFHS Network pages); kickapoonationschool.org's events page (Squarespace) lists only spring 2025 golf; kcmetromavs.org lists sports but no schedule.

## Not published (not open items, `AGENTS.md` 5c)

- **Kickapoo Nation:** no 2026-27 game on MaxPreps (volleyball, basketball, baseball, wrestling pages empty) and no current events on its own site. Only the state meet is listed.
- **MaxPreps teams with no 2026-27 game:** Christ Prep boys volleyball, baseball, softball, wrestling, track; Veritas football, soccer, baseball, softball, wrestling, track; KC Metro girls basketball. Added when a season is posted.
- **Cross country meets other than state:** MaxPreps' cross country pages list none; no other timer page found. Each school's cross country is the state meet.
