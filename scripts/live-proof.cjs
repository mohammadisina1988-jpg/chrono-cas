const fs=require('node:fs'),path=require('node:path');
const {root,assert,equal,sourceHash,invoke,read,rpc,receipt,save}=require('./transport.cjs');
const {ids,args,plan,validateState,queryPlan,validateQuery}=require('./scenario.cjs');
async function main(){
 const id=process.env.CHRONO_SCENARIO;assert(ids.includes(id),'Select a complete history scenario');
 const accounts=JSON.parse(process.env.CHRONO_ACCOUNTS||'[]');assert(accounts.length===1,'One disposable CLI caller');
 const account=accounts[0];process.env.CHRONO_ACCOUNT=account.name;
 assert(await rpc('eth_chainId',[])==='0xf22f','StudioNet only');
 const revision=fs.readFileSync(path.join(root,'config/fixture-revision.txt'),'utf8').trim();
 const hash=await invoke(id+'-deployment',['deploy','--contract','contracts/chrono_cas.py','--args',...args().map(String)]);
 const deployed=await receipt(id+'-deployment',hash,true),contract=deployed.to_address||deployed.recipient;assert(/^0x[a-fA-F0-9]{40}$/.test(contract),'Actual deployment address');
 save('suite',[{id,network:'studionet',chain_id:61999,contract,deployment:hash,caller:account.address,args:args(),fixture_revision:revision,source_sha256:sourceHash}]);
 let before=await read(id+'-initial',['call',contract,'get_state']);const recorded=[],trace=[];
 validateState(before,id,revision,recorded);save(id+'-initial-state',before);
 for(const item of plan(id,revision)){
  const h=await invoke(item.label,['write',contract,item.method,'--args',...item.args]);
  await receipt(item.label,h,!item.error);
  const state=await read(item.label+'-state',['call',contract,'get_state']);
  if(item.error)assert(equal(before,state),'Rejected call leaves entire state unchanged');else recorded.push(item.name);
  validateState(state,id,revision,recorded);trace.push({...item,transaction:h,state_before:before,state});save(id+'-trace',trace);before=state;
 }
 save(id+'-final-state',before);const queries=[];
 for(const q of queryPlan(id)){
  const result=await read(id+'-simulate-'+q.report+'-'+q.initial,['call',contract,'simulate','--args',String(q.report),String(q.initial)]);
  validateQuery(result,q,before);queries.push({...q,result});save(id+'-queries',queries);
 }
 console.log('PASSED '+id+': '+(trace.length+1)+' finalized receipts and '+queries.length+' independent prefix-DP counterfactuals');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
