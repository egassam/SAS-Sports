# Arizona State school module

`src/schools/arizona-state.mjs` owns Arizona State's thesundevils.com schedule and roster routes and its program combinations. The Worker imports its configuration; the event/result contract, caching, display and generic SIDEARM parsing remain shared.

Arizona State was chosen as the next Big 12 school on October 1, 2026 (user: "Start next school. Stay in the Big 12."). It was the first unconverted Big 12 school in catalog order whose official site the development sandbox can download: arizonawildcats.com, baylorbears.com, cubuffs.com, uhcougars.com, cyclones.com, gofrogs.com, texastech.com and wvusports.com all returned HTTP 403, as utahutes.com did through most of the Utah work.

## Setup (route parity)

The module starts as a pure move. Each of Arizona State's 17 sponsored sports gets exactly the schedule and roster candidates production used before the module existed:
- the five inline schedule routes (Volleyball, Soccer, Cross Country, Football, Swimming & Diving) moved out of `src/index.js`;
- the other sports' generic fallbacks and all roster fallbacks are now written out explicitly.

`combinedSports` keeps the shared policy (Basketball, Swimming & Diving).

A before/after dump of all 219 catalog school/sport schedule and roster routes (plus combination flags) was identical. `VERSION` was not bumped, since output is unchanged.

`npm run test:arizona-state-module` (also in `npm test` and `npm run test:release`) checks:
- all 17 sports route to thesundevils.com through the module;
- no `'arizona-state|` configuration remains in `src/index.js`;
- the program combinations are unchanged.

## Baseline vs K-State (production `4.31.9`, October 1, forced refresh)

| Sport | Now | Gap vs K-State |
| --- | --- | --- |
| Football | 3 results, 10 upcoming | Titles read `ASU vs vs.`, dates `Sep, 2026, 5`; a phantom Dec 4 Big 12 Championship result `W, 70-7`; missing games |
| Soccer, Volleyball, Lacrosse, Beach Volleyball, Water Polo, Baseball | Results with `vs.`/`at` placeholder opponents and `Mon, YYYY, D` dates | Same card-parsing defect; past seasons shown (Baseball `Sep, 2027`) |
| Gymnastics, Track & Field, Water Polo, Lacrosse, Beach Volleyball | Spring 2026 results shown as current | Past season not filtered |
| Cross Country | 1 result `Completed` | No race groups or runners |
| Golf, Tennis | `Completed` | No placings; one team only |
| Swimming & Diving | 502 | Routes `/sports/mens/swimming-diving/` do not resolve |
| Basketball, Hockey, Softball, Wrestling | Upcoming only | Schedule and start-time check |
