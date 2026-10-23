# Schools that block SAS Sports

Every school whose official athletics site refuses the app is listed here (user, October 22, 2026: "Add them all into their own MD file and add any more schools that we get into that file"). The user means to use these schools as examples of sites that block apps like this one (October 19: "I'm making this app to fix a problem. They are being part of the problem. I'll use them as examples later.").

**Rule for every session:** when a school's site refuses the app, add it to the table below in the same session, with the dates and rounds checked and the exact answer. Do not build the school. Leave it in `src/schools.json` so its catalog entry stays. Never pose as a browser or route around the block (project rule). If a listed school starts answering, move it to "No longer blocked" with the date, then build it.

## How the block works

The sites below (all but St. Bonaventure) sit behind **Imperva** (Incapsula), a bot-defense service. The app runs on Cloudflare Workers and sends its own honest identity (`Mozilla/5.0 (compatible; SAS-Sports/<version>; +<bot page>)`). Imperva answers every request from Cloudflare's network with a redirect that sets a new session cookie and redirects again. The Worker gives up with **"Too many redirects"**, and `/api/source` answers HTTP 502.

- **The block is by network, not by the app's identity.** On October 21, one request to utahstateaggies.com with the same honest user agent from another network (the build sandbox) got the full 596 KB football schedule, `robots.txt` and the iCal feed with HTTP 200.
- **Keeping cookies does not help.** On October 19, with the user's approval, the Worker kept Imperva's session cookies for utahstateaggies.com and txst.com (commits `5083632`, `9b41a78`, `810f5e6`, then reverted). Imperva kept redirecting and issuing new cookies, because it wants the cookie its JavaScript challenge sets, which only a browser running its script can get. Running that challenge would be circumvention, so it was not done.
- **What would fix it:** the school (its athletics web team, or Sidearm Sports, which hosts these sites) allows the app's user agent from Cloudflare Workers in its Imperva settings. The app needs only public schedule, roster and news pages.

## Blocked schools

Checked through the branch preview's `/api/source` (the same network as production). The latest check of the first eight was October 22, 11:10 UTC (the three Mountain West schools 13:10 UTC, Western Michigan 15:08 UTC, Wichita State 20:27 UTC, Kennesaw State and New Mexico State 21:55 UTC, San Diego 22:53 UTC, the Atlantic 10 four 23:47 UTC), and all answered "Too many redirects".

