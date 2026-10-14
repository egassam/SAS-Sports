# Virginia school module

`src/schools/virginia.mjs` owns Virginia's virginiasports.com routes, program combinations and its schedule-card reader. The event/result contract, caching, display and generic parsing stay shared.

Virginia was added to the app on October 14, 2026 (15 sports, one PR with Miami; the first ACC schools). The catalog lists WMT. virginiasports.com is a **fifth WMT card generation**: Purdue's `schedule-event-item` root and date box (`schedule-event-date__month-day`, no `datetime`: the year follows the page title's season), but the opponent sits in `strong.schedule-default-event__name` with its league in a `schedule-default-event__game-state` span ("NC State (ACC)"). `scripts/port-wmt.mjs --from=purdue` ported Purdue's reader; it read no card until that name box was added. The menu uses short codes (`xc`, `xctrack`, `msoc`/`wsoc`, `mlax`/`wlax`, `fhockey`, …).

## Status (`4.86.3-miami-virginia`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 6 finals with stories; 4-2 (ACC 2-1) as published |
| Volleyball | `wvball` | 15 finals with stories; 5-10 (1-5) as published |
| Soccer | `wsoc`, `msoc` | Labeled; women's 7-3-2 (3-3), men's 7-5-1 (3-2) as published; labeled ESPN boards |
| Field Hockey | `fhockey` | 11 finals with stories; 6-5 (2-4) as published |
| Cross Country | `xc` | TFRRS (`VA_college_f/m_Virginia`): Virginia Invitational W 2nd / M 3rd, Loyola Lakefront W 1st / M 13th; Paul Short (Open races, no team score on TFRRS) individual places |
| Golf | `mgolf`, `wgolf` | Labeled; card places with field ("16th of 18", "T6th of 12"); Canadian Collegiate 1st from its story headline; women's Windy City (Oct 5) has no story (not listed) |
| Tennis | `mten`, `wten` | Labeled; tournaments with stories; Challenger pro events out; men's Liberty Invite and women's ITA All-American have no story (not listed) |
| Swimming & Diving | `swimming` | Meets with stories; session cards ("SCM World Prep Pro Am") one meet |
| Rowing | `wrow` | Fall regattas upcoming, read "at" |
| Basketball | `mbball`, `wbball` | Men's exhibitions (two finals, out of the record); 2026-27 schedules upcoming |
| Baseball, Wrestling | `baseball`, `wrestling` | 2026-27 schedules upcoming |
| Lacrosse, Softball, Track & Field | `mlax`/`wlax`, `softball`, `xctrack` | Pages still show 2025-26 (softball "Fall Ball 2026" with no current games): valid empty schedules until published |

## Virginia rules (beyond Purdue's reader)

- **Card generation:** the opponent in `strong.schedule-default-event__name`; the game-state span is not part of the name.
- **Conference games from the cards' "(ACC)" flags** on a page that flags any; baseball's midweek Virginia Tech game (Mar 23) is unflagged (membership alone would count it).
- **Rowing** regattas read "at" (the cards say "vs.").
- **Swimming:** cards of one name within two days are one meet.
- **Tennis:** "75K Challenger"-style pro events are not team events.
- **Recap link** with "Rec" pasted on its slug (Aug 30 soccer vs Yale, a 404 as published) reads without it.
- **Short names in own-card stories:** "Cal" (field hockey, Oct 4) and "FGCU" (men's soccer, Aug 31).
- **Golf story places** name Virginia/Cavaliers/Hoos; "Leads Virginia to Win" is 1st.
- The Big Ten field-hockey weekend rule from Purdue's reader was removed (the cards flag each game).

Every rule was mutated and each mutation fails `node tests/virginia-module.mjs`.

## Athletes

Three featured athletes with verified Instagram in every sport, from the roster cards and profile pages (no pins). Roster card portraits link the profile with alt "Women's Soccer"; since 4.86.2 the card's title link names the athlete (shared fix).

## Open

- Lacrosse, Softball, Track & Field fill when 2026-27 is published.
- First live cards not yet observed.
