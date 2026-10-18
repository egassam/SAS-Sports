# Colorado State school module

`src/schools/colorado-state.mjs` owns Colorado State's csurams.com routes, program combinations, verified Instagram pins, its NIL marketplace and its SIDEARM schedule handlers (ported from NC State's with `start-schools --from=nc-state`). The event/result contract, caching, display and generic parsing stay shared.

Colorado State was added to the app on October 18, 2026 (10 sports, one PR with Boise State) in the new Pac-12. csurams.com is SIDEARM.

## Status (`4.109.0-boise-state-colorado-state`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | Finals with stories; "11/13 BYU" reads BYU |
| Volleyball | `womens-volleyball` | Finals with stories |
| Soccer | `womens-soccer` | Finals with stories; "No 13 Colorado" reads Colorado; at Texas State (Oct 16, L 0-1) has no story yet (result line shown) |
| Cross Country | `cross-country` | Team places from TFRRS (`CO_college_*_Colorado_State`); Roadrunners Invitational "Completed" with its story (a limited group: TFRRS lists no CSU team score) |
| Golf | `womens-golf`, `mens-golf` | Combined; women's place in the field with rounds and total ("11th of 16 Teams;" + "297-303-304 \| 904"), men's place with rounds and total ("5th - 289-288-278--855") |
| Swimming & Diving | `womens-swimming-and-diving` | Women only (not combined); duals with both scores; Pac-12 2-0 by the page, 1-0 by membership (Washington State) |
| Tennis | `womens-tennis` | Tournaments "Completed" with stories |
| Basketball | `mens-basketball`, `womens-basketball` | Combined |
| Softball | `softball` | Fall games only (fall ball is out of the record) |
| Track & Field | `track-and-field` | 2026-27 not published (page is 2025-26): valid empty |

## Rules

- Rankings without a mark ("11/13 BYU") or a period ("No 13 Colorado") are dropped from names (module).
- Golf: both card formats above (module).
- Swimming: a dual counts for the Pac-12 only against a member or Cal Baptist (the page flags both legs of the Oct 17 double dual, Colorado Mesa included).

Every new rule was mutated and each mutation fails `node tests/colorado-state-module.mjs`.

## Athletes

Pinned from the profile pages: Basketball (Kloe Froebe, Allie Roden, Bree Bowman; 7 of 30), Cross Country (Brooklyn Ewert, Abigail Petr, Mari Konold; 3 of 39), Track & Field (Kajsa Borrman, Brooklyn Ewert, Mari Konold; 6 of 120). Football: 34 of 113 profiles link Instagram. The site links its Opendorse marketplace (`opendorse.com/coloradostate-rams`, homepage checked Oct 18), read for sports still short of three. Profile cards (`athlete_profile_fallback_sports`) where neither publishes enough: Golf, Soccer, Softball, Swimming & Diving, Tennis, Volleyball (profiles link none). Preview, Oct 18, after the marketplace: Swimming & Diving and Volleyball 3 of 3 Instagram, Softball 2, Golf 1, Soccer 1, Tennis 0 (profile cards fill the rest; counts vary as caches warm).

## Open

- Track & Field fills when 2026-27 is published.
- First live cards not yet observed (soccer vs Boise State Oct 22).