| School | Conference (2026-27) | Site | Blocked since | Checks | Notes |
| --- | --- | --- | --- | --- | --- |
| Utah State | Pac-12 | utahstateaggies.com | Oct 19, 2026 | Oct 19 (several, plus the cookie trial), Oct 21 sandbox analysis, Oct 22 | Module built Oct 19 (10 sports, classic SIDEARM, INFLCR) in commits `945f059`/`9b41a78`; restore it if the site allows the app |
| Texas State | Pac-12 | txst.com | Oct 19, 2026 | Oct 19 (several, plus the cookie trial), Oct 22 | `add-school` failed (the onboarding agent also got 403) |
| Butler | Big East | butlersports.com | Oct 21, 2026 | Oct 21 (three spaced rounds), Oct 22 | |
| Georgetown | Big East | guhoyas.com | Oct 21, 2026 | Oct 21 (three spaced rounds), Oct 22 | |
| Villanova | Big East | villanova.com | Oct 21, 2026 | Oct 21 (three spaced rounds), Oct 22 | |
| Idaho | Big Sky | govandals.com | Oct 21, 2026 | Oct 21 (20:4x and 22:16 UTC), Oct 22 | |
| App State | Sun Belt | appstatesports.com | Oct 22, 2026 | Oct 22 (01:5x, 02:00, 11:10 UTC) | |
| Georgia State | Sun Belt | georgiastatesports.com | Oct 22, 2026 | Oct 22 (01:5x, 02:00, 11:10 UTC) | |
| Hawaii | Mountain West | hawaiiathletics.com | Oct 22, 2026 | Oct 22 (about 12:50, 12:55, 13:10 UTC) | Also a Big West affiliate (men's volleyball, beach volleyball, women's water polo): Big West schools' games against it count as conference games |
| Nevada | Mountain West | nevadawolfpack.com | Oct 22, 2026 | Oct 22 (about 12:50, 12:55, 13:10 UTC) | |
| Wyoming | Mountain West | gowyo.com | Oct 22, 2026 | Oct 22 (about 12:50, 12:55, 13:10 UTC) | |
| Western Michigan | MAC | wmubroncos.com | Oct 22, 2026 | Oct 22 (about 14:12, 14:14, 14:30 and 15:08 UTC: football, volleyball and soccer schedules, homepage) | The other eleven MAC schools read normally |
| Wichita State | American | goshockers.com | Oct 22, 2026 | Oct 22 (about 20:05, 20:14 and 20:27 UTC: homepage and volleyball schedule) | Imperva (`visid_incap`, `incap_ses`, `x-iinfo`); the other twelve American schools read normally |
| Kennesaw State | Conference USA | ksuowls.com | Oct 22, 2026 | Oct 22 (about 21:33, 21:44 and 21:55 UTC: homepage and volleyball schedule) | |
| New Mexico State | Conference USA | nmstatesports.com | Oct 22, 2026 | Oct 22 (about 21:33, 21:44 and 21:55 UTC: homepage and volleyball schedule) | The other eight Conference USA schools read normally |
| San Diego | WCC | usdtoreros.com | Oct 22, 2026 | Oct 22 (about 22:23, 22:42 and 22:53 UTC: homepage and volleyball schedule) | The other nine WCC schools read normally |
| Dayton | Atlantic 10 | daytonflyers.com | Oct 22, 2026 | Oct 22 (about 23:21, 23:36 and 23:47 UTC: homepage and volleyball schedule) | |
| Loyola Chicago | Atlantic 10 | loyolaramblers.com | Oct 22, 2026 | Oct 22 (about 23:21, 23:36 and 23:47 UTC) | |
| VCU | Atlantic 10 | vcuathletics.com | Oct 22, 2026 | Oct 22 (about 23:21, 23:36 and 23:47 UTC) | |
| St. Bonaventure | Atlantic 10 | gobonnies.sbu.edu | Oct 22, 2026 | Oct 22 (about 23:21, 23:36 and 23:47 UTC) | Not Imperva's loop: the Worker gets HTTP 525 (Cloudflare could not complete a TLS handshake with the site) and the build sandbox's direct request gets no connection; the other ten Atlantic 10 schools read normally |
| Bradley | Missouri Valley | bradleybraves.com | Oct 23, 2026 | Oct 23 (about 01:47, 02:07 and 02:27 UTC: homepage and volleyball schedule) | |
| Drake | Missouri Valley | godrakebulldogs.com | Oct 23, 2026 | Oct 23 (about 01:47, 02:07 and 02:27 UTC: homepage and volleyball schedule) | |
| UIC | Missouri Valley | uicflames.com | Oct 23, 2026 | Oct 23 (about 01:47, 02:07 and 02:27 UTC: homepage and volleyball schedule) | |
| FGCU | ASUN | fgcuathletics.com | Oct 23, 2026 | Oct 23 (about 02:52, 03:11 and 03:30 UTC: homepage and volleyball schedule) | |
| Stetson | ASUN | gohatters.com | Oct 23, 2026 | Oct 23 (about 02:52, 03:11 and 03:30 UTC: homepage and volleyball schedule) | |
| Little Rock | UAC | lrtrojans.com | Oct 23, 2026 | Oct 23 (about 03:21 UTC) | Not Imperva: lrtrojans.com's robots.txt reads `User-agent: *` / `Disallow: /`, and the Worker honors robots.txt (`x-sas-source: robots-disallowed`). The direct page answers 200. Recheck when the site changes its robots.txt. |
| Vermont | America East | uvmathletics.com | Oct 23, 2026 | Oct 23 (about 04:12, 04:31 and 04:45 UTC: homepage and volleyball schedule) | |
| Longwood | Big South | longwoodlancers.com | Oct 23, 2026 | Oct 23 (about 08:47, 09:06 and 09:25 UTC: homepage and volleyball schedule) | |
| Northeastern | CAA | nuhuskies.com | Oct 23, 2026 | Oct 23 (about 09:47, 10:07 and 10:27 UTC: homepage and volleyball schedule) | |
| UNC Wilmington | CAA | uncwsports.com | Oct 23, 2026 | Oct 23 (about 09:47, 10:07 and 10:27 UTC: homepage and volleyball schedule) | |
| Northern Kentucky | Horizon League | nkunorse.com | Oct 23, 2026 | Oct 23 (about 11:58, 12:17 and 12:36 UTC: homepage and volleyball schedule) | |
| Oakland | Horizon League | goldengrizzlies.com | Oct 23, 2026 | Oct 23 (about 11:58, 12:17 and 12:36 UTC: homepage and volleyball schedule) | |
| Harvard | Ivy League | gocrimson.com | Oct 23, 2026 | Oct 23 (about 13:34, 13:52 and 14:11 UTC: homepage and volleyball schedule) | Imperva answers with its JavaScript challenge page (`_Incapsula_Resource`), not the site |
| Yale | Ivy League | yalebulldogs.com | Oct 23, 2026 | Oct 23 (about 13:28, 13:47 and 14:05 UTC: homepage and volleyball schedule) | |

The twelve Big West schools (Oct 22, about 15:50 UTC) all read: none blocked. Twelve of the thirteen American schools read (Oct 22, about 20:05 UTC); Wichita State is blocked. Eight of the eleven Missouri Valley schools read (Oct 23, about 01:47 UTC); Bradley, Drake and UIC are blocked. Six of the eight ASUN schools read (Oct 23, about 02:52 UTC); FGCU and Stetson are blocked. Eight of the nine UAC schools read; Little Rock disallows every robot. Eight of the nine America East schools read (Oct 23, about 04:12 UTC); Vermont is blocked. Eight of the nine Big South schools read (Oct 23, about 08:47 UTC); Longwood is blocked. Eleven of the thirteen CAA schools read (Oct 23, about 09:47 UTC); Northeastern and UNC Wilmington are blocked. Ten of the twelve Horizon League schools read (Oct 23, about 11:58 UTC; Northern Illinois joined from the MAC); Northern Kentucky and Oakland are blocked. Six of the eight Ivy League schools read (Oct 23, about 13:28 UTC); Harvard and Yale are blocked.

Not blocked, for contrast: many SIDEARM sites behind Imperva answer the build sandbox with 403 but let the Worker read them (Ohio State, Louisville, Creighton, Marquette, UConn, Xavier, Montana State, Northern Arizona and others). Those are built normally through the private source route.

## Note a school could be sent

> SAS Sports (https://sas-sports.lovetogivepain.workers.dev) shows fans every school's official schedules and results, with links back to your site. Your athletics site (`<site>`) answers our requests from Cloudflare Workers with a redirect loop from Imperva, so your teams cannot be listed. We read only public schedule, roster and news pages, a few times an hour, with the user agent `Mozilla/5.0 (compatible; SAS-Sports/<version>; +<bot page address>)`, whose address describes the bot. Could you allow that user agent from Cloudflare's network?

## No longer blocked

None yet.
