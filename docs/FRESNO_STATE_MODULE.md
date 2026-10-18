# Fresno State school module

`src/schools/fresno-state.mjs` owns Fresno State's gobulldogs.com routes, program combinations, verified Instagram pins, its NIL marketplace and its SIDEARM schedule handlers (ported from NC State's with `start-schools --from=nc-state`). The event/result contract, caching, display and generic parsing stay shared.

Fresno State was added to the app on October 18, 2026 (13 sports, one PR with Gonzaga) in the new Pac-12. gobulldogs.com is SIDEARM (read directly).

## Status (`4.110.0-fresno-state-gonzaga`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | Finals with stories |
| Volleyball | `womens-volleyball` | Finals with stories |
| Soccer | `womens-soccer` | Finals with stories |
| Cross Country | `cross-country` | Team places from TFRRS (`CA_college_*_Fresno_State`); the Riverside Invitational is TFRRS's "UCR XC Invite - 45th Annual" (only meet that day) |
| Equestrian | `equestrian` | Finals with stories; at TCU (Oct 8) takes its archive story (the page links the football game-day story) |
| Golf | `womens-golf`, `mens-golf` | Combined; places "8th of 13" from the cards |
| Swimming & Diving | `womens-swimming-and-diving` | Women only (not combined); Alumni Meet (Oct 10, exhibition) is internal; Gary Ota Memorial Invite "Completed" with its story |
| Tennis | `womens-tennis` | Women only; tournaments "Completed" with stories |
| Basketball | `mens-basketball`, `womens-basketball` | Combined; season starts in November |
| Softball | `softball` | Fall games are scrimmages (type S, out) |
| Baseball, Water Polo, Track & Field | `baseball`, `womens-water-polo`, `track-and-field` | 2026-27 not published (pages are 2025-26): valid empty |

## Rules

- A story whose address names another sport (`football-…` on an equestrian meet) is not the event's story (shared SIDEARM reader, `otherSportStory`).
- A scored dual (equestrian, tennis, rowing, swimming) with no linked story takes one from the archive when the story names the opponent and the score (shared kit `needsStory`; was games only).
- Cross country: `onlyMeetThatDay` (module); `fetch-school-fixtures` saves such TFRRS meets too.

Every new rule was mutated and each mutation fails `node tests/fresno-state-module.mjs`.

## Athletes

Profile pages link Instagram only in Softball (14 of 25) and Tennis (Eliza Dunbar, pinned). The site links its Opendorse marketplace (`opendorse.com/fresnostate-bulldogs`, from gobulldogs.com/feature/NIL, checked Oct 18; team "Fresno State Bulldogs"), read for sports still short of three. Profile cards (`athlete_profile_fallback_sports`) fill the rest in the other 12 sports.

## Open

- Baseball, Water Polo, Track & Field fill when 2026-27 is published.
- First live cards not yet observed.
