const fs=require('node:fs'),path=require('node:path');
const {root,assert,equal,digest}=require('./transport.cjs');
const ids=['frontier','cas','realtime','incomplete'],clients=['a','b','c'],fields=['kind','start','end','expected','update','observed'];
const repository='mohammadisina1988-jpg/chrono-cas',args=()=>[repository,0];
const names=id=>id==='frontier'?['overlap','narrow','stale']:id==='cas'?['cas-bad','cas-good']:id==='realtime'?['realtime-bad','realtime-good']:['unknown','resolved'];
const assessment=name=>JSON.parse(fs.readFileSync(path.join(root,'tests',name+'-expected.json')));
function report(name,revision){const raw=fs.readFileSync(path.join(root,'reports',name+'.json'));assert(/^[a-f0-9]{40}$/.test(revision),'Pinned report revision');return {url:'https://raw.githubusercontent.com/'+repository+'/'+revision+'/reports/'+name+'.json',sha256:digest(raw),source:JSON.parse(raw)};}
function transitions(row,value){
 // Declarative relation: used by the independent prefix-state dynamic program.
 if(row.kind==='READ')return row.observed===value?[value]:[];
 if(row.kind==='WRITE')return row.observed==='ACK'?[row.update]:[];
 const equalValue=value===row.expected;
 if(equalValue!==(row.observed==='OK'))return [];
 return [equalValue?row.update:value];
}
function oracle(rows,initials){
 const predecessors=rows.map((row,i)=>rows.reduce((m,other,j)=>i!==j&&other.end<row.start?m|2**j:m,0));
 const reachable=Array.from({length:8},()=>new Set());initials.forEach(v=>reachable[0].add(v));
 for(let mask=0;mask<8;mask++)for(let i=0;i<3;i++){
  if((mask&2**i)||(predecessors[i]&mask)!==predecessors[i])continue;
  for(const value of reachable[mask])for(const next of transitions(rows[i],value))reachable[mask|2**i].add(next);
 }
 return [...reachable[7]].sort((a,b)=>a-b);
}
function validateAnalysis(a,states,boundary,result){
 const rows=a.operations,unknown=rows.flatMap((r,i)=>fields.filter(k=>r[k]==='UNKNOWN').map(k=>clients[i]+':'+k));
 if(unknown.length){assert(equal(result,{status:'INCOMPLETE',unknown}),'All unresolved fields retained');return;}
 const issues=rows.flatMap((r,i)=>[...(r.start>=r.end?[{client:clients[i],reason:'NONPOSITIVE_INTERVAL'}]:[]),...(r.start<=boundary?[{client:clients[i],reason:'CUT_OVERLAP'}]:[])]);
 if(issues.length){assert(equal(result,{status:'INVALID_HISTORY',issues}),'Exact interval/cut rejection');return;}
 const finals=oracle(rows,states),edges=[];
 rows.forEach((r,i)=>rows.forEach((s,j)=>{if(i!==j&&r.end<s.start)edges.push([clients[i],clients[j]]);}));
 assert(equal(Object.keys(result).sort(),['edges','final_states','status','trials'])&&equal(result.final_states,finals)&&result.status===(finals.length?'LINEARIZABLE':'VIOLATION')&&equal(result.edges,edges),'Independent completed-prefix DP decision and full terminal frontier');
 assert(Array.isArray(result.trials)&&result.trials.length===states.length*6,'Complete bounded trial journal');const seen=new Set();
 for(const t of result.trials){
  assert(states.includes(t.initial)&&equal(t.order.slice().sort(),clients),'Exact initial state and client permutation');
  const key=t.initial+':'+t.order.join('');assert(!seen.has(key),'Unique trial');seen.add(key);
  const blocked=edges.find(([x,y])=>t.order.indexOf(x)>t.order.indexOf(y));
  if(blocked){assert(equal(Object.keys(t).sort(),['blocked','initial','order','outcome','path'])&&t.outcome==='ORDER_BLOCKED'&&equal(t.blocked,blocked)&&equal(t.path,[t.initial]),'Concrete real-time counterexample to an order');continue;}
  const path=[t.initial];let current=t.initial,failed=false;
  for(const name of t.order){
   const row=rows[clients.indexOf(name)],next=transitions(row,current);
   if(!next.length){const required=row.kind==='READ'?current:row.kind==='WRITE'?'ACK':current===row.expected?'OK':'FAIL';assert(equal(Object.keys(t).sort(),['client','initial','observed','order','outcome','path','required'])&&t.outcome==='RETURN_MISMATCH'&&t.client===name&&t.observed===row.observed&&t.required===required,'First unsupported return proves failed order');failed=true;break;}
   current=next[0];path.push(current);
  }
  if(!failed)assert(equal(Object.keys(t).sort(),['initial','order','outcome','path'])&&t.outcome==='PASS'&&finals.includes(current),'Legal sequential witness');
  assert(equal(path,t.path),'Every register transition in the witness path');
 }
}
function following(cursor,result,a){return result.status==='LINEARIZABLE'?{round:cursor.round+1,boundary:Math.max(...a.operations.map(r=>r.end)),states:result.final_states}:cursor;}
function validateState(state,id,revision,recorded){
 assert(equal(Object.keys(state).sort(),['configuration','cursor','reports'])&&equal(state.configuration,{repository,initial:0,clients}),'Immutable register scope');
 assert(Array.isArray(state.reports)&&state.reports.length===recorded.length,'Exact report append count');let cursor={round:0,boundary:-1,states:[0]};
 recorded.forEach((name,i)=>{const s=report(name,revision),a=assessment(name),r=state.reports[i];assert(equal(Object.keys(r).sort(),['after','assessment','before','result','sha256','source','url'])&&r.url===s.url&&r.sha256===s.sha256&&equal(r.source,s.source)&&equal(r.assessment,a)&&s.source.round===cursor.round&&equal(r.before,cursor),'Fetched full source, all eighteen decisions and round linkage');validateAnalysis(a,cursor.states,cursor.boundary,r.result);cursor=following(cursor,r.result,a);assert(equal(r.after,cursor),'Only a legal complete wave advances its round, cut and frontier');});
 assert(equal(state.cursor,cursor),'Complete ambiguity-preserving live cursor');
}
function plan(id,revision){
 assert(ids.includes(id),'Known scenario');const first=report(names(id)[0],revision),finalRound=id==='frontier'?2:1;
 return [{label:id+'-reject-hash',method:'audit_report',args:['0',first.url,'f'.repeat(64)],error:'[EXTERNAL] History commitment mismatch'},
  ...names(id).map(name=>{const r=report(name,revision);return {label:id+'-audit-'+name,method:'audit_report',args:[String(r.source.round),r.url,r.sha256],name};}),
  {label:id+'-reject-replay',method:'audit_report',args:[String(finalRound),first.url,first.sha256],error:'[EXPECTED] Report already recorded'},
  {label:id+'-reject-skip',method:'audit_report',args:[String(finalRound+1),first.url,first.sha256],error:'[EXPECTED] Expected current round'}];
}
const queryPlan=id=>names(id).flatMap((_,report)=>[0,1,2,3].map(initial=>({report,initial})));
function validateQuery(value,q,state){const r=state.reports[q.report];assert(equal(Object.keys(value).sort(),['initial','report','result','sha256'])&&value.initial===q.initial&&value.report===r.source.id&&value.sha256===r.sha256,'Source-bound counterfactual');validateAnalysis(r.assessment,[q.initial],r.before.boundary,value.result);}
module.exports={ids,clients,fields,repository,args,names,assessment,report,transitions,oracle,validateAnalysis,following,validateState,plan,queryPlan,validateQuery};
