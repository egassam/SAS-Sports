import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const worker=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

function contains(source,pattern,message){
  assert.match(source,pattern,message);
}
function count(source,text){
  return source.split(text).length-1;
}

// Exact recap identity: opponent, sport and event date must all participate.
contains(worker,/function recapMatchesEvent\(/,'Exact recap matcher must exist');
contains(worker,/florida-state-suffers-seasons-first-loss/,'Florida–Florida State must retain its verified opponent recap');
contains(worker,/eventDay>=today/,'Past-dated events must never remain in the upcoming schedule');
contains(worker,/storyPageContentBody/,'Next-generation official recap bodies must be supported');
contains(worker,/!text\.includes\(opponent\)&&!fuzzyOpponent/,'Opponent mismatch must reject a recap');
contains(worker,/sportName.*return false/,'Sport mismatch must reject a recap');
contains(worker,/urlDate.*published.*dateText/s,'Event date must be verified');
contains(worker,/adjacentPublication/,'Official recaps published the next day must still match the event');
contains(worker,/const direct=target\.recap_url\|\|recapIndex\.map/,'Exact schedule-card recaps must be tried first');

// The same generator must serve all sports, with meaningful sport-specific priorities.
contains(worker,/function highlightPriorities\(sport\)/,'Global sport-aware highlight rules must exist');
contains(worker,/COMBINED_TEAM_SPORTS=new Set\(\['Basketball','Swimming & Diving'\]\)/,'Split men’s and women’s winter feeds must be aggregated');
contains(worker,/team_label,title:`\$\{team_label\} · \$\{event.title\}`/,'Combined winter events must be clearly labeled by team');
contains(worker,/e\.team_label\|\|''/,'Men’s and women’s events must never overwrite one another');
for(const sport of ['football','volleyball','soccer','cross country','basketball','baseball','softball','track','swimming','wrestling','tennis','golf','rowing']){
  assert.ok(worker.includes(`includes('${sport}')`),`Missing highlight priorities for ${sport}`);
}
contains(worker,/Never write bare statements|Reject vague lines/,'Generic one-line highlights must be rejected');
contains(worker,/cleanItems\.length>=3/,'At least three complete highlights are required');

// Feed speed: recaps are lazy and known schools use only explicit official schedules.
contains(worker,/Array\.isArray\(known\)\?known:\[known\]/,'Known sport feeds must use explicit official schedule URLs');
contains(worker,/if\(events\.length&&aiTargetId\)/,'Recap enrichment must remain lazy');
contains(worker,/pathname\.replace\(\/\\\/schedule/,'Unlinked recaps must fall back to the official sport-news archive');
contains(worker,/datePath\?\.test\(link\)/,'News fallback must only inspect articles from the event date');
contains(worker,/const tryCandidates=async urls/,'All recap candidates must use the same exact-match verification');
contains(worker,/const embeddedNews=/,'Escaped WMT news-archive URLs must be discovered');
contains(worker,/const embeddedRelativeNews=/,'Escaped relative Sidearm news-archive URLs must be discovered');
contains(worker,/word\.startsWith\(token\.slice\(0,7\)\)/,'Official recap matching must tolerate adjectival opponent-name variants');
contains(worker,/const payloadRe=\/"content","/,'Embedded WMT article paragraphs must be extracted');
contains(worker,/payloadText\.length>=80/,'Embedded recap text must be substantial before use');
contains(worker,/Highlights are event-specific[\s\S]*no-store, no-cache, must-revalidate/,'Expanded highlights must be revalidated instead of served stale');

// The initial three-school rollout must keep explicit official sources for every
// home-screen sport. A missing route must fail the build before deployment.
const rolloutSchools={
  kstate:'kstatesports.com',
  kansas:'kuathletics.com',
  florida:'floridagators.com',
  arizona:'arizonawildcats.com',
  'arizona-state':'thesundevils.com'
};
for(const [school,domain] of Object.entries(rolloutSchools)){
  for(const sport of ['Cross Country','Soccer','Volleyball','Football']){
    assert.ok(
      worker.includes(`'${school}|${sport}':'https://${domain}/`)||
      worker.includes(`'${school}|${sport}':'https://www.${domain}/`),
      `Missing official ${school} ${sport} source`
    );
  }
}

// Current-season results only.
contains(worker,/filterActiveSeason/,'Active-season filter must exist');
contains(worker,/activeFallSeasonYear/,'Fall results must be constrained to the current season');
contains(worker,/ACADEMIC_YEAR_SPORTS/,'Winter and spring results must be constrained to the current academic year');
contains(worker,/eventYear===startYear&&month>=7/,'Academic-year filtering must exclude the previous spring during fall');
contains(worker,/eventYear===startYear\+1&&month<=6/,'Academic-year filtering must retain the following spring');
contains(worker,/function parseSidearmGameCards\(/,'Next-generation Sidearm game cards must be supported');
contains(worker,/function scheduleYearForDate\(/,'Academic schedule year ranges must be parsed');
contains(worker,/month>=7\?start:end/,'Fall cards must use the first schedule year and spring cards the second');
contains(worker,/Win\|Loss\|Tie\|Draw/,'Expanded SIDEARM result words must be accepted between the outcome marker and score');
contains(worker,/function parseWmtScheduleCards\(/,'WMT schedule cards must be supported');
contains(worker,/schedule-event-item--completed/,'WMT completed events must be recognized as results');
contains(worker,/if\(cardRecap\)event\.recap_url=cardRecap/,'WMT schedule-card recap identity must be preserved');
contains(worker,/\(\?:\(\?!<\\\/a>\)\[\\s\\S\]\)\*\?\\bRecap/,'Recap anchors must not cross a closing anchor boundary');
contains(worker,/delete target\.recap_url/,'Unverified recap URLs must be removed before rendering');
contains(worker,/opponentSchoolFor\(target,school\)/,'Official opponent recaps must be checked when the selected school omits its recap');
contains(worker,/directOpponent=index\.map\.get\(eventMergeKey\(mirror\)\)/,'Opponent recap lookup must mirror the exact teams and event date');
const recapAnchor=/<a\b[^>]*href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*?\bRecap\b(?:(?!<\/a>)[\s\S])*?)<\/a>/i;
const venueThenRecap='<a href="https://maps.google.com/venue">Venue</a><a href="/news/2026/09/03/game-recap"><span>Recap</span></a>';
assert.equal(venueThenRecap.match(recapAnchor)?.[1],'/news/2026/09/03/game-recap','Venue links must never be mislabeled as recaps');
contains(worker,/const scoreText=rawResult\|\|visibleText\(block\)/,'WMT scores split outside the result label must use the full event card');
contains(worker,/visibleText\(block\)\.match\(\/\\b\(\[WLTD\]\)/,'WMT final-score fallback must recover numeric scores from the full card');
contains(worker,/const opponent=opponentLink\|\|meetName/,'Sidearm meet names must be used when no opponent link exists');
contains(worker,/eventType\(sport\)===['"]MEET['"]&&result/,'Sidearm meet placement text must mark a completed meet final');
contains(worker,/if\(raw==null\)return['"]{2}/,'Missing HTML fragments must never become the literal word undefined');
contains(worker,/function parseSchemaEvents\(/,'Schema.org schedule events must be supported');
contains(worker,/const sourceAdapters=\[/,'Publisher adapter registry must exist');
contains(worker,/for\(const adapter of sourceAdapters\)eventLists\.push/,'Every matching source adapter must run instead of stopping on partial results');
contains(worker,/mergeEvents\(eventLists\)/,'Multi-platform parser output must be normalized and merged');
contains(page,/no cached results are being shown as current/i,'UI must not substitute packaged results');
contains(worker,/FEED_FRESH_MS=5\*60\*1000/,'Verified live feeds must have a short freshness window');
contains(worker,/stale-refreshing/,'Stale verified feeds must remain visible while refreshing');
contains(worker,/stale-fallback/,'A temporary official-source failure must fall back to a verified feed');
contains(worker,/for\(const url of urls\)/,'Official fallback URLs must be tried sequentially');
contains(worker,/successful\.push\(item\);if\(!combined\)break/,'Single-team sports must stop after the first usable official schedule');
contains(page,/refresh\.addEventListener\('click',\(\)=>loadFeed\(true\)\)/,'Manual refresh must explicitly bypass the fresh feed cache');
contains(page,/school\.addEventListener\('change',\(\)=>loadFeed\(false\)\)/,'School navigation must use the resilient feed cache');

// Featured athletes: verified Instagram links load after results and never delay scores.
contains(worker,/function verifiedInstagram\(raw\)/,'Athlete Instagram links must be verified');
contains(worker,/VERIFIED_TEAM_TAG_INSTAGRAM/,'Official team-tag Instagram verification must be supported');
contains(worker,/verifiedInstagram\(html\)\|\|VERIFIED_TEAM_TAG_INSTAGRAM/,'Team-tag verification must safely follow direct roster-page verification');
contains(worker,/function rosterProfiles\(raw,base\)/,'Roster profile parser must exist');
contains(worker,/jersey\\s\+number/,'Jersey-number labels must be rejected in favor of athlete names');
contains(worker,/roster\\\/\[\^"'\?#\]\+/,'Complete next-generation roster URLs must be captured before validation');
contains(worker,/\\\/\(\?:staff\|coaches\)\\\//,'Seasonal staff and coach profiles must be excluded from featured athletes');
contains(worker,/Capture the complete roster href first/,'Roster links must not be truncated before staff validation');
contains(worker,/roster\\\/\(\?:player/,'Only complete player-profile URLs may enter the featured athlete carousel');
contains(worker,/return photographed\.length>=3[\s\S]*slice\(0,3\)/,'Featured athletes must be limited to three');
contains(worker,/found\.filter\(a=>a\.instagram_url\)/,'Unverified social accounts must not enter the featured rotation');
contains(worker,/profiles\.slice\(0,9\)/,'Athlete discovery must stay within the proven safe request budget');
contains(worker,/logo\|placeholder\|default/,'Generic logos and placeholder images must be rejected');
contains(worker,/photographed\.length>=3/,'Featured athlete selection must prefer three real portraits');
contains(worker,/srcset\|data-srcset/,'Lazy-loaded roster card portraits must be parsed');
contains(worker,/athleteImage\(m\[2\],base,name,true\)/,'Roster cards must provide the primary portrait source');
contains(worker,/if\(!previous&&image_url\)byUrl\.set\(url,\{name:'',url,image_url\}\)/,'Image-only roster anchors must survive until joined to the athlete name anchor');
contains(worker,/athleteImage\(m\[2\],base,name,true\)/,'Only the athlete’s own roster-card container may be trusted without filename identity');
contains(worker,/if\(!trustedContainer&&!identityMatch\(src,alt\)\)continue/,'Unrelated profile-page images must be rejected globally');
contains(worker,/c-rosterbio__player__image/,'SIDEARM athlete biography portraits must be selected ahead of thumbnail rails');
contains(worker,/add\(src,30\)/,'Designated biography portraits must receive the highest image priority');
contains(worker,/application\\\/ld\\\+json/,'Structured athlete identity records must be inspected for portraits');
contains(worker,/@type.*person.*matchText\(value\.name\)===wantedName/s,'Structured portraits must match the exact athlete name');
contains(worker,/add\(schemaImage,50\)/,'Name-bound structured portraits must outrank visual-page fallbacks');
contains(worker,/imageOwners=new Map/,'Duplicate portraits must be detected across athletes');
contains(worker,/athlete\.image_url=null/,'Duplicate portraits must fall back to safe initials');
contains(worker,/Boolean\(b\.image_url\)/,'Roster profiles with portraits must be prioritized');
contains(worker,/\|\|profile\.image_url/,'Profile-page image lookup must fall back to the roster portrait');
contains(worker,/function rosterPayloadImages\(/,'Embedded WMT roster portrait data must be parsed');
contains(worker,/\(\?:"\[\^"\]\*",\)\?/,'WMT portrait payloads may include an official description between filename and URL');
contains(worker,/pitchfork\|powercat/,'Embedded school marks must be rejected before athlete-photo selection');
contains(worker,/for\(const athlete of found\)if\(athlete\.image_url&&\/\(\?:logo/,'Every publisher portrait source must pass a final generic-image guard');
contains(worker,/replace\(\/\\\\u002F\/gi,'\/'\)/,'Escaped WMT portrait URLs must be decoded');
contains(worker,/payloadImages\.get\(slug\(name\)\)/,'Embedded portraits must be matched to athlete names');
contains(worker,/imgAlt=decodeHtml/,'Image-only roster cards must recover the athlete name from official alt text');
contains(worker,/headshot\|photo/,'Publisher image-label suffixes must not become part of athlete names');
contains(worker,/payloadImages\.get\(slug\(imgTitle\.replace/,'WMT portrait assets must join to roster cards through their official file titles');
contains(worker,/if\(!\/\^https\?:\/i\.test\(url\)\)return/,'Transparent data-URI placeholders must be rejected');
contains(worker,/complete\?21600:300/,'Complete athlete discovery must be cached longer than incomplete portrait sets');
contains(worker,/if\(athletes\.length\)await cache\.put/,'Empty athlete failures must never be cached');
contains(page,/function loadFeaturedAthletes\(/,'Home screen athlete loading must exist');
contains(page,/const AUTO_SEASON_WINDOWS=/,'Automatic season windows must drive the All sports view');
contains(page,/function automaticSports\(date=new Date\(\)\)/,'Active sports must be derived from the current date');
contains(page,/requested=chosen\?\[chosen\]:automaticSports\(\)/,'All sports must request the current season instead of a hard-coded fall list');
contains(page,/inBatches\(requested,4/,'Automatic sport feeds must load within a safe concurrency budget');
contains(page,/inBatches\(groups,4/,'Athlete discovery must load within a safe concurrency budget');
contains(page,/loadFeaturedAthletes\(currentGroups,id\)/,'Athletes must load after the live feed');
contains(page,/Featured Athletes/,'Featured Athletes row must render');
contains(page,/href="\$\{esc\(a\.instagram_url\)\}"/,'Athlete cards must link only to verified Instagram accounts');
contains(page,/rel="noopener noreferrer"/,'External Instagram links must open safely');

// Exactly one prominent official recap action in the modal template.
assert.equal(count(page,'View Full Official Recap'),1,'Expanded results must render exactly one official recap button');

// Branded loading state must always be perceptible, including cached responses.
contains(page,/highlight-loader-mark[^>]*[^]*>SAS</,'SAS loader mark must exist');
contains(page,/Fetching SAS verified highlights…/,'Verified-highlight loading message must exist');
contains(page,/setTimeout\(resolve,1500\)/,'SAS loader must remain visible for 1.5 seconds');

const schoolValidator=readFileSync(new URL('./validate-schools.mjs',import.meta.url),'utf8');
contains(schoolValidator,/for\(const final of finals\)/,'Deep certification must inspect every final event');
contains(schoolValidator,/has no verified highlights/,'A final without verified highlights must fail certification');
contains(schoolValidator,/DEFAULT_SPORTS\.includes\(sport\)&&officialHasCompleted/,'Prior winter results must not cause a false current-season certification failure');
contains(schoolValidator,/recap points outside either official athletics domain/,'Recap URLs must remain on one of the two official athletics domains');
contains(schoolValidator,/recap incorrectly points to a venue or ticket service/,'Venue and ticket links must fail recap certification');

console.log('SAS Sports regression checks passed');
