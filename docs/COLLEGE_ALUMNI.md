# High school to college ("In College")

User, November 18, 2026: "What unique things should we add now?", then "Start with 2 then work your way through the rest". Item 1: a Kansas high school's former players now on college rosters (high school → college; college → pro is "In the Pros", `src/pro-alumni.mjs`).

## Source

Each college's own roster pages (`rosterUrls`, the same pages the app reads for featured athletes). They name every player's hometown and high school:

| Layout | Where it is read |
| --- | --- |
| SIDEARM Nuxt (most of the region) | `<script id="__NUXT_DATA__">`: a flat array whose player objects carry `full_name`, `hometown`, `high_school`, `previous_school`, `slug`, `class_level`, `player_position` by index. Missouri's list layout shows no hometown at all; this is the only place it is. |
| SIDEARM cards | `s-person-card`: `<span class="sr-only">Hometown</span> Goodland, Kan.`, `Last School` (K-State, Oklahoma). |
| SIDEARM table | `roster-table-cell--hometown`, `--high-school` (Missouri football, Nebraska). |
| SIDEARM classic | `sidearm-roster-player-hometown`, `-highschool`. |

## Colleges read

`ALUMNI_COLLEGES` (20): K-State, KU, Wichita State, Iowa State, Oklahoma State, Iowa, Nebraska, Creighton, Missouri, Oklahoma, Tulsa, Missouri State, Saint Louis, Drake, Northern Iowa, Lindenwood, Southeast Missouri, Kansas City, Omaha, Oral Roberts. Wichita State, Drake and Oral Roberts have no sponsored sports in the catalog yet (no roster pages read).

## Matching

A player is the app's high school's only when **both** hold:

- the roster's high school is one of the school's names (catalog name, short name, aliases; "High School", "HS", "High", "Jr/Sr" dropped; a table cell going on with later schools, "Mill Valley/Coffeyville CC", read to the first "/"), and
- the hometown is in Kansas and is the school's city.

"Blue Valley" players from Leawood and Stilwell went to Blue Valley High (Overland Park), not the app's Blue Valley (Randolph): the city keeps them out. The cost: a player whose hometown is a neighboring town (Shawnee Heights players list "Topeka"; the school is in Tecumseh) is not listed.

Nov 18, 2026, all 285 roster URLs of the 17 colleges with sports read from the sandbox: 55 players matched, every one checked by hand (Junction City's Jackson Hollie at K-State and Michael Boganowski at Oklahoma, Manhattan's Tatum Tindall (K-State volleyball) and Reese Snowden (Nebraska soccer), Wamego's Skylar Schoenbeck and Ashten Pierson (Creighton), ...).

## In the app

- One index per college in KV (`alumni:v1:college:<id>`, 14-day expiry), rebuilt when older than a day: the cron builds the stalest one every 10 minutes, and a high school's request starts at most two in the background (never awaited). A sport's alternative paths stop at the first page with players for each team (KU refused a quick run of all 31 on Nov 18).
- `/live/pros?school=<high school>&sport=<sport>` answers a `College` league: the school's players in that sport, with college (linked), position, year and the roster profile link. Kept 15 minutes only when every college index is read.
- Page: the sport's pill "In College · N players" (none shown when there are none), the tab "College", and the "In College" section with the colleges read.

## Not yet

- Colleges outside the region; junior colleges and NAIA/Division II (Kansas's largest destinations) are not in the catalog.
- College → high school links on a college's own roster (the index has them; the college page has no roster list).
- MLB draft picks from Kansas high schools (MLB's draft API names the high school and state).
