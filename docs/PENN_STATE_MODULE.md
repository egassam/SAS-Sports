# Penn State school module

`src/schools/penn-state.mjs` owns Penn State's gopsusports.com routes, program combinations, verified Instagram pins and its schedule-card reader. The event/result contract, caching, display and generic parsing stay shared.

Penn State was added to the app on October 9, 2026 (17 sports, one PR with Oregon). The catalog listed SIDEARM: gopsusports.com is **WMT, a third card generation** (after Iowa/Vanderbilt's `schedule-item-team` and Nebraska's `schedule-event-item-default`): each card is `schedule-event` (`schedule-event item`), the opponent in `schedule-event-item-team__name`, the day in a `span.schedule-event-date__day`, an upcoming time in a `strong.schedule-event-item-result__label` ("5:00 PM EDT"). `scripts/port-wmt.mjs` ported Nebraska's reader; it read no card until these were added.

## Status (`4.76.2-oregon-penn-state`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 3-2 (Big Ten 0-2) as published |
| Volleyball | `womens-volleyball`, `mens-volleyball` | Labeled; women's 14 finals (4 take their archive story), 10-4 (2-2) as published; men's 2027 not published |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; 12 and 9 finals with stories; 6-2-4 (4-1-2), 2-7 (0-5) as published |
| Field Hockey | `field-hockey` | 10 finals with stories; 6-4 (1-1) as published |
| Hockey | `mens-ice-hockey`, `womens-ice-hockey` | Labeled; women's 4 finals 2-2 (Atlantic Hockey America 2-0) as published; men's start Oct 9 |
| Cross Country | `cross-country` | One card per meet for both teams; both TFRRS team pages (`PA_college_f/m_Penn_State`): Dolan Duals W 1st / M 1st, Spiked Shoe W 2nd / M 3rd, Princeton W 7th, Paul Short M 2nd (the cards' own lines agree) |
| Golf | `womens-golf`, `mens-golf` | Labeled; places from the cards ("8th out of 13") with stories |
| Tennis | `womens-tennis`, `mens-tennis` | Women's ITA All-American and Martha Thorn with stories; men's home invitational with its story |
| Swimming & Diving | `womens-`/`mens-swimming-and-diving` | Labeled; Virginia Tech Invitational scores per opponent as published |
| Fencing, Wrestling, Basketball | `fencing`, `wrestling`, `mens-`/`womens-basketball` | 2026-27 schedules upcoming |
| Baseball, Softball, Lacrosse | `baseball`, `softball`, `womens-`/`mens-lacrosse` | Fall exhibitions upcoming; men's lacrosse 2027 not published |
| Gymnastics, Track & Field | `womens-`/`mens-gymnastics`, `track-field` | Pages still show 2025-26: valid empty schedules until published |

## Penn State rules (beyond Nebraska's reader)

- **Card generation:** the `schedule-event` root, `schedule-event-item-team__name`/`__divider`, span days, strong time slots (above).
- **Season from the title:** field hockey is a fall sport ("2026 Field Hockey"); a title saying "Fall" ("2026 Fall Softball", "2026 Women's Lacrosse Fall Schedule") is this fall; "2026 Men's Volleyball Schedule" is last spring (men's volleyball is not a fall sport).
- **Conference games from the card:** a conference game's card shows its league's logo (`schedule-event__conference`, "--empty" otherwise); women's hockey's is Atlantic Hockey America's (`conference_name`). Bracket games and exhibitions are out of the record.
- **Cross country rows:** a race with a team score is listed before an open race (Paul Short: the men's Gold race, 2nd, before the 8K Open runners; seen on the first preview).
- **Wrestling sessions:** "Session I", "Sessions III & IV" under "Big Ten Championships"/"NCAA Championships" are one event over its days.
- **Fencing championships:** cards named after the host ("Duke University", "Durham, N.C.") take the page's JSON-LD event name ("2027 NCAA National Fencing Championships - Day 1" → one "NCAA National Fencing Championships" event).
- **Brackets read "at":** "Big Ten Quarterfinals", "Semifinal", "Women's College Cup", "Atlantic Hockey America".
- **Internal:** swimming's "Blue & White Meet".
- **Recaps:** a story whose opening names another weekday is not the game's (women's hockey played Ohio State Sep 24 and 25, both 1-2); a multi-day tournament's own card story is bound to it ("ITA All-Americans").
- **Golf story places** name Penn State/Nittany Lions (the port carried Iowa's words).

Every rule was mutated, and every mutation fails `node tests/penn-state-module.mjs`; two ported additions no page exercised (a venue class, a golf course location) were removed.

## Athletes

Three per sport (`scripts/athlete-evidence.mjs`, Oct 9). Pins: Gymnastics (3 of 33 profiles link Instagram), Soccer (10 of 52), Volleyball (4 of 17). **Profile cards** (`athlete_profile_fallback_sports`): Fencing (0 of 39 profiles link Instagram), Golf (0 of 19), Swimming & Diving (0 of 43).

## Limitations

- **Men's tennis ITA All-American (Sep 19-27):** no story (card or archive): not listed (K-State's rule).
- **Not in the app's sport catalog:** rugby (club varsity).
- **Waiting on publication:** Gymnastics, Track & Field, men's Lacrosse, men's Volleyball.
- **Men's volleyball league:** EIVA (named when its cards carry the EIVA logo).
- **Live cards:** not observed yet (volleyball vs Northwestern, men's soccer at Michigan, Oct 9; football vs USC Oct 10).
