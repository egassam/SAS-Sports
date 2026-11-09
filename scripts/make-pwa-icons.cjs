// Draws the installable-app icons in public/icons from the site's "SAS" mark
// (user, November 9, 2026: "Begin the pwa"). Needs Playwright and the Inter font:
//   node scripts/make-pwa-icons.cjs public/icons
const {chromium}=require('playwright');
const out=process.argv[2];
// kind: any = rounded tile on transparent; full = full-bleed square (maskable / Apple)
const page=(size,kind)=>{
  const full=kind!=='any', text=kind==='maskable'?0.26:0.34, r=full?0:Math.round(size*0.22);
  return `<!doctype html><html><body style="margin:0;background:transparent">
  <div style="width:${size}px;height:${size}px;border-radius:${r}px;display:grid;place-items:center;
   background:linear-gradient(135deg,#7cf7c4,#42d3ff);font-family:Inter;font-weight:900;
   letter-spacing:-${(size*0.02).toFixed(1)}px;color:#07111f;font-size:${Math.round(size*text)}px">SAS</div></body></html>`;
};
(async()=>{
  const b=await chromium.launch();
  const jobs=[['icon-192.png',192,'any'],['icon-512.png',512,'any'],['maskable-512.png',512,'maskable'],['maskable-192.png',192,'maskable'],['apple-touch-icon.png',180,'full']];
  for(const [name,size,kind] of jobs){
    const p=await b.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
    await p.setContent(page(size,kind));
    await p.screenshot({path:`${out}/${name}`,omitBackground:kind==='any'});
    await p.close();
  }
  await b.close();
})();
