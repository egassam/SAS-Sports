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
    :value=>tfrrsText(decodeHtml,value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(word=>word.length>=4&&!GENERIC.has(word)&&!/^\d+$/.test(word));
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

// One school's races at one meet, women first: the team result (when the
// school scored as a team) and every runner of the school, by the TEAM
// column only (App State's "Baylor Wolfe" is not Baylor). A race the school
// did not run is left out. A team listed with 0 points ("W-NTS") has no
// team result. A second race for the same team ("... CC Open") is labeled.
export function parseTfrrsResults(raw,{decodeHtml,ordinal,team:teamName}){
  const races=new Map();
  for(const section of String(raw||'').split(/<div\b[^>]*class=["'][^"']*custom-table-title/i).slice(1)){
    const title=tfrrsText(decodeHtml,(section.match(/<h3\b[^>]*>([\s\S]*?)<span\b/i)||section.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)||section.match(/^[^>]*>([\s\S]*?)<\/div>/)||[])[1]||'');
    const race=title.match(/\b(Women|Men)(?:['\u2019]?s)?\b(.*?)\b(Team|Individual) Results\s*\(([^)]+)\)/i);
    if(!race)continue;
    const team=race[1][0].toUpperCase()+race[1].slice(1).toLowerCase();
    const distance=race[4].trim().replace(/^(\d+(?:\.\d+)?)\s*k$/i,'$1K');
    const open=/\bOpen\b/i.test(race[2]);
    const group=`${team}'s ${distance}${open?' Open':''}`;
    const table=(section.match(/<table\b[\s\S]*?<\/table>/i)||[])[0]||'';
    const rows=[...table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(tr=>tfrrsCells(decodeHtml,tr[0]));
    const head=(rows[0]||[]).map(value=>value.toUpperCase());
    const at=name=>head.indexOf(name);
    const entry=races.get(group)||{team,group,result:null,runners:[]};
    if(/team/i.test(race[3])&&at('SCORE')>=0){
      const row=rows.slice(1).find(cells=>cells[at('TEAM')]===teamName);
      if(row&&/^\d+$/.test(row[at('PL')])&&/^[1-9]\d*$/.test(row[at('SCORE')]))entry.result={place:Number(row[at('PL')]),score:row[at('SCORE')]};
    }else if(at('NAME')>=0&&at('TIME')>=0){
      entry.runners=rows.slice(1).filter(cells=>cells[at('TEAM')]===teamName).map(cells=>{
        const place=cells[at('PL')],time=cells[at('TIME')];
        return{participant:cells[at('NAME')],place,result:/^\d+$/.test(place)?`${ordinal(place)} \u00b7 ${time}`:`${place} \u00b7 ${time}`};
      }).filter(row=>row.participant&&(/\d:\d{2}/.test(row.result)||/^(?:DNF|DNS)\b/i.test(row.result)));
    }
    races.set(group,entry);
  }
  return[...races.values()].filter(race=>race.runners.length).sort((a,b)=>(a.team==='Women'?0:1)-(b.team==='Women'?0:1));
}
