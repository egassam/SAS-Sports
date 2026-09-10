// Extract only identity-bound Instagram links from official roster cards.
// SIDEARM labels these links "Full Name Instagram profile page", which lets
// us associate the account with an athlete without guessing from a username.
export function rosterSocialInstagrams(raw){
  const accounts=new Map();
  const anchors=/<a\b([^>]*)>/gi;let match;
  while((match=anchors.exec(String(raw||'')))){
    const attrs=match[1];
    const href=(attrs.match(/\bhref=["']([^"']+)["']/i)||[])[1];
    const label=(attrs.match(/\baria-label=["']([^"']+)["']/i)||[])[1];
    if(!href||!label)continue;
    const identity=label.match(/^(.+?)\s+Instagram profile page$/i);if(!identity)continue;
    try{
      const url=new URL(href.replace(/&amp;/gi,'&'));
      if(!/(?:^|\.)instagram\.com$/i.test(url.hostname))continue;
      const parts=url.pathname.split('/').filter(Boolean),handle=(parts[0]||'').replace(/^@/,'');
      if(parts.length!==1||!handle)continue;
      const name=identity[1].replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim().toLowerCase();
      if(name)accounts.set(name,`https://www.instagram.com/${handle}/`);
    }catch{}
  }
  return accounts;
}
