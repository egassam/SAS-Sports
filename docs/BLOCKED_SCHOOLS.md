# Schools that block SAS Sports

Every school whose official athletics site refuses the app is listed here (user, October 22, 2026: "Add them all into their own MD file and add any more schools that we get into that file"). The user means to use these schools as examples of sites that block apps like this one (October 19: "I'm making this app to fix a problem. They are being part of the problem. I'll use them as examples later.").

**Rule for every session:** when a school's site refuses the app, add it to the table below in the same session, with the dates and rounds checked and the exact answer. Do not build the school. Leave it in `src/schools.json` so its catalog entry stays. Never pose as a browser or route around the block (project rule). If a listed school starts answering, move it to "No longer blocked" with the date, then build it.

## How the block works

All twelve sites below sit behind **Imperva** (Incapsula), a bot-defense service. The app runs on Cloudflare Workers and sends its own honest identity (`Mozilla/5.0 (compatible; SAS-Sports/<version>; +<bot page>)`). Imperva answers every request from Cloudflare's network with a redirect that sets a new session cookie and redirects again. The Worker gives up with **"Too many redirects"**, and `/api/source` answers HTTP 502.

- **The block is by network, not by the app's identity.** On October 21, one request to utahstateaggies.com with the same honest user agent from another network (the build sandbox) got the full 596 KB football schedule, `robots.txt` and the iCal feed with HTTP 200.
- **Keeping cookies does not help.** On October 19, with the user's approval, the Worker kept Imperva's session cookies for utahstateaggies.com and txst.com (commits `5083632`, `9b41a78`, `810f5e6`, then reverted). Imperva kept redirecting and issuing new cookies, because it wants the cookie its JavaScript challenge sets, which only a browser running its script can get. Running that challenge would be circumvention, so it was not done.
- **What would fix it:** the school (its athletics web team, or Sidearm Sports, which hosts these sites) allows the app's user agent from Cloudflare Workers in its Imperva settings. The app needs only public schedule, roster and news pages.

## Blocked schools

Checked through the branch preview's `/api/source` (the same network as production). The latest check of the first eight was October 22, 11:10 UTC (the three Mountain West schools 13:10 UTC, Western Michigan 14:30 UTC), and all answered "Too many redirects".

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
| Hawaii | Mountain West | hawaiiathletics.com | Oct 22, 2026 | Oct 22 (about 12:50, 12:55, 13:10 UTC) | |
| Nevada | Mountain West | nevadawolfpack.com | Oct 22, 2026 | Oct 22 (about 12:50, 12:55, 13:10 UTC) | |
| Wyoming | Mountain West | gowyo.com | Oct 22, 2026 | Oct 22 (about 12:50, 12:55, 13:10 UTC) | |
| Western Michigan | MAC | wmubroncos.com | Oct 22, 2026 | Oct 22 (14:05, 14:14, 14:30 UTC: football and volleyball schedules, homepage) | The other eleven MAC schools read normally |

Not blocked, for contrast: many SIDEARM sites behind Imperva answer the build sandbox with 403 but let the Worker read them (Ohio State, Louisville, Creighton, Marquette, UConn, Xavier, Montana State, Northern Arizona and others). Those are built normally through the private source route.

## Note a school could be sent

> SAS Sports (https://sas-sports.lovetogivepain.workers.dev) shows fans every school's official schedules and results, with links back to your site. Your athletics site (`<site>`) answers our requests from Cloudflare Workers with a redirect loop from Imperva, so your teams cannot be listed. We read only public schedule, roster and news pages, a few times an hour, with the user agent `Mozilla/5.0 (compatible; SAS-Sports/<version>; +<bot page address>)`, whose address describes the bot. Could you allow that user agent from Cloudflare's network?

## No longer blocked

None yet.
