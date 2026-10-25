const fs=require('node:fs'),path=require('node:path');
const {root,assert,equal,sourceHash,rpc,read,receiptSummary,save}=require('./transport.cjs');
const {decodeReceipt}=require('./receipt-calldata.cjs');
const {ids,args,plan,validateState,queryPlan,validateQuery}=require('./scenario.cjs');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'proofs',name+'.json')));
async function main(){
 const offline=process.argv.includes('--offline'),selected=process.env.CHRONO_SCENARIO||'all',chosen=selected==='all'?ids:[selected];
 assert(chosen.every(x=>ids.includes(x)),'Known verification scope');
 const suite=load('suite'),journal=load('transactions'),revision=fs.readFileSync(path.join(root,'config/fixture-revision.txt'),'utf8').trim();
 const code=fs.readFileSync(path.join(root,'contracts/chrono_cas.py'));assert(journal.source_sha256===sourceHash&&suite.length===chosen.length,'Complete source-bound suite');
 if(!offline)assert(await rpc('eth_chainId',[])==='0xf22f','StudioNet only');
 const hashes=new Set(),summary={scope:selected,mode:offline?'offline-artifact':'fresh-rpc-and-state',verified_at:new Date().toISOString(),source_sha256:sourceHash,instances:[],transactions:[]};
 async function verify(label,hash,d,expected,error){
  const saved=load(label+'-receipt'),r=offline?saved:await rpc('eth_getTransactionByHash',[hash]),s=receiptSummary(r),votes=Object.keys(r.consensus_data.votes).length;
  assert(!hashes.has(hash)&&journal.hashes[label]===hash,'Unique journaled call');hashes.add(hash);
  assert(s.hash===hash&&s.status==='FINALIZED'&&s.result==='MAJORITY_AGREE'&&s.agree>votes/2&&votes===s.agree+s.disagree+s.idle&&votes===r.consensus_data.validators.length+1,'Strict final majority and complete votes');
  assert((r.to_address||r.recipient).toLowerCase()===d.contract.toLowerCase()&&(r.from_address||r.sender).toLowerCase()===d.caller,'Actual signed caller and target');
  assert(equal(saved.data,r.data)&&equal(saved.consensus_data.votes,r.consensus_data.votes)&&equal(await decodeReceipt(r),expected),'Decoded actual calldata and preserved vote map');
  assert(error?s.execution==='ERROR':['SUCCESS','FINISHED_WITH_RETURN'].includes(s.execution),'Expected execution result');
  if(label.endsWith('-deployment'))assert(code.equals(Buffer.from(r.data.contract_code,'base64')),'Exact deployed source bytes');
  if(error){const raw=Buffer.from(r.consensus_data.leader_receipt[0].result,'base64');assert(raw[0]===1&&raw.subarray(1).toString('utf8')===error,'Exact intended rejection bytes');}
  summary.transactions.push({label,...s,recorded_voters:votes,round_count:r.num_of_rounds,rotation_count:r.rotation_count});
 }
 for(let i=0;i<suite.length;i++){
  const d=suite[i],id=chosen[i];assert(d.id===id&&d.network==='studionet'&&d.chain_id===61999&&d.source_sha256===sourceHash&&d.fixture_revision===revision&&equal(d.args,args())&&/^0x[0-9a-f]{40}$/.test(d.caller),'Fixed source-bound deployment');
  await verify(id+'-deployment',d.deployment,d,{args:args()});let before=load(id+'-initial-state');const recorded=[];validateState(before,id,revision,recorded);
  const trace=load(id+'-trace'),items=plan(id,revision);assert(trace.length===items.length,'Complete public scenario plan');
  for(let j=0;j<items.length;j++){
   const item=items[j],t=trace[j];assert(Object.keys(item).every(k=>equal(item[k],t[k]))&&equal(t.state_before,before),'Exact trace linkage');
   await verify(item.label,t.transaction,d,{method:item.method,args:[Number(item.args[0]),...item.args.slice(1)]},item.error);
   if(item.error)assert(equal(before,t.state),'Full rejection rollback');else recorded.push(item.name);
   validateState(t.state,id,revision,recorded);before=t.state;
  }
  assert(equal(before,load(id+'-final-state')),'Complete final report, witness and streaming cursor state');
  const queries=load(id+'-queries'),expected=queryPlan(id);assert(queries.length===expected.length,'Every planned counterfactual');
  for(let j=0;j<queries.length;j++){
   const q=queries[j],p=expected[j];assert(q.report===p.report&&q.initial===p.initial,'Planned source and hypothetical value');validateQuery(q.result,q,before);
   if(!offline)assert(equal(await read(id+'-fresh-simulate-'+j,['call',d.contract,'simulate','--args',String(p.report),String(p.initial)]),q.result),'Fresh counterfactual witness');
  }
  if(!offline){assert(code.equals(Buffer.from(await rpc('gen_getContractCode',[d.contract]),'base64')),'Fresh deployed source');assert(equal(await read(id+'-fresh-final',['call',d.contract,'get_state']),before),'Fresh full sources, assessments, trials, round and state frontier');}
  summary.instances.push({id,contract:d.contract,statuses:before.reports.map(r=>r.result.status),cursor:before.cursor,counterfactuals:queries.length});
 }
 const count=chosen.reduce((n,id)=>n+plan(id,revision).length+1,0);assert(hashes.size===count&&Object.keys(journal.hashes).length===count,'Exactly planned receipt set');
 summary.transaction_calldata_checked=true;summary.rejection_bytes_checked=true;summary.independent_prefix_state_dp=true;
 if(!offline){summary.live_state_match=true;save(selected==='all'?'verification':'verification-'+selected,summary);}else save('offline-verification',summary);
 console.log(JSON.stringify({scope:summary.scope,mode:summary.mode,instances:summary.instances,receipts:summary.transactions.length},null,2));
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
