import json
import subprocess
import pytest
from support import ROOT,deploy,acquire


@pytest.mark.parametrize('case,names',[('frontier',['overlap','narrow','stale']),('cas',['cas-bad','cas-good']),
    ('realtime',['realtime-bad','realtime-good']),('incomplete',['unknown','resolved'])])
def test_actual_vm_against_live_javascript_prefix_dp(direct_vm,direct_deploy,case,names):
    c = deploy(direct_deploy)
    for name in names: acquire(c,direct_vm,name)
    queries = [{'report':i,'initial':j,'result':c.simulate(i,j)} for i in range(len(names)) for j in range(4)]
    out = subprocess.run(['node','scripts/check-local-trace.cjs'],cwd=ROOT,input=json.dumps({'id':case,'names':names,'state':c.get_state(),'queries':queries}),text=True,capture_output=True)
    assert out.returncode == 0,out.stdout+out.stderr
