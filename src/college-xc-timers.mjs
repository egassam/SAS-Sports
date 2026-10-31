// College cross country meets whose timer's live results the app may not
// read (user, October 30, 2026: "Add live results for college cross country
// too", then "Yes build what you can"). PrimeTime Timing's live results site
// (live.pttiming.com, run by Karmarush LLC) forbids automated access and any
// read of the systems behind it in its terms of use (Sep 3, 2026); the user
// has asked PrimeTime for permission. Until it answers, the meet's card on
// its day carries the host's race times and a link to PrimeTime's event page
// (linking is allowed), and the final results come from TFRRS and the
// school as before.
//
// Each meet: its day, the conference whose schools run it (null: any
// school), the schedule's name for it, PrimeTime's event page, and the race
// times the host published (none yet for the American and the NCAA meet).
const PRIMETIME='PrimeTime Timing';
export const COLLEGE_XC_TIMER_MEETS=[
  // static.okstate.com/custompages/b12xc-26 (the host, Oklahoma State).
  {date:'2026-10-31',conference:'Big 12',name:/\bbig\s*12\b.*\bchampionships?\b/i,timer:PRIMETIME,url:'https://www.pttiming.com/event/fda0d982-abfd-43af-ae80-684ab8d21f62',site:'Stillwater, OK',races:[{team:"Women's",label:"Women's 6K",time:'10:00 AM CT'},{team:"Men's",label:"Men's 8K",time:'11:00 AM CT'}]},
  {date:'2026-10-31',conference:'American',name:/\bamerican\b.*\bchampionships?\b/i,timer:PRIMETIME,url:'https://www.pttiming.com/event/9f463589-6071-4562-8d5d-51748352a186',site:'New Orleans, LA',races:[]},
  {date:'2026-11-21',conference:null,name:/^NCAA\b(?!.*\bregion).*\bchampionships?\b/i,timer:PRIMETIME,url:'https://www.pttiming.com/event/e767dbdb-fe80-456d-b924-e817c559c1a1',site:'Terre Haute, IN',races:[]},
];

// The meet's day card for each of the school's meets still to run; and a
// final the school's schedule has scored before its recap or TFRRS (October
// 31, K-State at the Big 12: "W (15th) / M (10th) Oct 31 Final vs Cross
// Country Big 12 Championship" with no link): K-State's team headline, the
// timer's full results, and where runners will come from.
export function applyCollegeXcTimerMeets(events,school,meets=COLLEGE_XC_TIMER_MEETS){
  for(const event of events){
    const day=String(event.start_time||'').slice(0,10);
    const meet=meets.find(m=>m.date===day&&(!m.conference||m.conference===school?.conference)&&m.name.test(event.opponent||''));
    if(!meet)continue;
    if(event.status==='Final'){
      if(event.recap_url)continue;
      const teams=(event.results||[]).filter(r=>/ team$/i.test(r.participant||''));
      if(teams.length&&teams.length===(event.results||[]).length)event.headline=teams.map(r=>`${/^women/i.test(r.group)?"Women's":"Men's"} team: ${r.result}`).join(' / ');
      event.recap_url=meet.url;
      event.recap_label=`Full results (${meet.timer})`;
      event.highlight_status=`${teams.length?'Team places from the official schedule. ':''}Runners and times appear here when the school's recap or TFRRS posts them; the full results are on ${meet.timer}'s site.`;
      continue;
    }
    if(event.status!=='Upcoming'&&event.status!=='Today')continue;
    // A school listing each team on its own (BYU, FAU) shows that team's race.
    const races=meet.races.filter(r=>!event.team_label||r.team===event.team_label);
    event.results=races.map(r=>({group:meet.site,participant:`${r.label} race`,result:r.time}));
    event.result_count=event.results.length;
    event.recap_url=meet.url;
    event.recap_label=`Live results (${meet.timer})`;
    event.highlight_status=`Timed by ${meet.timer}. Follow the race live on its site; ${meet.timer} does not allow apps to read its live results, so final places and times appear here once they are posted.`;
  }
  return events;
}
