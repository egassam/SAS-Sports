// K-State school module. Shared publisher utilities are injected by the Worker;
// this file never imports the Worker or changes another school's records.
// Exact published snapshots retain their original event/school/date keys.
export const kstateSchool={
  id:'kstate',
  // K-State publishes these programs on separate men's and women's pages.
  // Both sources must be loaded and labeled before the shared feed is merged.
  combinedSports:new Set(['Basketball','Golf']),
  // Live game state comes from an independent scoreboard. The official
  // athletics pages remain the schedule/recap source of record.
  liveScoreboards:{
    Football:[{path:'football/college-football',sourceName:'Live college football scoreboard'}],
    Basketball:[
      {path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},
      {path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}
    ],
    // Volleyball scores are sets won; the live detail names the current set.
    Volleyball:[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    // Soccer and Baseball had no scoreboard: Kansas at K-State (Oct 8) stayed
    // "Today" in upcoming while ESPN showed it live.
    Soccer:[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}],
    Baseball:[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}]
  },
  scheduleUrls:{
    'kstate|Basketball':[
      'https://www.kstatesports.com/sports/mens-basketball/schedule',
      'https://www.kstatesports.com/sports/womens-basketball/schedule',
      'https://www.kstatesports.com/sports/basketball/schedule',
      'https://www.kstatesports.com/'
    ],
    'kstate|Golf':[
      'https://www.kstatesports.com/sports/womens-golf/schedule',
      'https://www.kstatesports.com/sports/mens-golf/schedule',
      'https://www.kstatesports.com/sports/golf/schedule',
      'https://www.kstatesports.com/'
    ],
    'kstate|Volleyball':'https://www.kstatesports.com/sports/womens-volleyball/schedule',
    'kstate|Soccer':'https://www.kstatesports.com/sports/womens-soccer/schedule',
    'kstate|Cross Country':'https://www.kstatesports.com/sports/cross-country/schedule',
    'kstate|Track & Field':'https://www.kstatesports.com/sports/track-and-field/schedule',
    'kstate|Football':'https://www.kstatesports.com/sports/football/schedule',
    'kstate|Rowing':'https://www.kstatesports.com/sports/womens-rowing/schedule',
  },
  verifiedInstagrams:{
    'kstate|Tennis|Mallory Renfro':'https://www.instagram.com/mallorymrenfro/',
    'kstate|Tennis|Maralgoo Chogsomjav':'https://www.instagram.com/maralgoo917/',
    'kstate|Tennis|Varvara Bernovich':'https://www.instagram.com/bernovich.varka/',
  },
  blockedInstagramHandles:['kstatesports'],
  verifiedGameDetails:{
    'kstate|Soccer|2026-09-03|rv-iowa':{
      source_url:'https://www.kstatesports.com/news/2026/9/3/soccer-k-state-notches-draw-at-iowa-on-thursday-night',
      highlights:[
        'Allison Marshall scored from 19 yards in the 23rd minute, assisted by Gabby DeMers.',
        'Two additional K-State first-half goals were disallowed after VAR reviews.',
        'Iowa’s Reilly Heman equalized in the 50th minute, assisted by Berit Parten.',
        'Maddie Sibbing tied her collegiate career high with eight saves.',
        'The draw extended K-State’s school-record unbeaten streak to seven matches.'
      ],
      stats:[
        {label:'Shots',value:'K-State 11 · Iowa 25'},
        {label:'Shots on goal',value:'K-State 5 · Iowa 9'},
        {label:'Saves',value:'K-State 8 · Iowa 4'},
        {label:'Corners',value:'K-State 4 · Iowa 7'}
      ]
    },
    'kstate|Soccer|2026-08-30|nebraska':{
      source_url:'https://www.kstatesports.com/news/2026/8/30/soccer-k-state-nebraska-play-to-draw-on-sunday-night',
      highlights:[
        'K-State and Nebraska finished in a scoreless draw.',
        'Maddie Sibbing saved a Nebraska penalty kick in the 67th minute.',
        'Sibbing made six saves and recorded her school-record 12th career shutout.',
        'The result extended K-State’s school-record unbeaten streak to six matches.'
      ],
      stats:[
        {label:'Shots',value:'K-State 12 · Nebraska 15'},
        {label:'Shots on goal',value:'K-State 3 · Nebraska 6'},
        {label:'Saves',value:'K-State 6 · Nebraska 3'},
        {label:'Corners',value:'K-State 1 · Nebraska 9'}
      ]
    },
    'kstate|Soccer|2026-08-23|south-dakota-state':{
      source_url:'https://www.kstatesports.com/news/2026/8/23/https-www-kstatesports-com-documents-2026-8-14-2026-27-k-state-soccer-3-pdf',
      highlights:[
        'South Dakota State went down a player after its goalkeeper received a red card in the 20th minute.',
        'Langley Mayers opened the scoring in the 29th minute, assisted by Rilyn Rintoul and Chloe Dillbeck.',
        'Gabby DeMers added K-State’s second goal in the 52nd minute from Lauren Moylan and Mayers assists.',
        'Maddie Sibbing earned her school-record 11th career shutout and tied the K-State record with 11 career wins.',
        'K-State outshot South Dakota State 22-5 and allowed only one shot on goal.'
      ],
      stats:[
        {label:'Shots',value:'K-State 22 · South Dakota State 5'},
        {label:'Shots on goal',value:'K-State 8 · South Dakota State 1'},
        {label:'Saves',value:'K-State 1 · South Dakota State 6'},
        {label:'Corners',value:'K-State 2 · South Dakota State 3'}
      ]
    },
    'kstate|Soccer|2026-08-13|seattle-u':{
      source_url:'https://www.kstatesports.com/news/2026/8/13/soccer-k-state-thumps-seattle-u-in-2026-season-opener',
      highlights:[
        'McKinnan Braswell headed in Rilyn Rintoul’s cross in the 12th minute for the eventual game-winner.',
        'Rintoul scored from her own rebound in the 23rd minute after assisting the opening goal.',
        'Freshmen Lauren Moylan and Kennedy Miller scored their first collegiate goals seven minutes apart in the second half.',
        'K-State’s four goals tied the program record for goals in a season opener.',
        'The Wildcats held a 14-9 advantage in shots and put eight attempts on goal.'
      ],
      stats:[
        {label:'Shots',value:'K-State 14 · Seattle U. 9'},
        {label:'Shots on goal',value:'K-State 8 · Seattle U. 3'},
        {label:'Saves',value:'K-State 3 · Seattle U. 4'},
        {label:'Corners',value:'K-State 4 · Seattle U. 6'}
      ]
    },
    'kstate|Soccer|2026-08-20|missouri-state':{
      source_url:'https://www.kstatesports.com/news/2026/8/20/soccer-k-state-registers-home-shutout-win-in-2026-home-opener',
      highlights:[
        'McKinnan Braswell scored the game-winner in the sixth minute from a Rilyn Rintoul assist.',
        'Rilyn Rintoul doubled the lead in the 58th minute, assisted by Gabby DeMers.',
        'Kennedy Miller completed the scoring in the 76th minute.',
        'K-State dominated the shot count 32-2 and tied its school record with 13 shots on goal.',
        'Maddie Sibbing’s shutout tied the K-State career record with her 10th.'
      ],
      stats:[
        {label:'Shots',value:'K-State 32 · Missouri State 2'},
        {label:'Shots on goal',value:'K-State 13 · Missouri State 1'},
        {label:'Saves',value:'K-State 1 · Missouri State 10'},
        {label:'Corners',value:'K-State 11 · Missouri State 1'}
      ]
    }
  }
};

