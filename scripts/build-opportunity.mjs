import {readFile,mkdir,writeFile,cp} from 'node:fs/promises';
import {evaluate,makeSnapshot} from '../public/js/gccRegimeEngine.mjs';
const read=async file=>JSON.parse(await readFile(new URL(`../public/data/${file}`,import.meta.url),'utf8'));
const config=await read('gcc-regime-config.json'),research=await read('gcc-network-research.json'),extra=await read('gcc-opportunity-research.json');
const output=evaluate(makeSnapshot(),config);
const exports={regime:output,'network-state':{...extra.agent,state:output.network,timestamp:null,mode:'current_unavailable'},liquidity:{mode:'historical_research',source:'LE1-B8 / lp_total_return.csv',definition:extra.definitions.lp_vs_hodl,results:research.lp_results,current_environment:output.lp_environment},research:{...extra,metrics:research.metrics},'replay-examples':{mode:'illustrative',warning:'Synthetic test fixtures, not market observations',records:['24h','48h','7d'].map(window=>evaluate(makeSnapshot(window,'illustrative'),config))}};
await mkdir(new URL('../public/data/agent/',import.meta.url),{recursive:true});
for(const [name,value] of Object.entries(exports)) await writeFile(new URL(`../public/data/agent/${name}.json`,import.meta.url),JSON.stringify(value,null,2)+'\n');
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
await cp(new URL('../public/',import.meta.url),new URL('../dist/',import.meta.url),{recursive:true});
for(const [route,file] of Object.entries({network:'opportunity',about:'about',agents:'agents'})){
  await mkdir(new URL(`../dist/${route}/`,import.meta.url),{recursive:true});
  await cp(new URL(`../public/${file}.html`,import.meta.url),new URL(`../dist/${route}/index.html`,import.meta.url));
}
console.log('Built static production artifact in dist/ and public/data/agent/*.json. No live feeds or execution.');
