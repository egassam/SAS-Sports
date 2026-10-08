# Vanderbilt school module

`src/schools/vanderbilt.mjs` owns Vanderbilt's vucommodores.com schedule and roster routes, its program combinations, its verified Instagram pins and its schedule-card reader. The Worker imports its configuration.

Vanderbilt was added to the app and converted on October 8, 2026, together with South Carolina. All 12 sports were built and tested one at a time and published in one PR. vucommodores.com is WMT (Nuxt); the module is Auburn's card reader (`scripts/port-handlers.mjs --from=auburn`), adapted to Vanderbilt's `schedule-item-block` cards.

## Status (`4.67.1-south-carolina-vanderbilt`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals, each with its story; 3-2 (SEC 0-2), equal to the page's published record; ESPN live score |
| Volleyball | `wvolley` | 13 finals (9 with their card's story, 3 from the sport's news list; Kentucky, Sep 23, has none published, only a preview); 11-2 (SEC 2-2), equal to the published record; ESPN live score |
| Soccer | `wsoc` | 12 finals, each with its story; 11-0-1 (SEC 4-0-1), equal to the published record; ESPN live score |
| Cross Country | `mcross`, `wcross` | Labeled by team; 2 finals each, each team's own place and points from TFRRS (`TN_college_f_Vanderbilt`, `TN_college_m_Vanderbilt`) |
| Golf | `mgolf`, `wgolf` | Labeled; men's round cards merged into tournaments, placed by the last round ("T6th of 18"); 3 finals each with their stories |
| Swimming & Diving | `wswim` | Florida dual (L, 55-206) with its story; SEC Championships' day cards are one meet |
| Tennis | `mten`, `wten` | Labeled; ITA Regionals in progress; players' pro events (ATP) left out |
| Bowling | `wbowl` | 11 upcoming tournaments (season opens Oct 16) |
| Basketball, Baseball | | Upcoming (exhibitions labeled); ESPN live scores |
| Lacrosse, Track & Field | `wlax`, `wtrack` | Pages still show 2025-26: empty until 2026-27 is published |

## Vanderbilt rules (beyond Auburn's)

- **Cards:** `schedule-item-block`; the date box is `schedule-item-block__date` (full `datetime`), the heading `schedule-item-team__heading` holds the divider, the ranking (`schedule-item-team__ranking`, "##21/20") and the opponent; `schedule-item-team__label` "Exhibition" marks an exhibition; times read "2:30 p.m.".
- **Golf:** round cards "Visit Knoxville Collegiate • Rounds 1 & 2", "• Round 3", "• Match Play • Semifinals" are one tournament; a tournament played by individuals only ("(Individuals)") is not listed. Every golf, cross country, track and bowling event reads "at".
- **Last season's page** (title "2025-26") is empty, not last summer's meets.
- **Swimming:** dual scores without decimals ("55.0" → 55); a multi-day meet's day cards are one event.
- **Stories without a card link:** the sport's news list (`/sports/<slug>/news`, no `/archives` page); Vanderbilt's headlines rarely name the game ("Relentless Run"), so the story's opening must name the opponent and the result ("a 3-1 loss to Missouri"; a 3-0 "sweeping Lipscomb").
- **Cross country:** each team's page is its own event and keeps its own TFRRS race (Arkansas's rule).

Every rule was mutated; every mutation fails `npm run test:vanderbilt-module`.

## Athletes

Certification lists all 12 sports (minimum 3). `scripts/athlete-evidence.mjs` (Oct 8) read every profile page: Baseball 39/40, Basketball 27/29, Swimming & Diving 29/30 and Volleyball 18/18 publish athlete Instagram. Football (118 profiles), Cross Country (20), Golf (19), Lacrosse (37), Soccer (27), Tennis (18) and Track & Field (48) publish none: official profile cards fill them (`athlete_profile_fallback_sports`). Bowling's profiles publish two accounts inside a doubled address (`instagram.com/https://www.instagram.com/lindsaygreim.bowling/`), which the roster-card reader recovers; both are also pinned and a profile card fills the third slot.

Shared fix: Merritt Zieminick's profile links `instagram.com/merritt%20_zieminick` (a broken address). The card reader took its valid prefix, `merritt`, which is another person's account; a handle must now end the address, and profile pages accept only valid handles. Every sport shows three athletes (checked against the live site, Oct 8).

## Limitations

- Lacrosse and Track & Field fill when 2026-27 is published.
- Bowling's first results come with its Oct 16 tournament.
