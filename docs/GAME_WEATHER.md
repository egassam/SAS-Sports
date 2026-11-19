# Weather on outdoor games

User, November 18, 2026: item 4 of "What unique things should we add now?" ("each upcoming football, soccer, baseball, softball or track card shows the forecast at kickoff, from the free National Weather Service API"), then "Start with 2 then work your way through the rest".

## Sources (free, no key)

- **The place**: the schedule's own location for the game. SIDEARM's schedule data gives every game a `location` ("Manhattan, Kan.") and a home/away/neutral flag; `src/sidearm-schedule-reader.mjs` keeps it on coming games as `site`. A neutral site is its own city (a bowl or championship game is not given the home city's forecast), which is why the title's "vs"/"at" is not used.
- **The point**: Open-Meteo's geocoder (`geocoding-api.open-meteo.com`), city and state ("Manhattan, Kansas", not New York), kept in KV 180 days.
- **The forecast**: the National Weather Service (`api.weather.gov`): `/points/<lat>,<lon>` gives the hourly forecast URL (kept in KV 30 days); the hourly forecast (156 hours: temperature, wind, short forecast, chance of precipitation) is read through the source cache for an hour. NWS asks for a User-Agent: `SAS-Sports (game-day forecasts)`. United States only.

## In the app

`src/game-weather.mjs`, `attachWeather` in the Worker: Football, Soccer, Baseball, Softball, Track & Field, Cross Country, Golf, Lacrosse, Field Hockey, Rowing, Beach Volleyball; a coming game with a named place and a published start, within the forecast's hours (6.5 days); at most four a feed. The hour is matched by the place's local clock. Page: a "Forecast" line on coming cards and the next game ("55°F · Light Rain Likely · Wind 5 mph NW · 72% precip · Manhattan, Kan."). Test `tests/game-weather.mjs` (fixtures of Nov 18).

## Not yet

- Schedules that name no place: high schools (calendars, Bound, MaxPreps), college sites not on SIDEARM, pro teams.
- A domed stadium still shows the city's forecast (labeled with the place).
- A game whose published time is in another time zone than the venue's is matched by its published clock.

## robots.txt

`api.weather.gov` and `api.open-meteo.com`/`geocoding-api.open-meteo.com` answer robots.txt `User-agent: * / Disallow: /` (found on the first preview, Nov 18: no forecast was read because the app's fetcher obeys robots.txt). Both are public APIs published for programs; their robots.txt is aimed at crawlers. User, November 19, 2026, asked whether to allow these two APIs: "Go with 1". The three weather reads (geocoder, NWS point, NWS hourly forecast) pass `robots:false`; every other source still obeys robots.txt. NWS asks only for a User-Agent; Open-Meteo is free for non-commercial use.
