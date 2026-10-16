# Purdue school module

`src/schools/purdue.mjs` owns Purdue's purduesports.com routes, program combinations, verified Instagram pins and its schedule-card reader. The event/result contract, caching, display and generic parsing stay shared.

Purdue was added to the app on October 14, 2026 (12 sports, one PR with Rutgers). The catalog lists SIDEARM; purduesports.com is **WMT, a fourth card generation**: Nebraska's `schedule-event-item` root and date box (`time.schedule-event-date__day` with its full `datetime`), but the opponent sits in `strong.schedule-default-event__title` (a sponsor line follows in a strong of its own). `scripts/port-wmt.mjs` ported Nebraska's reader; it read no card until that name box was added.

## Status (`4.83.0-purdue-rutgers`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 6 finals with stories; 3-3 (Big Ten 2-1) as published |
| Volleyball | `volleyball` | 17 finals (two exhibitions; TCU and IU Indy link no story and take the archive's when it has one); 10-5 (3-3) as published |
| Soccer | `soccer` | 15 finals with stories; 12-1-2 (6-1-1) as published |
| Cross Country | `cross-country` | One card per meet for both teams; TFRRS (`IN_college_f/m_Purdue`): McNichols W 20th / M 21st, Loyola Lakefront W 1st / M 12th |
| Golf | `womens-golf`, `mens-golf` | Labeled; place, field and team score from the cards ("4th/16 (+29; 293-304-296—893)", "1st / 13 Teams (-4; 1,076)") |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; tournaments with stories; women's ITA Ohio Valley Regional and men's Hope College RSM Invite have no story (not listed) |
| Swimming & Diving | `womens-`/`mens-swimming-diving` | Labeled; women's at Illinois W 167.5-132.5; men's Seminole Fall Classic (two day cards) W 352.5-347.5 |
| Basketball, Wrestling | `mens-`/`womens-basketball`, `wrestling` | 2026-27 schedules upcoming |
| Baseball, Softball | `baseball`, `softball` | Fall exhibitions; softball's six fall finals as published (no stories; fall ball is out of the record) |
| Track & Field | `track-field` | Page still shows 2025-26: valid empty schedule until published |

## Purdue rules (beyond Nebraska's reader)

- **Card generation:** the opponent in `schedule-default-event__title`.
- **Golf card places:** "4th/16 (+29; 293-304-296—893 )" (women's) and "T-10th / 18 Teams (+24; 876)" (men's; a total can carry a comma, "1,076").
- **Golf story places** name Purdue/Boilermakers/Boilers (the port carried Iowa's words).
- **Bracket rounds:** a round card under its tournament's heading ("First Round" under "Big Ten Tournament") reads "at Big Ten Tournament (First Round)".
- **Swimming day cards:** "Ohio State Invite Day 1", "Zones Day 2: 1-Meter" are one meet "at" its host; a two-day dual whose score is on the last day's card keeps that card only.
- **Internal:** baseball's "Black & Gold Series" and its "Halloween Bash", wrestling's "Wrestle-Offs".

Every rule was mutated and each mutation fails `node tests/purdue-module.mjs`; a heading-based intrasquad rule no test needed and a both-teams TFRRS reader (the one-team reader already reads both races from the meet page) were removed.

## Athletes

Three featured athletes per sport. Verified Instagram from the official profile pages: Baseball (40 of 41), Basketball (30 of 32), Football (112 of 117), Swimming & Diving (63 of 67), Wrestling (30 of 31); Golf pinned (8 of 19). **Profile cards** (`athlete_profile_fallback_sports`): Cross Country (21 profiles), Soccer (31), Softball (26), Tennis (21), Track & Field (71), Volleyball (18): their profiles link only the department's team accounts (purduevb, purduesoccer, purduesoftball, purdue_trackxc, purduewtennis …; checked by hand on a volleyball profile, Oct 14), no athlete account.

## Open

- Track & Field fills when 2026-27 is published.
- First live cards not yet observed.

## Athletes from the NIL marketplace (October 16, 2026)

Source: INFLCR Exchange purdue-university (purduesports.com/nil). On the preview (4.105.0), the sports that use profile cards: Cross Country 1 of 3 with Instagram (1 from the marketplace); Soccer 2 of 3 with Instagram (2 from the marketplace); Softball 3 of 3 with Instagram (3 from the marketplace); Tennis 2 of 3 with Instagram (2 from the marketplace); Track & Field 2 of 3 with Instagram (2 from the marketplace); Volleyball 2 of 3 with Instagram (2 from the marketplace). A slot still short keeps its official profile card, and the profile-card fallback stays listed (the athletes tried vary by day). Athletes connect these accounts themselves; the app uses one only for an athlete on the current official roster whose marketplace record names the same athlete and sport (`src/opendorse.mjs`, `src/inflcr.mjs`).
