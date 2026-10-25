const fs=require('node:fs'),path=require('node:path');
const {root,assert,sourceHash,save}=require('./transport.cjs');
const {ids,plan}=require('./scenario.cjs');
const dirs=process.argv.slice(2);assert(dirs.length===4,'Pass four run-ID artifact directories in frontier/cas/realtime/incomplete order');
const suite=[],hashes={},runs=[];
ids.forEach((id,i)=>{
 const dir=path.resolve(dirs[i]),load=n=>JSON.parse(fs.readFileSync(path.join(dir,n+'.json'))),s=load('suite'),j=load('transactions'),v=load('verification-'+id);
 const count=plan(id,s[0].fixture_revision).length+1;
 assert(s.length===1&&s[0].id===id&&s[0].source_sha256===sourceHash&&j.source_sha256===sourceHash&&v.source_sha256===sourceHash&&v.live_state_match&&v.transactions.length===count,'Complete source-matched hosted suite');
 const labels=[id+'-deployment',...plan(id,s[0].fixture_revision).map(x=>x.label)];
 assert(Object.keys(j.hashes).length===count,'Exact scenario journal');
 labels.forEach(label=>{assert(!hashes[label]&&j.hashes[label],'Unique receipt');hashes[label]=j.hashes[label];});
 for(const file of [...labels.map(x=>x+'-receipt.json'),id+'-initial-state.json',id+'-final-state.json',id+'-trace.json',id+'-queries.json','verification-'+id+'.json'])fs.copyFileSync(path.join(dir,file),path.join(root,'proofs',file));
 fs.copyFileSync(path.join(dir,'cloud-direct-tests.xml'),path.join(root,'proofs',id+'-direct-tests.xml'));
 const run=path.basename(dir).match(/^run-(\d+)$/)?.[1];assert(run,'Workflow artifact directory');
 runs.push({scenario:id,workflow_run:run,url:'https://github.com/mohammadisina1988-jpg/chrono-cas/actions/runs/'+run});suite.push(s[0]);
});
save('suite',suite);save('transactions',{source_sha256:sourceHash,hashes});save('provenance',{repository:'mohammadisina1988-jpg/chrono-cas',source_sha256:sourceHash,runs});
console.log('Merged four hosted suites; offline replay still required.');
