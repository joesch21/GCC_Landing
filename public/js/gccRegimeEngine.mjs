export const EVIDENCE = Object.freeze({ESTABLISHED:'ESTABLISHED', PARTIAL:'PARTIAL', UNRESOLVED:'UNRESOLVED', NOT_SUPPORTED:'NOT SUPPORTED'});
export function validateConfig(config) {
  for (const key of ['price_environment','lp_environment']) {
    const weights = Object.values(config[key]);
    if (!weights.length || weights.some(w => !Number.isFinite(w) || w < 0) || Math.abs(weights.reduce((a,b)=>a+b,0)-1)>1e-9) throw new Error('Weights must be nonnegative and sum to one');
  }
}
export function classifyAsset(move, config) {
  if (!Number.isFinite(move)) return 'UNAVAILABLE';
  const {strong, neutral} = config.macro_thresholds_pct;
  return move >= strong ? 'STRONG_POSITIVE' : move > neutral ? 'POSITIVE' : move <= -strong ? 'STRONG_NEGATIVE' : move < -neutral ? 'NEGATIVE' : 'NEUTRAL';
}
export function classifyCrypto(macro, config) {
  const values = ['btc','bnb','alts'].map(k=>macro[k]?.move);
  if (!values.every(Number.isFinite)) return 'UNAVAILABLE';
  const [btc,bnb,alts] = values, {neutral,relative_outperformance:gap} = config.macro_thresholds_pct;
  if (Math.max(bnb,alts)-btc >= gap) return 'ALTSEASON / DISPERSION';
  if (values.every(v=>v>neutral)) return 'CRYPTO EXPANSION';
  if (values.every(v=>v< -neutral)) return 'CRYPTO CONTRACTION';
  return 'MIXED / ROTATION';
}
export const getExternalRegime = snapshot => snapshot.macro;
export const getGccNetworkState = snapshot => snapshot.network;
export const getLiquidityState = snapshot => snapshot.lp_inputs;
export const getDispersionState = snapshot => snapshot.network.dispersion;
function score(inputs, weights, penalties, thresholds, mode) {
  const contributions = Object.entries(weights).map(([key,weight]) => {
    const value = inputs[key] ?? null;
    if (value !== null && (!Number.isFinite(value) || value<0 || value>100)) throw new Error('Inputs must be 0–100 or null');
    const adjusted = value === null ? null : penalties.includes(key) ? 100-value : value;
    return {key,value,weight,penalty:penalties.includes(key),contribution:adjusted===null?null:adjusted*weight};
  });
  const complete = contributions.every(c=>c.value!==null);
  const result = complete ? Math.round(contributions.reduce((sum,c)=>sum+c.contribution,0)) : null;
  return {score:result,label:complete?thresholds.find(([min])=>result>=min)[1]:'UNAVAILABLE',confidence:mode==='illustrative'?'ILLUSTRATIVE':'UNRESOLVED',evidence_status:'UNRESOLVED',validation:'NOT_BACKTESTED',inputs,weights,contributions};
}
export function getPriceEnvironmentScore(snapshot,config) {validateConfig(config); return score(snapshot.price_inputs,config.price_environment,[],config.price_thresholds,snapshot.mode);}
export function getLpEnvironmentScore(snapshot,config) {validateConfig(config); return score(snapshot.lp_inputs,config.lp_environment,config.lp_penalties,config.lp_thresholds,snapshot.mode);}
export function evaluate(snapshot,config) {
  if (!['24h','48h','7d'].includes(snapshot.window)) throw new Error('Unsupported window');
  if (snapshot.timestamp !== null && !Number.isFinite(Date.parse(snapshot.timestamp))) throw new Error('Invalid timestamp');
  return {schema_version:'1.0.0',asset:'GCC',network_name:'BSC',window:snapshot.window,model_version:config.version,model_config:structuredClone(config),gcc_price_regime_model:`v${config.version}`,mode:snapshot.mode,timestamp:snapshot.timestamp,price_environment:getPriceEnvironmentScore(snapshot,config),lp_environment:getLpEnvironmentScore(snapshot,config),macro:Object.fromEntries(Object.entries(snapshot.macro).map(([key,value])=>[key,key==='xaut'?'UNRESOLVED':classifyAsset(value.move,config)])),crypto_regime:classifyCrypto(snapshot.macro,config),gold_divergence:Number.isFinite(snapshot.macro.xaut?.move)&&['btc','bnb','alts'].every(k=>Number.isFinite(snapshot.macro[k]?.move)&&snapshot.macro[k].move*snapshot.macro.xaut.move<0),network:snapshot.network,inputs:snapshot,weights:{price:config.price_environment,lp:config.lp_environment},execution_enabled:false};
}
export function makeSnapshot(window='48h',mode='current') {
  const factor = {'24h':0.6,'48h':1,'7d':1.4}[window];
  if (!factor || !['current','illustrative'].includes(mode)) throw new Error('Invalid snapshot request');
  const demo = mode==='illustrative';
  const macro = Object.fromEntries([['btc',2.2],['bnb',5.4],['alts',3.3],['xaut',-0.8]].map(([key,move])=>[key,{move:demo?move*factor:null,move_24h:demo?move*0.6:null,move_48h:demo?move:null,series:demo?[0,move*.18,move*.1,move*.42,move*.32,move*.71,move*.64,move].map(v=>v*factor):[],source:demo?'SYNTHETIC SCENARIO — not market observations':'No market provider connected'}]));
  const regimes = {bnb:100,btc:75,alts:75,network_confirmation:60,dispersion:50,liquidity:60};
  const lp = {fee_opportunity:60,corrective_activity:60,depth_quality:45,productive_dispersion:55,divergence_risk:95,adverse_selection:75,one_sided_movement:70};
  return {timestamp:demo?'2026-09-05T00:00:00.000Z':null,window,mode,macro,price_inputs:Object.fromEntries(Object.entries(regimes).map(([k,v])=>[k,demo?(k==='bnb'? (moveScore(macro.bnb.move)):k==='btc'?moveScore(macro.btc.move):k==='alts'?moveScore(macro.alts.move):v):null])),lp_inputs:Object.fromEntries(Object.entries(lp).map(([k,v])=>[k,demo?v:null])),network:{dispersion:demo?'compressing':'unavailable',compression:demo?'illustrative':'unavailable',liquidity_health:demo?'mixed':'unavailable',confirmation:demo?'partial':'unavailable',connected_asset_breadth:demo?'3 / 3 positive (synthetic)':'unavailable'},historical_pool_prior:'Informational only; see B8 research'};
}
// Default scenario normalization mirrors v0.1 thresholds; providers supply normalized inputs for replay.
function moveScore(move) {return move>=5?100:move>0.5?75:move<=-5?0:move< -0.5?25:50;}
