const fs=require('node:fs');
const {validateState,validateQuery}=require('./scenario.cjs');
const x=JSON.parse(fs.readFileSync(0,'utf8'));
validateState(x.state,x.id,'a'.repeat(40),x.names);
x.queries.forEach(q=>validateQuery(q.result,q,x.state));
console.log('Actual VM matches independent prefix-state DP and witness checker');
