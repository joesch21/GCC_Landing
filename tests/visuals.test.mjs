import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Gauge,MiniSparkline,topology,SupplyGraphic,SolverOutcome,bars,EvidenceBadge,EvidenceMatrix,AgentJsonPanel,agentPreview} from '../public/js/opportunityVisuals.mjs';
import {evaluate,makeSnapshot} from '../public/js/gccRegimeEngine.mjs';
const read=async file=>JSON.parse(await readFile(new URL('../public/data/'+file,import.meta.url)));
const config=await read('gcc-regime-config.json'),research=await read('gcc-network-research.json');
test('native gauge arc and summary follow the score, including absence',()=>{
  const output=evaluate(makeSnapshot('48h','illustrative'),config);
  const html=Gauge(output.price_environment,'Price');assert.match(html,/stroke-dasharray="73 100"/);
  assert.match(Gauge({...output.price_environment,score:20},'Price'),/stroke-dasharray="20 100"/);
  const missing=Gauge(evaluate(makeSnapshot(),config).price_environment,'Price');assert.match(missing,/AWAITING MARKET DATA/);assert.doesNotMatch(missing,/class="gauge-value"/);
});
test('sparkline points and network state respond to inputs',()=>{
  assert.notEqual(MiniSparkline([1,2,4],'BTC'),MiniSparkline([1,4,2],'BTC'));
  assert.match(MiniSparkline([],'BTC'),/UNAVAILABLE/);
  assert.notEqual(topology({confirmation:'unavailable',dispersion:'unavailable'}),topology({confirmation:'partial',dispersion:'compressing'}));
  assert.match(topology({confirmation:'partial',dispersion:'compressing'}),/primary-edge/);
  assert.match(topology({confirmation:'partial',dispersion:'compressing'}),/data-state="unresolved"/);
});
test('supply proportion and accessible summary are calculated from balances',()=>{
  const metrics=structuredClone(research.metrics);metrics.find(x=>x.id==='dead_wallet_balance').value=100000;
  const html=SupplyGraphic(metrics);assert.match(html,/--supply-share:10%/);assert.match(html,/10.00 percent/);
});
test('solver matrix and labels react to revised source data',()=>{
  const metrics=structuredClone(research.metrics);metrics.find(x=>x.id==='solver_events').value='3/5';metrics.find(x=>x.id==='solver_profitable_routes').value=1;
  const html=SolverOutcome(metrics);assert.equal((html.match(/<i /g)||[]).length,5);assert.equal((html.match(/class="missing"/g)||[]).length,2);assert.equal((html.match(/class="profitable"/g)||[]).length,1);assert.match(html,/3 of 5 routes settled; 1 profitable/);
});
test('bars auto-scale and expose signed values and coefficient intervals',()=>{
  const html=bars([{label:'test',value:-240}],120);assert.match(html,/--bar-start:0%;--bar-width:50%/);assert.match(html,/-240.00/);
  assert.match(bars([{label:'BNB',value:1,ci:[.6,1.3]}],1.4,'β'),/95% interval 0.6 to 1.3/);
});
test('evidence and terminal content come from structured state',()=>{
  assert.match(EvidenceBadge('NOT_SUPPORTED'),/×.*NOT SUPPORTED/s);
  assert.match(EvidenceMatrix({UNRESOLVED:['Test claim']}),/Test claim/);
  const output=evaluate(makeSnapshot(),config);assert.equal(agentPreview(output).timestamp,null);
  assert.match(AgentJsonPanel(output),/TIMESTAMP · UNAVAILABLE/);assert.match(AgentJsonPanel(output),/data-copy-agent/);
});
test('reference image is never a dashboard dependency',async()=>{
  for(const file of ['opportunity.html','opportunity-v2.css','js/opportunityVisuals.mjs']){
    const source=await readFile(new URL('../public/'+file,import.meta.url),'utf8');
    assert.doesNotMatch(source,/gold_condor_network_intelligence_dashboard|artifacts\/reference|data:image|<image\s/);
  }
});
