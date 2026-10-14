# UCLA school module

`src/schools/ucla.mjs` owns UCLA's uclabruins.com routes, program combinations, verified Instagram pins and its schedule-card reader. The event/result contract, caching, display and generic parsing stay shared.

UCLA was added to the app on October 14, 2026 (15 sports, one PR with USC). The catalog lists SIDEARM; uclabruins.com is **WMT** with Iowa/Vanderbilt's `schedule-item-block`/`schedule-item-team` cards, whose heading names the sport first as a link (`schedule-item-team__sport`, "Football"). `scripts/port-wmt.mjs` ported Nebraska's reader (it reads both generations).

## Status (`4.84.1-ucla-usc`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 5-0 (Big Ten 3-0) as published |
| Volleyball | `womens-volleyball` | 17 finals with stories; 13-4 (4-2) as published |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; 10-3-1 (7-1) and 7-1-4 (3-1-2) as published |
| Water Polo | `mens-water-polo`, `womens-water-polo` | Men's 17 finals, 16-1 as published; the cards name no league, so MPSF 1-1 is not shown; women's 2027 not published |
| Cross Country | `cross-country` | TFRRS (`CA_college_f/m_UCLA`): UCR/UCLA Dual (individuals), Saint Mary's W 5th / M 7th, Nuttycombe W 27th / M 22nd |
| Golf | `womens-golf`, `mens-golf` | Labeled; places from the cards ("3rd/11 (+27, 891)", "8th (+33, 897)") |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; ITA All-Americans and Sherwood with stories; USTA SoCal (women) and UCSB Fall Classic (men) have no story (not listed) |
| Swimming & Diving | `womens-swimming-and-diving` | Upcoming; "Blue vs. Gold" intrasquad out |
| Basketball | `mens-`/`womens-basketball` | 2026-27 schedules |
| Baseball, Softball, Beach Volleyball, Gymnastics, Rowing, Track & Field | | Pages still show 2025-26 or spring 2026: valid empty schedules until published |

## UCLA rules (beyond Nebraska's reader)

- **Card heading:** the sport link (`schedule-item-team__sport`) is not part of the opponent's name.
- **Golf card places:** "8th (+33, 897)", "T-6th/12 (+3, 867)".
- **TFRRS:** a home dual is named for both schools ("UCR UCLA Dual"); TFRRS can date a meet a day before the card (Sep 3 vs Sep 4): the day before is read too.
- **Recaps:** a tournament's own story may come three days after its last day (men's tennis, Sep 30); a story whose opening names another weekday is not the game's (volleyball at Miami, Friday and Saturday, both 3-0; at and vs Long Beach State, Aug 28-29).
- **Internal:** swimming's "Blue vs. Gold".

Every rule was mutated and each mutation fails `node tests/ucla-module.mjs`; a volleyball sets-in-words rule the weekday rule made redundant was removed.

## Athletes

Three featured athletes per sport. Verified Instagram from profile pages for Basketball, Cross Country, Football, Golf, Gymnastics, Soccer, Softball, Track & Field, Volleyball; pinned: Beach Volleyball (5 of 19), Tennis (9 of 18), Water Polo (12 of 64). **Profile cards:** Baseball (41 profiles, 0 links), Rowing (67, 0), Swimming & Diving (29, 0).

## Open

- Baseball, Softball, Beach Volleyball, Gymnastics, Rowing, Track & Field and women's Water Polo fill when 2026-27 is published.
- Men's water polo's MPSF record: the cards carry no league mark.
- First live cards not yet observed.
