# Missouri school module

`src/schools/missouri.mjs` owns Missouri's mutigers.com schedule and roster routes, its program combinations, its verified Instagram identities and its schedule-card reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Missouri was added to the app and converted on October 8, 2026, together with Tennessee (user: "Add Missouri and Tennessee. Learn and optimize for faster onboarding"). All 13 sports were converted and tested one at a time, then published in one PR (#250). The catalog lists mutigers.com as SIDEARM, but the site is WMT (Nuxt). The module therefore uses LSU's card reader, copied with `scripts/port-handlers.mjs`, plus Missouri's rules below. mutigers.com answers the sandbox directly. The fixtures are the official pages, unmodified.

## Status (`4.63.0-missouri-tennessee`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals, each with its story; record 4-1 (SEC 1-1) as published; ESPN live score |
| Volleyball | `womens-volleyball` | 15 finals, each with its story; 8-7 (1-2) as published; ESPN live score |
| Soccer | `womens-soccer` | 13 finals: the Aug 5 Lindenwood exhibition is labeled; 3-7-2 (0-4-1) as published. Arkansas (Oct 2) has no story on its card, so it shows the score without highlights |
| Cross Country | `cross-country` | 3 finals with both teams' places and points from TFRRS (`MO_college_f_Missouri`, `MO_college_m_Missouri`) |
| Golf | `mens-golf`, `womens-golf` | Labeled. Place from the card (`5th of 13`; `1st` with team score `842`); the card's Final Recap |
| Tennis | `womens-tennis` | Women's only. Husker Invitational day cards merged into one event; 49er Invite; each with its last story |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; exhibitions labeled; upcoming; ESPN live scores |
| Baseball, Softball | `baseball`, `softball` | Fall exhibitions labeled; 2027 spring season; ESPN live scores |
| Swimming & Diving | `swimming-and-diving` | One page for both teams; first meet Oct 9 |
| Wrestling | `wrestling` | First dual Nov 2 |
| Gymnastics, Track & Field | `womens-gymnastics`, `track-and-field` | The pages list no events yet; they fill when published |

## Missouri rules (beyond LSU's)

- **Day box:** the day sits in `schedule-event-date__day` (LSU's is in `__month-day`).
- **Recap links:** golf's links carry no recap class. Their labels name them ("Final Recap", "Day 1 Recap", "Round 2 Recap"). The final story is taken. A round's story is used only when the card links no other: ANNIKA's "Final Recap" points to a preview page, so the Round 2 story is used.
- **Golf place:** from the card's result text: `5th of 13`, or `1st (842)` (the place and the team score).
- **Tennis day cards:** cards named "Day One", "Day Two"… under a tournament heading ("Husker Invitational") become one event with the last day's story.
- **Rankings:** two polls are written as `#24/#RV Mississippi State`.
- **Exhibitions:** the card's `schedule-event-exhibition` marker adds "(Exhibition)". The official record leaves these games out, so soccer's computed record equals the published 3-7-2.
- **Home meets:** a meet named after an event ("vs. Gans Creek Classic", "vs. Mizzou Invite") reads "at". A two-day swimming dual ("vs. Missouri State") stays "vs".
- **Recap matcher:** a headline that names the opponent inside an event name ("Bowling Green/Toledo Invitational") is not that opponent's story.

Each rule was mutated, and every mutation fails `npm run test:missouri-module`. Three rules were dropped because they were redundant: other rules already gave the same output (card datetime years, sorting recap labels, a fixed list of open-meet sports).

## Athletes

Certification lists all 13 sports (minimum 3). On October 8, every roster and profile page was read through the private source (`scripts/athlete-evidence.mjs`, 479 pages). Most sports publish many athlete links. Cross Country (0 of 30 profiles), Tennis (0 of 10) and Track & Field (0 of 64) publish none, so they use official profile cards (`athlete_profile_fallback_sports`). Team-account tags could not be read: instagram.com answers the sandbox with its login page.

## Limitations

- Soccer at Arkansas (Oct 2): the card links no story; the result line shows.
- Gymnastics and Track & Field fill when Missouri publishes them.
- No live card observed yet.
