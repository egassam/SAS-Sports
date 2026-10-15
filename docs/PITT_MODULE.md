# Pitt school module

`src/schools/pitt.mjs` owns Pitt's pittsburghpanthers.com routes, program combinations and its SIDEARM schedule reader (NC State's handlers, `scripts/port-handlers.mjs`). The event/result contract, caching, display and generic parsing stay shared.

Pitt was added to the app on October 15, 2026 (12 sports, one PR with SMU). pittsburghpanthers.com is a SIDEARM site, read through the private source.

## Status (`4.92.0-pitt-smu`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 6 finals with stories |
| Volleyball | `womens-volleyball` | 16 finals with stories |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled (combined); finals with stories; one labeled ESPN board per team |
| Cross Country | `cross-country` | Team places from the cards (Panther Open, Spiked Shoe, Paul Short); TFRRS `PA_college_f/m_Pittsburgh` |
| Swimming & Diving | `swimming-and-diving` | Duals per team from the card ("Women: W, 85-19 Men: L, 72-84", CMU Relays; Michigan) |
| Basketball | `mens-`, `womens-basketball` | Labeled; exhibition labeled |
| Wrestling | `wrestling` | 2026-27 schedule (upcoming) |
| Baseball, Softball, Lacrosse | | Fall games; softball's fall exhibitions show their scores (out of the record) |
| Gymnastics, Track & Field | | 2026-27 pages not published yet (valid empty) |

**Tennis is not a Pitt sport:** Pitt ended women's tennis after the 2018-19 season ("Pitt Tennis Concludes Final Season", Apr 17, 2019); the nav still links the old page (title "2018-19 Women's Tennis Schedule"). Removed from the catalog.

## Pitt rules

- `combinedSports`: Basketball, Soccer, Swimming & Diving.
- Internal games not listed: scrimmages, intrasquads, baseball's "Blue/Gold" (Oct 27-30).
- Lacrosse's fall play days read "at" ("Pitt at Pitt Play Day").

Every new rule was mutated and each mutation fails `node tests/pitt-module.mjs`.

## Athletes

Every sport's profiles publish enough athlete Instagram (`scripts/athlete-evidence.mjs`, Oct 15): no pins, no profile cards.

## Open

- Gymnastics and Track & Field fill when 2026-27 is published.
- First live cards not yet observed (soccer at Notre Dame Oct 15, men's soccer vs North Carolina and volleyball vs Florida State Oct 16).
