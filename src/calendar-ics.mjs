// Calendar subscription (user, November 18, 2026: item 5 of "What unique
// things should we add now?", "Start with 2 then work your way through the
// rest"): one link that puts a team's or the favorites' games into Apple,
// Google or Outlook Calendar and keeps them current (iCalendar, RFC 5545).
//
// Built from the app's own feeds (the saved copies Home reads): coming and
// live games, and finals of the last 30 days with their scores. An event's
// start is its local wall clock (the app keeps "2026-11-21T18:00" in
// start_time), written with the school's time zone (TZID); a game with no
// published time is an all-day event.

export const CALENDAR_PAIRS_MAX=12,CALENDAR_PAST_DAYS=30;
const pad=n=>String(n).padStart(2,'0');
// RFC 5545 text: backslash, semicolon, comma and newlines escaped.
export const icsText=s=>String(s??'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
// Lines longer than 75 octets continue on the next line after a space.
export function foldLine(line){
  const bytes=new TextEncoder().encode(line);if(bytes.length<=75)return line;
  const out=[];let current='',size=0;
  for(const ch of line){const n=new TextEncoder().encode(ch).length;if(size+n>(out.length?74:75)){out.push(current);current='';size=0}current+=ch;size+=n}
  out.push(current);return out.join('\r\n ');
}
const stamp=d=>`${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const day=iso=>String(iso).slice(0,10).replace(/-/g,'');
const nextDay=iso=>{const d=new Date(`${String(iso).slice(0,10)}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)};
// A published start time ("Nov 21, 6:00 PM"), not a date alone.
export const hasClock=e=>/\d:\d\d|\d\s?[AP]M/i.test(String(e?.display_time||''));

export function calendarEvents(feeds,{now=new Date()}={}){
  const since=now.getTime()-CALENDAR_PAST_DAYS*86400e3,out=[],seen=new Set();
  for(const feed of feeds||[]){
    for(const g of feed.groups||[]){
      for(const e of [...(g.live||[]),...(g.upcoming||[]),...(g.results||[])]){
        if(!e?.id||!e.start_time||seen.has(e.id))continue;
        if(e.status==='Final'&&Date.parse(e.end_time||e.start_time)<since)continue;
        seen.add(e.id);out.push({event:e,feed});
      }
    }
  }
  return out.sort((a,b)=>String(a.event.start_time).localeCompare(String(b.event.start_time)));
}

export function calendarIcs(feeds,{name='SAS Sports',appUrl='',now=new Date()}={}){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SAS Sports//Schedules//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',`X-WR-CALNAME:${icsText(name)}`,'X-WR-CALDESC:Games from SAS Sports','REFRESH-INTERVAL;VALUE=DURATION:PT2H','X-PUBLISHED-TTL:PT2H'];
  for(const {event:e,feed} of calendarEvents(feeds,{now})){
    const tz=feed.timeZone||'America/Chicago',timed=hasClock(e);
    const final=e.status==='Final'&&e.headline&&!e.no_result_posted;
    const summary=`${e.title}${final?` (${e.headline})`:''}`;
    const link=appUrl&&feed.school?`${appUrl}/?school=${encodeURIComponent(feed.school)}`:'';
    const description=[`${feed.schoolName||feed.school} ${e.sport||feed.sport}`,final?`Final: ${e.headline}`:e.status==='Live'?'Live now':null,e.broadcast?`TV: ${e.broadcast}`:null,e.series?.record?`Series: ${[e.series.record,e.series.streak].filter(Boolean).join(' · ')}`:null,link?`Scores and results: ${link}`:null].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT',`UID:${icsText(`${e.id}@sas-sports`)}`,`DTSTAMP:${stamp(now)}`);
    if(timed){
      const start=String(e.start_time).slice(0,16).replace(/[-:]/g,'');
      lines.push(`DTSTART;TZID=${tz}:${start}00`,`DURATION:${e.event_type==='GAME'?'PT3H':'PT4H'}`);
    }else{
      lines.push(`DTSTART;VALUE=DATE:${day(e.start_time)}`,`DTEND;VALUE=DATE:${day(nextDay(e.end_time||e.start_time))}`);
    }
    lines.push(`SUMMARY:${icsText(summary)}`);
    if(e.site?.place)lines.push(`LOCATION:${icsText(e.site.place)}`);
    lines.push(`DESCRIPTION:${icsText(description)}`);
    if(link)lines.push(`URL:${link}`);
    lines.push('STATUS:CONFIRMED','TRANSP:TRANSPARENT','END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n')+'\r\n';
}
