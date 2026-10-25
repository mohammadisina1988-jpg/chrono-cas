import hashlib
import json
import re
import pytest
from support import F,CLIENTS,FIELDS,answer,record,deploy,mocks,acquire,verify


@pytest.mark.parametrize('names,statuses',[(('overlap','narrow','stale'),['LINEARIZABLE','LINEARIZABLE','INVALID_HISTORY']),
    (('cas-bad','cas-good'),['VIOLATION','LINEARIZABLE']), (('realtime-bad','realtime-good'),['VIOLATION','LINEARIZABLE']),
    (('unknown','resolved'),['INCOMPLETE','LINEARIZABLE'])])
def test_actual_stream_full_source_round_gate_frontier_and_counterfactuals(direct_vm,direct_deploy,names,statuses):
    c = deploy(direct_deploy)
    for name,status in zip(names,statuses):
        before = c.get_state()['cursor']
        r = acquire(c,direct_vm,name)
        assert r['source'] == json.loads(record(name)[2]) and r['assessment'] == answer(name)
        assert r['before'] == before and r['result']['status'] == status
        assert r['after'] == F['advance'](before,r['result'],answer(name))
        if status in ['LINEARIZABLE','VIOLATION']: verify(answer(name),before['states'],r['result'])
        if status != 'LINEARIZABLE': assert c.get_state()['cursor'] == before
    state = c.get_state()
    for i,name in enumerate(names):
        for initial in range(4):
            out = c.simulate(i,initial)
            assert out['result'] == F['analyze'](answer(name),[initial],state['reports'][i]['before']['boundary'])
    assert c.get_state() == state
    with direct_vm.expect_revert('Report already recorded'): c.audit_report(state['cursor']['round'],*record(names[0])[:2])
    with direct_vm.expect_revert('Expected current round'): c.audit_report(state['cursor']['round']+1,*record(names[0])[:2])
    assert c.get_state() == state


def test_permissionless_progress_and_failed_round_cannot_be_skipped(direct_vm,direct_deploy,direct_accounts):
    c = deploy(direct_deploy)
    direct_vm.sender = direct_accounts[1]
    acquire(c,direct_vm,'cas-bad')
    assert c.get_state()['cursor']['round'] == 0
    with direct_vm.expect_revert('Expected current round'): c.audit_report(1,*record('narrow')[:2])
    direct_vm.sender = direct_accounts[2]
    acquire(c,direct_vm,'cas-good')
    assert c.get_state()['cursor'] == {'round':1,'boundary':5,'states':[1]}


