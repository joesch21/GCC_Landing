import {createRequire} from 'node:module';
import {mkdtemp,mkdir,cp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
// The existing API test writes a winning NFT. Run the entire server from a disposable
// copy so testing cannot change the user's winningNFT.json or running application.
const root=path.resolve(import.meta.dirname,'..'),fixture=await mkdtemp(path.join(tmpdir(),'gcc-opportunity-test-'));
await cp(path.join(root,'server.js'),path.join(fixture,'server.cjs'));
await cp(path.join(root,'public'),path.join(fixture,'public'),{recursive:true});
await cp(path.join(root,'winningNFT.json'),path.join(fixture,'winningNFT.json'));
const port=process.env.TEST_PORT||'3187',base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,[path.join(fixture,'server.cjs')],{env:{...process.env,PORT:port,NODE_PATH:path.join(root,'node_modules')},stdio:'pipe'});
let browser;
try{
  let ready=false;for(let i=0;i<60;i++){try{const r=await fetch(base+'/network');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'isolated server started');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1672,height:1050}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/network');await page.waitForSelector('html[data-research-ready="true"]');
  assert.equal(await page.locator('h1').textContent(),'GCC Opportunity Surface');
  assert.equal(await page.locator('.research-card').count(),13);
  assert.match(await page.locator('#price').innerText(),/UNAVAILABLE/);
  await mkdir(path.join(root,'artifacts'),{recursive:true});
  await page.screenshot({path:path.join(root,'artifacts/opportunity-desktop-v2.png'),fullPage:true});
  const topRow=await page.locator('.price-card,.lp-card,.scarcity-card,.solver-card').evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().top)));
  assert.equal(new Set(topRow).size,1,'four-card top row');
  assert.equal(await page.locator('#panels img, #panels svg image').count(),0,'all dashboard graphics native');
  assert.equal(await page.locator('.network-svg').getAttribute('data-confirmation'),'unavailable');
  await page.locator('#scenario').check();
  assert.equal(await page.locator('.network-svg').getAttribute('data-confirmation'),'partial');
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);
  await page.locator('[data-copy-agent]').click();
  await page.waitForFunction(()=>document.querySelector('.copy-status').textContent.includes('copied'));
  const copied=JSON.parse(await page.evaluate(()=>navigator.clipboard.readText()));
  assert.equal(copied.price_environment.score,73);assert.equal(copied.mode,'illustrative');
  assert.equal(copied.timestamp,'2026-09-05T00:00:00.000Z');
  await page.locator('[data-copy-agent]').focus();await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.tagName),'PRE','JSON preview is keyboard reachable');
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'none','visible keyboard focus');
  assert.equal(await page.locator('#panels svg[role="img"]:not([aria-label])').count(),0,'chart names available');assert.match(await page.locator('#price').innerText(),/73/);assert.match(await page.locator('#lp').innerText(),/44/);
  await page.locator('[data-window="24h"]').click();assert.equal(await page.locator('[data-window="24h"]').getAttribute('aria-pressed'),'true');assert.match(await page.locator('#price').innerText(),/67/);
  await page.locator('[data-window="48h"]').click();
  await page.locator('[data-json="price"]').click();assert.equal(await page.locator('#json-dialog').evaluate(d=>d.open),true);assert.match(await page.locator('#json-content').innerText(),/"score": 73/);await page.keyboard.press('Escape');assert.equal(await page.locator('#json-dialog').evaluate(d=>d.open),false);assert.equal(await page.evaluate(()=>document.activeElement.dataset.json),'price','dialog restores keyboard focus');
  const iconSizes=await page.locator('.network-node .asset-icon').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));assert.ok(iconSizes.every(width=>width>5&&width<40),'network icons remain within their node viewport');
  await page.screenshot({path:path.join(root,'artifacts/opportunity-desktop-scenario-v2.png'),fullPage:true});
  for(const width of [390,320,768,1024,1280,1672]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no page overflow at ${width}`);
    if(width===390){const positions=await page.locator('.price-card,.lp-card,.macro-card,.network-card,.scarcity-card,.evidence-card,.liquidity-card,.solver-card,.agent-card').evaluateAll(nodes=>nodes.map(n=>({id:n.id,y:n.getBoundingClientRect().top})).sort((a,b)=>a.y-b.y).map(n=>n.id));assert.deepEqual(positions,['price','lp','macro','network-state','scarcity','evidence','liquidity','solver','agents']);await page.screenshot({path:path.join(root,'artifacts/opportunity-mobile-scenario-v2.png'),fullPage:true});}
  }
  await page.locator('#scenario').uncheck();await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'artifacts/opportunity-mobile-v2.png'),fullPage:true});
  for(const url of ['/about','/agents','/network.html','/data/agent/regime.json','/data/agent/network-state.json','/data/agent/liquidity.json','/data/agent/research.json']){const response=await fetch(base+url);assert.equal(response.status,200,url);if(url.endsWith('.json'))assert.ok(await response.json());}
  assert.deepEqual(errors,[]);
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.research-card').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  for(const selector of ['.badge.established','.badge.partial','.badge.not_supported','.metric-caption','.json-key']) {
    const ratio=await page.locator(selector).first().evaluate(el=>{
      const rgb=getComputedStyle(el).color.match(/[\d.]+/g).slice(0,3).map(Number);
      const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      return (luminance(rgb)+.05)/(luminance([14,27,38])+.05);
    });assert.ok(ratio>=4.5,selector+' text contrast over darkest panel base');
  }
  await page.route('**/data/gcc-regime-config.json',route=>route.abort());await page.reload();await page.waitForFunction(()=>document.querySelector('#data-notice').textContent.includes('could not be loaded'));assert.equal(await page.locator('.gauge').count(),0);
  const legacy=spawn(process.execPath,[path.join(root,'testAPI.js')],{env:{...process.env,API_BASE:base},stdio:'pipe'});let log='';legacy.stdout.on('data',chunk=>log+=chunk);legacy.stderr.on('data',chunk=>log+=chunk);await new Promise(resolve=>legacy.on('exit',resolve));assert.ok(!log.includes('Error'),log);console.log('Legacy GET/POST API smoke test passed in isolated fixture.');
  console.log('Browser checks passed: routes, 13 cards, scenario/window controls, JSON dialog, missing data, mobile order, 320/390/768px overflow, console errors. Screenshots in artifacts/.');
}finally{if(browser)await browser.close();server.kill();await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve));await rm(fixture,{recursive:true,force:true});}
