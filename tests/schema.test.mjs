import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async name=>JSON.parse(await readFile(new URL(`../public/data/${name}`,import.meta.url)));
const schema=await read('gcc-regime-schema.json');
// Validate every keyword used by this dependency-free public schema.
function validate(value,s,path='$'){
  if(s.$ref)return validate(value,schema.$defs[s.$ref.split('/').pop()],path);
  if('const' in s)assert.deepEqual(value,s.const,path);
  if(s.enum)assert.ok(s.enum.includes(value),path+' enum');
  if(s.type){const types=Array.isArray(s.type)?s.type:[s.type];assert.ok(types.some(t=>t==='null'?value===null:t==='array'?Array.isArray(value):t==='integer'?Number.isInteger(value):t==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):typeof value===t),path+' type');}
  if(typeof value==='number'){if(s.minimum!==undefined)assert.ok(value>=s.minimum,path);if(s.maximum!==undefined)assert.ok(value<=s.maximum,path);}
  if(s.format==='date-time'&&value!==null)assert.ok(Number.isFinite(Date.parse(value)),path+' timestamp');
  for(const key of s.required||[])assert.ok(Object.hasOwn(value,key),path+'.'+key+' required');
  for(const [key,child] of Object.entries(s.properties||{}))if(Object.hasOwn(value,key))validate(value[key],child,path+'.'+key);
  if(s.items)value.forEach((item,i)=>validate(item,s.items,path+'['+i+']'));
}
test('current and all replay JSON records satisfy the published schema',async()=>{validate(await read('agent/regime.json'),schema);for(const record of (await read('agent/replay-examples.json')).records)validate(record,schema);});
test('schema rejects unsafe execution, malformed scores and missing provenance',async()=>{const record=await read('agent/regime.json');assert.throws(()=>validate({...record,execution_enabled:true},schema));assert.throws(()=>validate({...record,price_environment:{...record.price_environment,score:101}},schema));const broken=structuredClone(record);delete broken.inputs;assert.throws(()=>validate(broken,schema));});
