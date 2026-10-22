// TFRRS (tfrrs.org) cross-country pages look the same for every school, so
// school modules share these readers: find a meet on a team's TFRRS page,
// then read that school's races from the meet's results page. Each module
// keeps its own attach hook (team URLs, headline wording, which places the
// schedule publishes) and passes its TFRRS team name here.

export const tfrrsText=(decodeHtml,value)=>decodeHtml(String(value).replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
export const tfrrsCells=(decodeHtml,tr)=>[...tr.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell=>tfrrsText(decodeHtml,cell[1]));

// The team page's row for this meet: the same date (a team runs one meet a
// day) and the name. Names differ between the two sites ("All-Ohio
// Intercollegiate Classic" on the schedule, "All-Ohio InterCollegiate
// Challenge" on TFRRS), so by default one shared distinctive word is enough
// (match:'any'). match:'all' needs every long word of the card's name
// ("Southern Showcase" in "Southern Showcase (University/College)").
const GENERIC=new Set(['classic','challenge','invitational','invite','championships','championship','meet','cross','country','open','college','university']);
export function findTfrrsMeet(raw,{decodeHtml,date,name,match='any'}){
  const words=match==='all'
    ?value=>tfrrsText(decodeHtml,value).toLowerCase().replace(/^the\s+/,'').replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(word=>word.length>=4)
    // A plural and its singular are one word ("Pre-Nationals" on the
    // schedule, "Pre-National Invitational" on TFRRS: Oct 16, eleven schools).
    :value=>tfrrsText(decodeHtml,value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(word=>word.length>=4&&!GENERIC.has(word)&&!/^\d+$/.test(word)).map(word=>word.replace(/(?<=[^s])s$/,''));
  const wanted=words(name);
  for(const tr of String(raw||'').matchAll(/<tr\b[\s\S]*?<\/tr>/gi)){
    const link=tr[0].match(/href=["']((?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/\d+\/[^"']*)["']/i);
    if(!link)continue;
    const [day,meet]=tfrrsCells(decodeHtml,tr[0]);
    if(Date.parse(`${day} 12:00 UTC`)!==Date.parse(`${date} 12:00 UTC`))continue;
    const have=new Set(words(meet));
    const found=match==='all'?wanted.length&&wanted.every(word=>have.has(word)):wanted.some(word=>have.has(word));
    if(found)return new URL(link[1],'https://www.tfrrs.org').href;
  }
  return null;
}

// The team page's only meet on a day, or null (none, or several).
export function onlyTfrrsMeetOn(raw,{decodeHtml,date}){
  const found=[];
  for(const tr of String(raw||'').matchAll(/<tr\b[\s\S]*?<\/tr>/gi)){
    const link=tr[0].match(/href=["']((?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/\d+\/[^"']*)["']/i);
    if(!link)continue;
    const [day]=tfrrsCells(decodeHtml,tr[0]);
    if(Date.parse(`${day} 12:00 UTC`)===Date.parse(`${date} 12:00 UTC`))found.push(new URL(link[1],'https://www.tfrrs.org').href);
  }
  return new Set(found).size===1?found[0]:null;
}

// One school's races at one meet, women first: the team result (when the
// school scored as a team) and every runner of the school, by the TEAM
// column only (App State's "Baylor Wolfe" is not Baylor). A race the school
// did not run is left out. A team listed with 0 points ("W-NTS") has no
// team result. A second race for the same team ("... CC Open") is labeled.
// The team name a TFRRS team page uses for its school ("TFRRS | Pittsburgh
// Men's Cross Country Results", "Xavier (Ohio)", "Connecticut"), or null.
export function tfrrsTeamName(raw,decodeHtml){
  const title=(String(raw||'').match(/<title>([\s\S]*?)<\/title>/i)||[])[1];
  return (tfrrsText(decodeHtml,title||'').match(/^TFRRS \| (.+?) (?:Wo)?Men['\u2019]s Cross Country\b/i)||[])[1]||null;
}

export function parseTfrrsResults(raw,{decodeHtml,ordinal,team}){
  // TFRRS shortens some schools' "State" to "St." ("Colorado St.", "San
  // Diego St.", "Washington St."; Oct 19: their races never matched): the
  // short name is read only when the full one has no rows.
  const races=parseTfrrsResultsAs(raw,{decodeHtml,ordinal,team});
  const shortName=String(team||'').replace(/ State$/,' St.');
  return races.length||shortName===team?races:parseTfrrsResultsAs(raw,{decodeHtml,ordinal,team:shortName});
}
function parseTfrrsResultsAs(raw,{decodeHtml,ordinal,team:teamName}){
  const races=new Map();
  const sections=String(raw||'').split(/<div\b[^>]*class=["'][^"']*custom-table-title/i).slice(1);
  const titleOf=section=>tfrrsText(decodeHtml,(section.match(/<h3\b[^>]*>([\s\S]*?)<span\b/i)||section.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)||section.match(/^[^>]*>([\s\S]*?)<\/div>/)||[])[1]||'');
  // A meet whose races name no team ("Bengal Invite Team Results (8k)",
  // "(5k)": Idaho State's Bengal Invitational, Oct 2): with exactly two
  // distances, the longer race is the men's.
  const UNNAMED=/^(?!.*\b(?:wo)?men(?:['\u2019]?s)?\b).*?\b(Team|Individual) Results\s*\(([^)]+)\)/i;
  const kilometers=distance=>Number((String(distance).match(/^(\d+(?:\.\d+)?)\s*k$/i)||[])[1]);
  const unnamed=[...new Set(sections.map(section=>titleOf(section).match(UNNAMED)?.[2]).filter(distance=>kilometers(distance)))].sort((a,b)=>kilometers(a)-kilometers(b));
  for(const section of sections){
    const title=titleOf(section);
    const bare=unnamed.length===2&&title.match(UNNAMED);
    const race=bare?[title,bare[2]===unnamed[1]?'Men':'Women','',bare[1],bare[2]]:title.match(/\b(Women|Men)(?:['\u2019]?s)?\b(.*?)\b(Team|Individual) Results\s*\(([^)]+)\)/i);
    if(!race)continue;
    const team=race[1][0].toUpperCase()+race[1].slice(1).toLowerCase();
    const distance=race[4].trim().replace(/^(\d+(?:\.\d+)?)\s*k$/i,'$1K');
    const open=/\bOpen\b/i.test(race[2]);
    const group=`${team}'s ${distance}${open?' Open':''}`;
    // The race's own name ("Blue", "White", "B Race", "Championship"):
    // a meet with several races of one distance keeps them apart.
    const label=race[2].replace(/\bOpen\b/i,'').replace(/\b\d+(?:\.\d+)?\s*(?:k|km|m|mile|miles)\b/gi,'').replace(/\bRun CC\b/i,'').replace(/\s+/g,' ').trim();
    const table=(section.match(/<table\b[\s\S]*?<\/table>/i)||[])[0]||'';
    const rows=[...table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(tr=>tfrrsCells(decodeHtml,tr[0]));
    const head=(rows[0]||[]).map(value=>value.toUpperCase());
    const at=name=>head.indexOf(name);
    const key=`${group}|${label}`;
    const entry=races.get(key)||{team,group,label,result:null,runners:[]};
    if(/team/i.test(race[3])&&at('SCORE')>=0){
      const row=rows.slice(1).find(cells=>cells[at('TEAM')]===teamName);
      if(row&&/^\d+$/.test(row[at('PL')])&&/^[1-9]\d*$/.test(row[at('SCORE')])){
        // A table out of score order (the Roy Griak Invitational, Sep 18:
        // host Minnesota listed 16th with 26 points, the lowest) places the
        // team by its score among the scored teams.
        const scored=rows.slice(1).filter(cells=>/^\d+$/.test(cells[at('PL')])&&/^[1-9]\d*$/.test(cells[at('SCORE')])).map(cells=>Number(cells[at('SCORE')]));
        const sorted=scored.every((score,i)=>!i||score>=scored[i-1]);
        entry.result={place:sorted?Number(row[at('PL')]):1+scored.filter(score=>score<Number(row[at('SCORE')])).length,score:row[at('SCORE')]};
      }
    }else if(at('NAME')>=0&&at('TIME')>=0){
      const runners=rows.slice(1).filter(cells=>cells[at('TEAM')]===teamName).map(cells=>{
        const place=cells[at('PL')],time=cells[at('TIME')];
        return{participant:cells[at('NAME')],place,result:/^\d+$/.test(place)?`${ordinal(place)} \u00b7 ${time}`:`${place} \u00b7 ${time}`};
      }).filter(row=>row.participant&&(/\d:\d{2}/.test(row.result)||/^(?:DNF|DNS)\b/i.test(row.result)));
      if(runners.length)entry.runners=runners;
    }
    races.set(key,entry);
  }
  // Races by color share a group (the Joe Piane Invitational's Blue and
  // Gold) when the school ran one of them; when it ran several (Notre Dame
  // and Pitt in the Pre-National's Blue and White, Oct 16: their places and
  // runners were mixed) each race is named.
  const run=[...races.values()].filter(race=>race.runners.length);
  const shared=new Set(run.filter(race=>run.some(other=>other!==race&&other.group===race.group)));
  for(const race of run){
    if(race.label&&shared.has(race))race.group=race.group.replace(/^(\w+'s) /,`$1 ${race.label} `);
    delete race.label;
  }
  return run.sort((a,b)=>(a.team==='Women'?0:1)-(b.team==='Women'?0:1));
}

// A school's races at one meet, in the order they are shown: women first;
// a team's main race before its Open race, and of two races of one distance
// the bigger field's (more points: the Nuttycombe's Championship before its B
// Race). The schedule's team places ("Women's team: 12th") name the race that
// leads when the team ran several (the Pre-National's Blue and White); false
// when a published place is in none of them.
export function orderTfrrsRaces(races,headline){
  const open=race=>/ Open$/.test(race.group)?1:0;
  races.sort((a,b)=>(a.team==='Women'?0:1)-(b.team==='Women'?0:1)||open(a)-open(b)||Number(b.result?.score||0)-Number(a.result?.score||0));
  const published=Object.fromEntries([...String(headline||'').matchAll(/\b(Men|Women)'s team: (T?\d+)\w\w/g)].map(m=>[m[1],m[2]]));
  for(const [team,place] of Object.entries(published)){
    const race=races.find(race=>race.team===team&&race.result&&String(race.result.place)===place.replace(/^T/,''));
    if(!race)return false;
    const first=races.findIndex(other=>other.team===team);
    if(races[first]!==race){races.splice(races.indexOf(race),1);races.splice(first,0,race);}
  }
  return true;
}
