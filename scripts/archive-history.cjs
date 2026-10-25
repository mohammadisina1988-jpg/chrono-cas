// Preserve prior attempts separately; they never satisfy the primary verifier.
const fs=require('node:fs'),path=require('node:path');
const {root,assert,digest,receiptSummary}=require('./transport.cjs');
const dirs=process.argv.slice(2);assert(dirs.length>0,'Pass historical run-ID artifact directories');
const runs=[];
for(const dirArg of dirs){
 const dir=path.resolve(dirArg),run=path.basename(dir).match(/^run-(\d+)$/)?.[1];assert(run,'Historical workflow directory');
 const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n+'.json'))),suite=read('suite'),journal=read('transactions');
 assert(suite.length===1&&suite[0].source_sha256===journal.source_sha256,'Historical source-bound suite');
 const files=fs.readdirSync(dir).filter(f=>f.endsWith('.json')||f.endsWith('.xml'));
 const receipts=files.filter(f=>f.endsWith('-receipt.json')).map(file=>{
  const label=file.slice(0,-'-receipt.json'.length),r=JSON.parse(fs.readFileSync(path.join(dir,file))),s=receiptSummary(r);
  assert(journal.hashes[label]===s.hash,'Historical hash linkage');
  if(label.endsWith('-deployment'))assert(digest(Buffer.from(r.data.contract_code,'base64'))===journal.source_sha256,'Historical deployed bytes match their recorded source');
  return {label,...s};
 });
 assert(receipts.length===Object.keys(journal.hashes).length,'Every submitted historical hash has a retained receipt');
 const output=path.join(root,'proofs','historical','run-'+run);fs.mkdirSync(output,{recursive:true});
 files.forEach(file=>fs.copyFileSync(path.join(dir,file),path.join(output,file)));
 runs.push({run,scenario:suite[0].id,source_sha256:journal.source_sha256,workflow_url:'https://github.com/mohammadisina1988-jpg/chrono-cas/actions/runs/'+run,has_hosted_fresh_report:files.includes('verification-'+suite[0].id+'.json'),transactions:receipts});
}
const target=path.join(root,'proofs/historical');
fs.writeFileSync(path.join(target,'index.json'),JSON.stringify({scope:'historical-only',note:'These earlier attempts are separate from the final source-matched primary set. A retained earlier hosted report describes checks at its own time; archival inspection is not a new live RPC pass.',runs},null,2)+'\n');
let md='# Historical attempts — excluded from primary proof totals\n\n';
md+='Earlier source versions and unsuccessful consensus attempts remain available here. They are not included in the final 25-receipt passing set. Archive checks establish journal/hash linkage and deployed-source byte identity, not a new fresh live-state verification.\n\n';
md+='| Workflow | Scenario | Source SHA-256 | Receipts | Recorded outcomes |\n|---|---|---|---|---|\n';
runs.forEach(r=>{md+='| [run '+r.run+']('+r.workflow_url+') | '+r.scenario+' | `'+r.source_sha256+'` | '+r.transactions.length+' | '+[...new Set(r.transactions.map(t=>t.result))].join(', ')+' |\n';});
md+='\n[Index with every transaction hash](index.json). The run directories retain full receipts, vote maps, sources, state/trace files where produced and direct-test reports. A leader SUCCESS accompanied by MAJORITY_DISAGREE is a rejected consensus attempt, never a passing audit.\n';
fs.writeFileSync(path.join(target,'README.md'),md);
console.log(JSON.stringify({historical_runs:runs.length,historical_receipts:runs.reduce((n,r)=>n+r.transactions.length,0)}));
