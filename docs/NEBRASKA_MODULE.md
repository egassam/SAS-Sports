# Nebraska school module

`src/schools/nebraska.mjs` owns Nebraska's huskers.com schedule and roster routes, its program combinations, its verified Instagram pins and its schedule-card reader. The Worker imports its configuration.

Nebraska was added to the app on October 9, 2026, on its own (the catalog lists it as CUSTOM). All 16 sports were built and tested one at a time and published in one PR. huskers.com is WMT (Nuxt, server-rendered cards) of a **newer card generation** than Iowa's or Vanderbilt's: `schedule-event-item-default__*` names, the day in `schedule-event-date__label` (a tournament has two), the venue in its own chip (`schedule-event-venue__type--home`), and every link, the recap included, in `schedule-event-bottom__link` anchors labeled by their text ("Recap"). The module is Iowa's reader with those names added. Miami and Virginia (ACC) publish the same generation (checked Oct 9): `scripts/port-wmt.mjs` starts a WMT school from this module. The site answers the sandbox directly.

## Status (`4.73.0-nebraska`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 5-0 (Big Ten 2-0), equal to the page; ESPN live score |
| Volleyball | `volleyball` | 18 finals with stories (Florida and SMU exhibitions share one); 16-0 (Big Ten 5-0), equal to the page; ESPN live score |
| Soccer | `soccer` | 13 finals with stories; 3-3-7 (Big Ten 1-2-4), equal to the page; ESPN live score |
| Cross Country | `cross-country` | One page for both teams; 2 finals, both races from TFRRS (`NE_college_f_Nebraska`, `NE_college_m_Nebraska`): Cyclone Preview W 3rd / M 5th, Gans Creek W 6th / M 19th; Greeno Dirksen (canceled) not listed |
| Golf | `mens-golf`, `womens-golf` | Labeled; the card's place, field and team score ("9th/9 (889)" → 9th of 9, 889); 7 finals with stories |
| Rifle | `rifle` | 2 finals with stories (Akron W 4743-4673, at Ohio State W 4730-4675); duals read vs/at, invitationals "at" |
| Swimming & Diving | `swimming-and-diving` | Women only; Iowa State dual W 197-101; Good Life Relays exhibition with its story; intrasquad not listed |
| Tennis | `mens-tennis`, `womens-tennis` | Labeled; the women's ITA All-American and Husker Invitational take their news-list stories; the men's ITA Regional (Oct 7-11) is today's event |
| Bowling | `bowling` | 11 upcoming (from Oct 16) |
| Wrestling | `wrestling` | 18 upcoming (from Nov 8); the Cliff Keen Las Vegas Invitational's two day cards are one event |
| Baseball, Softball | `baseball`, `softball` | Fall games (exhibitions labeled as the site labels them); ESPN live scores |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; exhibitions labeled; postseason rounds read "at"; ESPN live scores |
| Track & Field, Gymnastics | `track-and-field`, `mens-gymnastics`, `womens-gymnastics` | Pages still titled 2025-26: valid empty schedules until 2026-27 is published |
| Beach Volleyball | `beach-volleyball` | Page still titled 2026 (last spring): empty until 2027 is published |

## Nebraska rules (beyond Iowa's)

- **Card names:** the divider (`schedule-event-item-default__divider`), the opponent (`schedule-event-item-default__opponent-name`), the day (`schedule-event-date__label`), the date box (`schedule-event-date`).
- **Recap links:** `schedule-event-bottom__link` anchors, labeled by their text ("Recap"); the aria-label is "<headline> - Recap".
- **Internal and non-events:** baseball's "Red-White Series", softball's "Scarlet vs. Cream" (and the shared scrimmage/intrasquad words); the "NCAA Selection Show" (golf, basketball) and swimming's "Holiday Training Trip".
- **Relations:** a game sport's event-named card reads "at" ("Big Ten Tournament", "First & Second Rounds", "Women's Final Four"); a meet over several days reads "at" ("vs. Mizzou Last Chance Meet"); rifle's matches are duals (vs/at from the divider), its invitationals meets.
- **Golf card results:** "9th/9 (889)", "T4th/11 (852)": place, field and team score.
- **Tournaments under way:** one card over several days (tennis) is today's event "In progress" from its first day to its last; wrestling's day cards of one invitational are merged.
- **Tennis stories:** a past tournament whose card links no story takes the sport's news-list story whose headline names it, dated from its first day to two days after its last; a story dated while the tournament ran (the women's ITA All-American, Sep 24, of Sep 19-27) is checked against its own day. One still without a story is not listed (K-State's rule).

Every rule was mutated; every mutation fails `npm run test:nebraska-module`.

## Athletes

Certification lists all 16 sports (minimum 3). `scripts/athlete-evidence.mjs` (Oct 9) read every profile page; every sport publishes athlete Instagram (Bowling 8 of 12, Golf 9 of 22, Rifle 9 of 10, Cross Country 10 of 28, Baseball 11 of 45, Softball 11 of 21; the rest 16 or more). **Pins:** Baseball, Bowling, Cross Country, Golf, Rifle, Softball (three each). No sport uses profile cards.

## Limitations

- **Waiting on publication:** Track & Field and Gymnastics (pages titled 2025-26) and Beach Volleyball (titled 2026) fill when huskers.com publishes the new seasons.
- **Tennis:** the men's ITA All-American Championships (Sep 19-27; player stories only: "Rafiq Continues On to Qualifying Draw") and Creighton Invite (Sep 26-27; no story) have no team story and are not listed; the UTR Pro Tennis Tour and ITF W15 events are players' pro events (not listed, Texas's rule).
- **Baseball:** the Oct 9 Creighton fall game is not labeled an exhibition on the card (season records leave fall ball out by date).
- **Live cards:** no live card observed yet (volleyball vs Wisconsin Oct 10, football vs Indiana Oct 10).