const VERIFIED_MEET_DETAILS=new Map(Object.entries({
  'kstate|Cross Country|2026-09-04|platte-river-rumble-gold':{
    source_url:'https://www.kstatesports.com/news/2026/9/4/cross-country-k-state-clinches-team-wins-at-platte-river-rumble-gold',
    rows:[
      {group:"Women's 5K",participant:'K-State team',result:'1st · 20 pts'},
      {group:"Women's 5K",participant:'Emma Baum',result:'2nd · 17:41.9'},
      {group:"Women's 5K",participant:'Joyce Kiptabut',result:'3rd · 17:43.9'},
      {group:"Women's 5K",participant:'Christine Jerono',result:'4th · 17:46.2'},
      {group:"Women's 5K",participant:'McKenna Montgomery',result:'5th · 17:58.8'},
      {group:"Women's 5K",participant:'Payton Fink',result:'6th · 18:15.6'},
      {group:"Women's 5K",participant:'Paige Baker',result:'8th · 18:28.1'},
      {group:"Women's 5K",participant:'Bree Allen',result:'13th · 18:52.6'},
      {group:"Women's 5K",participant:'Sage Siegrist',result:'16th · 19:06.6'},
      {group:"Women's 5K",participant:'Hanna Keltner',result:'19th · 19:17.3'},
      {group:"Women's 5K",participant:'Payton Wurtz',result:'24th · 19:52.8'},
      {group:"Women's 5K",participant:'Bree Newport',result:'30th · 20:28.6'},
      {group:"Men's 6K",participant:'K-State team',result:'1st · 19 pts'},
      {group:"Men's 6K",participant:'Max Larson',result:'1st · 18:27.2'},
      {group:"Men's 6K",participant:'Jackson Esquibel',result:'2nd · 18:32.3'},
      {group:"Men's 6K",participant:'Brock Olsen',result:'3rd · 18:36.0'},
      {group:"Men's 6K",participant:'Dylan Plath',result:'5th · 18:52.3'},
      {group:"Men's 6K",participant:'Vance Krudwig',result:'8th · 19:17.5'},
      {group:"Men's 6K",participant:'Logan Beckman',result:'14th · 19:47.4'},
      {group:"Men's 6K",participant:'Jacob Norris',result:'21st · 20:44.2'}
    ]
  }
}));
// Inject shared parsing and transport so feed and expanded results use the
// same handlers. No network work runs during module initialization.
export function createKStateHandlers({clean,slug,ordinal,recapArticleText,recapMatchesEvent,fetch,headers:HEADERS}){
  function applyVerifiedMeet(event){
    if(!isKStateCrossCountry(event))return false;
    const detail=VERIFIED_MEET_DETAILS.get(`${event.school_id}|${event.sport}|${event.start_time?.slice(0,10)||''}|${slug(event.opponent||'')}`);
    if(detail){
      event.results=detail.rows.map(row=>({...row}));
      event.meet_results_verified=true;
      event.recap_result_count=detail.rows.length;
      event.highlights=[
        "K-State swept both team championships, with the women scoring 20 points and the men finishing one point better at 19.",
        "Max Larson led a commanding 1-2-3 men’s finish, winning the 6K in 18:27.2 ahead of Jackson Esquibel and Brock Olsen.",
        "Emma Baum’s 17:41.9 runner-up performance started a five-runner K-State women’s pack that captured places two through six.",
        "The Wildcat men placed five runners inside the top eight, while all six leading K-State women crossed among the first eight finishers."
      ];
      event.highlights_verified=true;
      event.headline="Women's team: 1st · 20 pts / Men's team: 1st · 19 pts";
      event.result_count=detail.rows.length;
      event.has_more_results=detail.rows.length>3;
      event.source={...event.source,name:'Official athletics meet recap',url:detail.source_url};
      return true;
    }
    return false;
  }

  function isKStateCrossCountry(event){
    return event?.school_id==='kstate'&&event.sport==='Cross Country'&&event.event_type==='MEET'&&event.status==='Final';
  }
  function parseKStateRecapTable(raw,event){
    if(!isKStateCrossCountry(event))return[];
    // Use the labeled results list, not prose that mixes historical PRs, other
    // teams, or athletes whose place follows rather than precedes their time.
    const article=recapArticleText(raw).replace(/[’‘]/g,"'"),rows=[];
    const headings=[...article.matchAll(/\b(Women|Men)'s\s+Team\s+(?:Finishes|Results)\s*\((\d+(?:\.\d+)?)\s*k\b[^)]*\)/gi)];
    for(let i=0;i<headings.length;i++){
      const heading=headings[i],group=`${/^women$/i.test(heading[1])?"Women's":"Men's"} ${heading[2]}K`;
      const section=article.slice(heading.index+heading[0].length,headings[i+1]?.index??article.length);
      const parts=section.split(/K-State(?:'s)?\s+Individual\s+Results/i);if(parts.length!==2)continue;
      const team=parts[0].match(/\b(\d+)\.\s*K-State\s*,\s*(\d+)\s*(?:pts|points)\b/i);
      if(team)rows.push({group,participant:'K-State team',result:`${ordinal(team[1])} · ${team[2]} pts`});
      const individuals=parts[1].split(/--\s*k-statesports|How to follow/i)[0];
      for(const match of individuals.matchAll(/(?:^|\s)(\d+|DNF|DNS)\.\s+([\p{L}][\p{L}'’. -]*?)\s*,\s*(\d{1,2}:\d{2}(?:\.\d+)?|DNF|DNS)\b/gu)){
        const participant=clean(match[2]),result=/^\d+$/.test(match[1])?`${ordinal(match[1])} · ${match[3]}`:match[3];
        rows.push({group,participant,result});
      }
    }
    const seen=new Set();
    return rows.filter(row=>{const key=`${row.group}|${row.participant}`;if(seen.has(key))return false;seen.add(key);return true;});
  }
  function kstateResultsComplete(rows){
    return ["Women's","Men's"].every(division=>{
      const group=rows.filter(row=>row.group.startsWith(division));
      return group.some(row=>/ team$/.test(row.participant))&&group.some(row=>!/ team$/.test(row.participant));
    });
  }
  async function attachKStateRecapResults(event,raw=null,recapUrl=event?.recap_url){
    if(!isKStateCrossCountry(event))return event;
    if(event.recap_result_count&&kstateResultsComplete(event.results||[]))return event;
    const incomplete=()=>{
      event.meet_results_verified=false;event.highlight_state='official_results_partial';
      event.highlight_status='Some official race results could not be loaded. Open the official recap for both divisions.';
      return event;
    };
    try{
      const url=new URL(recapUrl);
      if(!/^(?:www\.)?kstatesports\.com$/i.test(url.hostname)||!url.pathname.startsWith('/news/'))return incomplete();
      if(raw==null){
        const response=await fetch(url.href,{headers:HEADERS,redirect:'follow',signal:AbortSignal.timeout(6500)});
        if(!response.ok)return incomplete();raw=await response.text();
      }
      if(!recapMatchesEvent(raw,event,url.href))return incomplete();
      const rows=parseKStateRecapTable(raw,event);
      if(!rows.length)return incomplete();
      const complete=kstateResultsComplete(rows);
      // Retain a known schedule team placing if its detailed division is missing.
      const missingTeams=(event.results||[]).filter(row=>/ team$/.test(row.participant)&&!rows.some(r=>/ team$/.test(r.participant)&&r.group.split(' ')[0]===row.group.split(' ')[0]));
      event.results=[...rows,...missingTeams];event.result_count=event.results.length;event.has_more_results=event.result_count>3;
      event.recap_result_count=rows.length;event.recap_url=url.href;
      event.source={...event.source,name:'Official athletics meet recap',url:url.href};
      event.headline=event.results.filter(row=>/ team$/.test(row.participant)).map(row=>`${row.group.startsWith("Women's")?"Women's":"Men's"} team: ${row.result}`).join(' / ');
      event.highlights=rows.filter(row=>/ team$/.test(row.participant)).map(row=>`K-State's ${row.group.toLowerCase()} team finished ${row.result.replace(' · ',' with ')}.`);
      for(const division of ["Women's","Men's"]){
        const leader=rows.find(row=>row.group.startsWith(division)&&!/ team$/.test(row.participant));
        if(leader)event.highlights.push(`${leader.participant} led K-State in the ${leader.group.toLowerCase()}, finishing ${leader.result.replace(' · ',' in ')}.`);
      }
      event.highlights_verified=complete;event.meet_results_verified=complete;
      event.highlight_state=complete?'official_recap_results':'official_results_partial';
      event.highlight_status=complete?null:'Some official race results could not be loaded. Open the official recap for both divisions.';
      return event;
    }catch{return incomplete();}
  }
  return {applyVerifiedMeet,isKStateCrossCountry,parseKStateRecapTable,kstateResultsComplete,attachKStateRecapResults};
}
