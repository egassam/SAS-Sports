# Calendar subscription

User, November 18, 2026: item 5 of "What unique things should we add now?" ("one link that puts your favorites' games into Apple or Google Calendar and keeps updating them"), then "Start with 2 then work your way through the rest".

## Endpoint

`/live/calendar.ics?pairs=school|Sport,school|Sport` (12 pairs at most; optional `name`) answers iCalendar (RFC 5545, `text/calendar`), built by `src/calendar-ics.mjs` from the saved feed copies Home reads (`homeSavedFeed`); a pair with no copy at that location is built (at most four a request). Kept 30 minutes at the edge when every pair answered; `REFRESH-INTERVAL`/`X-PUBLISHED-TTL` ask calendar apps to read it every two hours.

- Coming and live games, and finals of the last 30 days, each once (`UID: <event id>@sas-sports`).
- A published start: `DTSTART;TZID=<school's time zone>` at the event's local wall clock, three hours (four for a meet). No published time: an all-day event.
- `SUMMARY`: the card's title, a final's score after it ("K-State vs Kansas (W, 35-24)"); "No score posted" is left out. `LOCATION`: the schedule's place (weather's `site`). `DESCRIPTION`: school and sport, final, TV, series record, the app link.

## Page

"Add to calendar" in the header: on a team page that team (its chosen sport, or its sponsored sports, up to 12); on Home the favorites' current sports. The panel offers Apple / Outlook (`webcal://`), Google Calendar (`calendar.google.com/calendar/r?cid=webcal://…`) and Copy link. `tests/calendar-ics.mjs`.

## Not yet

- A subscribed link keeps the teams it was made with; changing favorites needs a new link.
- Google Calendar refreshes subscribed calendars on its own schedule (often several hours).
