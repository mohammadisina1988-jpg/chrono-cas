// A merge of already completed hosted fresh checks is not a new live RPC check.
const fs=require('node:fs'),path=require('node:path');
const {root,assert,equal,sourceHash,save}=require('./transport.cjs');
const {ids,plan}=require('./scenario.cjs');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'proofs',name+'.json')));
const offline=load('offline-verification'),provenance=load('provenance'),suite=load('suite');
const count=ids.reduce((n,id,i)=>n+plan(id,suite[i].fixture_revision).length+1,0);
assert(offline.scope==='all'&&offline.mode==='offline-artifact'&&offline.source_sha256===sourceHash&&offline.transactions.length===count,'Complete independent offline replay required');
const reports=ids.map(id=>load('verification-'+id));
reports.forEach((r,i)=>assert(r.scope===ids[i]&&r.mode==='fresh-rpc-and-state'&&r.source_sha256===sourceHash&&r.live_state_match===true&&r.transactions.length===plan(ids[i],suite[i].fixture_revision).length+1&&provenance.runs[i].scenario===ids[i],'Successful hosted fresh receipt, code, state and view verification'));
assert(equal(reports.flatMap(r=>r.transactions),offline.transactions)&&equal(reports.flatMap(r=>r.instances),offline.instances),'Offline replay agrees with every hosted transaction and concurrent-history witness');
save('verification',{...offline,mode:'merged-hosted-fresh-rpc-and-state',verified_at:reports.map(r=>r.verified_at).sort().at(-1),merged_at:new Date().toISOString(),live_state_match:true,local_offline_replay_checked:true,verification_origins:reports.map((r,i)=>({scope:r.scope,workflow_url:provenance.runs[i].url,verified_at:r.verified_at})),note:'Fresh receipt, deployed-source, complete-state and counterfactual RPC checks were performed by the linked hosted workflows at the recorded times. This merge independently matches their results against local offline replay; it makes no additional fresh RPC claim.'});
console.log('Hosted fresh checks match complete local offline replay.');
