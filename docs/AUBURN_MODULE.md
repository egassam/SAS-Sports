# Auburn school module

`src/schools/auburn.mjs` owns Auburn's auburntigers.com schedule and roster routes, its program combinations, its verified Instagram pins and its schedule-card reader. The Worker imports its configuration.

Auburn was added to the app and converted on October 8, 2026, together with Arkansas (PR #254). All 13 sports were built and tested one at a time and published in one PR. auburntigers.com is WMT (Nuxt); the module is Texas A&M's card reader (`scripts/port-handlers.mjs --from=texas-am`), adapted to Auburn's cards.

## Status (`4.65.1-arkansas-auburn`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals, each with its story; 3-2 (SEC 1-2); ESPN live score |
| Volleyball | `volleyball` | 15 finals, each with its story; 11-4 (SEC 1-2); ESPN live score |
| Soccer | `soccer` | 12 finals and the Georgia Southern exhibition; 7-2-3 (SEC 3-2); ESPN live score |
| Cross Country | `xctrack` (Aug-Nov) | 2 finals with both teams' places and points from TFRRS (`AL_college_f_Auburn`, `AL_college_m_Auburn`) |
| Track & Field | `xctrack` (Dec-Jul) | No 2026-27 track meets published yet |
| Golf | `mens-golf`, `womens-golf` | Labeled; day cards merged by course; place from the last day's card ("1/18", "4th/12"), else the final story's headline ("Auburn places second") |
| Equestrian | `equestrian` | 1 final and 2 exhibitions (labeled on the cards) |
| Tennis | `mens-tennis`, `womens-tennis` | Labeled; SEC Starkvegas Showdown with its story; players' pro events (M15 Futures) left out; ITA Regionals in progress |
| Swimming & Diving | `swimming-diving` | One page for both teams; CSL match with its story |
| Basketball, Baseball, Softball, Gymnastics | | Upcoming (fall exhibitions labeled); ESPN live scores |

## Auburn rules (beyond Texas A&M's)

- **Cards:** `schedule-event-item__*`: the day boxes carry the full date (`datetime`), so fall softball ("Softball 2026 Fall Schedule") and every page take the year from it; divider `schedule-event-item__divider`, opponent `schedule-event-item__opponent-name`; recap links `schedule-event-links__link--postgame`.
- **One XC/Track page:** cross country August to November, track the rest.
- **Golf:** one card per day; the days at one course are one tournament (the last day is named "Inverness Collegiate", the others "Inverness Intercollegiate").
- **Tennis:** pro events (ITF, Futures, `M15`, UTR/PTT) are players' events, not the team's (Texas's rule).

Every rule was mutated; every mutation fails `npm run test:auburn-module` (a runner-up headline rule whose mutation survived was removed).

## Athletes

Certification lists all 13 sports (minimum 3), every one with three Instagram athletes. Volleyball pins 3 of the 10 profile-page links. Shared fix: Auburn's profile pages list the school's team accounts in the menu before the athlete's own links, so every soccer profile resolved to `auburnbaseball` and none passed; the reader now reads a WMT bio's own `roster-bio-social-links` first.

## Limitations

- Track & Field fills when 2026-27 is published.