@pytest.mark.parametrize('position',range(18))
def test_validator_rejects_every_independent_field_disagreement(direct_vm,direct_deploy,position):
    c = deploy(direct_deploy)
    acquire(c,direct_vm)
    a = answer()
    a['operations'][position//6][FIELDS[position%6]] = 'UNKNOWN'
    mocks(direct_vm,proposed=a)
    assert direct_vm.run_validator() is False


@pytest.mark.parametrize('position',range(9))
def test_each_substantive_clause_audit_must_pass(direct_vm,direct_deploy,position):
    c = deploy(direct_deploy)
    acquire(c,direct_vm)
    a = {'operations':[{'call':True,'window':True,'return':True} for _ in range(3)]}
    a['operations'][position//3][['call','window','return'][position%3]] = False
    mocks(direct_vm,audit=a)
    assert direct_vm.run_validator() is False


def test_validator_refetch_and_error_categories(direct_vm,direct_deploy):
    c = deploy(direct_deploy)
    acquire(c,direct_vm)
    mocks(direct_vm,raw=b'changed bytes')
    assert direct_vm.run_validator() is False
    assert direct_vm.run_validator(leader_error=Exception('[EXTERNAL] History commitment mismatch')) is True
    mocks(direct_vm,status=503)
    assert direct_vm.run_validator(leader_error=Exception('[TRANSIENT] History report unavailable')) is True
    mocks(direct_vm,proposed={'wrong':True})
    assert direct_vm.run_validator(leader_error=Exception('[LLM_ERROR] Invalid complete operations')) is False


@pytest.mark.parametrize('bad',[{}, {'operations':[]}, {'operations':[{'kind':'WRITE'}]*3}])
def test_malformed_model_never_consumes_report(direct_vm,direct_deploy,bad):
    c = deploy(direct_deploy)
    mocks(direct_vm,proposed=bad)
    with direct_vm.expect_revert('Invalid complete operations'): c.audit_report(0,*record()[:2])
    assert c.get_state()['reports'] == []


def test_repair_retains_unknown_instead_of_inventing_completion(direct_vm,direct_deploy):
    c = deploy(direct_deploy)
    bad = answer('unknown')
    bad['operations'][1]['end'] = None
    direct_vm.mock_web(re.escape(record('unknown')[0]),{'status':200,'body':record('unknown')[2]})
    direct_vm.mock_llm(r'(?s)^(?!.*Previous invalid response:).*CHRONOCAS-EXTRACT.*',json.dumps(bad))
    direct_vm.mock_llm(r'(?s).*CHRONOCAS-EXTRACT.*Previous invalid response:.*',json.dumps(answer('unknown')))
    direct_vm.mock_llm(r'.*CHRONOCAS-AUDIT.*',json.dumps({'operations':[{'call':True,'window':True,'return':True} for _ in range(3)]}))
    c.audit_report(0,*record('unknown')[:2])
    assert direct_vm.run_validator() is True
    assert c.get_state()['cursor']['round'] == 0


@pytest.mark.parametrize('field,value',[('end',5),('end',250),('observed','UNKNOWN')])
def test_lost_time_does_not_authorize_invented_time_or_erasure_of_known_ack(direct_vm,direct_deploy,field,value):
    c = deploy(direct_deploy)
    acquired = acquire(c,direct_vm,'unknown')
    assert acquired['assessment']['operations'][1]['observed'] == 'ACK'
    assert acquired['assessment']['operations'][1]['end'] == 'UNKNOWN'
    a = answer('unknown')
    a['operations'][1][field] = value
    assert direct_vm.run_validator(leader_result={'source':acquired['source'],'assessment':a}) is False


def test_faithful_unknown_still_requires_all_substantive_audit_flags(direct_vm,direct_deploy):
    c = deploy(direct_deploy)
    acquire(c,direct_vm,'unknown')
    audit = {'operations':[{'call':True,'window':True,'return':True} for _ in range(3)]}
    audit['operations'][1]['window'] = False
    mocks(direct_vm,'unknown',audit=audit)
    assert direct_vm.run_validator() is False


@pytest.mark.parametrize('mutation',['round','roster','clause','duplicate','oversize','json'])
def test_invalid_acquired_source_preserves_cursor(direct_vm,direct_deploy,mutation):
    c = deploy(direct_deploy)
    source = json.loads(record()[2])
    if mutation == 'round': source['round'] = 1
    if mutation == 'roster': source['operations'].reverse()
    if mutation == 'clause': source['operations'][0]['window'] = ''
    raw = json.dumps(source).encode()
    if mutation == 'duplicate': raw = b'{"id":"one","id":"two"}'
    if mutation == 'oversize': raw = b'x'*18001
    if mutation == 'json': raw = b'not json'
    mocks(direct_vm,raw=raw)
    with direct_vm.expect_revert('EXTERNAL'): c.audit_report(0,record()[0],hashlib.sha256(raw).hexdigest())
    assert c.get_state()['reports'] == []


def test_report_id_uniqueness_and_log_bound(direct_vm,direct_deploy):
    c = deploy(direct_deploy)
    acquire(c,direct_vm,'cas-bad')
    before = c.get_state()
    raw = record('cas-bad')[2]+b'\n'
    mocks(direct_vm,'cas-bad',raw=raw)
    with direct_vm.expect_revert('Report ID already recorded'): c.audit_report(0,record('cas-bad')[0],hashlib.sha256(raw).hexdigest())
    assert c.get_state() == before
    for i in range(5):
        source = json.loads(record('cas-bad')[2])
        source['id'] = 'candidate-'+str(i)
        raw = json.dumps(source).encode()
        mocks(direct_vm,'cas-bad',raw=raw)
        c.audit_report(0,record('cas-bad')[0],hashlib.sha256(raw).hexdigest())
    before = c.get_state()
    with direct_vm.expect_revert('Report log full'): c.audit_report(0,*record()[:2])
    assert c.get_state() == before


@pytest.mark.parametrize('report,initial',[(-1,0),(1,0),(0,-1),(0,4)])
def test_invalid_counterfactual(direct_vm,direct_deploy,report,initial):
    c = deploy(direct_deploy)
    acquire(c,direct_vm)
    with direct_vm.expect_revert('Invalid counterfactual'): c.simulate(report,initial)


@pytest.mark.parametrize('override',[{'initial':-1},{'initial':4},{'repository':'../bad'}])
def test_invalid_deployment_scope(direct_vm,direct_deploy,override):
    with direct_vm.expect_revert('EXPECTED'): deploy(direct_deploy,**override)


@pytest.mark.parametrize('url',['https://example.com/report.json','https://raw.githubusercontent.com/mohammadisina1988-jpg/chrono-cas/main/reports/overlap.json'])
def test_commit_pinning(direct_vm,direct_deploy,url):
    c = deploy(direct_deploy)
    with direct_vm.expect_revert('Commit-pinned'): c.audit_report(0,url,record()[1])
