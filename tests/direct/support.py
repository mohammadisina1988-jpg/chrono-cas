import ast
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'contracts/chrono_cas.py'
REPO = 'mohammadisina1988-jpg/chrono-cas'
CLIENTS = ['a','b','c']
FIELDS = ['kind','start','end','expected','update','observed']
CASES = ['overlap','narrow','stale','cas-bad','cas-good','realtime-bad','realtime-good','unknown','resolved']


def pure():
    names = {'integer','valid_assessment','analyze','advance'}
    tree = ast.parse(SOURCE.read_text())
    ns = {'CLIENTS':CLIENTS,'FIELDS':FIELDS}
    exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names],type_ignores=[]),str(SOURCE),'exec'),ns)
    return ns


F = pure()


def answer(case='overlap'):
    return json.loads((ROOT/'tests'/(case+'-expected.json')).read_text())


def record(case='overlap'):
    raw = (ROOT/'reports'/(case+'.json')).read_bytes()
    return 'https://raw.githubusercontent.com/'+REPO+'/'+'a'*40+'/reports/'+case+'.json',hashlib.sha256(raw).hexdigest(),raw


def deploy(factory,**kwargs):
    params = {'repository':REPO,'initial':0}
    params.update(kwargs)
    return factory(str(SOURCE),**params)


def mocks(vm,case='overlap',proposed=None,audit=None,raw=None,status=200):
    vm.clear_mocks()
    vm.mock_web(re.escape(record(case)[0]),{'status':status,'body':record(case)[2] if raw is None else raw})
    vm.mock_llm(r'.*CHRONOCAS-EXTRACT.*',json.dumps(answer(case) if proposed is None else proposed))
    vm.mock_llm(r'.*CHRONOCAS-AUDIT.*',json.dumps({'operations':[{'call':True,'window':True,'return':True} for _ in range(3)]} if audit is None else audit))


def acquire(c,vm,case='overlap'):
    mocks(vm,case)
    number = json.loads(record(case)[2])['round']
    c.audit_report(number,*record(case)[:2])
    assert vm.run_validator() is True
    return c.get_state()['reports'][-1]


def relation(row,value):
    # Declarative single-operation state relation for the independent prefix DP.
    if row['kind'] == 'READ':
        return {value} if row['observed'] == value else set()
    if row['kind'] == 'WRITE':
        return {row['update']} if row['observed'] == 'ACK' else set()
    matches = value == row['expected']
    if matches != (row['observed'] == 'OK'):
        return set()
    return {row['update'] if matches else value}


def frontier(assessment,states):
    # Dynamic programming over completed-operation masks, not full permutations.
    rows = assessment['operations']
    predecessors = [sum(1<<j for j in range(3) if j != i and rows[j]['end'] < rows[i]['start']) for i in range(3)]
    reachable = [set() for _ in range(8)]
    reachable[0].update(states)
    for mask in range(8):
        for i,row in enumerate(rows):
            if mask&(1<<i) or predecessors[i]&mask != predecessors[i]:
                continue
            for state in reachable[mask]:
                reachable[mask|(1<<i)].update(relation(row,state))
    return sorted(reachable[7])


def verify(assessment,states,result):
    expected = frontier(assessment,states)
    assert result['final_states'] == expected
    assert result['status'] == ('LINEARIZABLE' if expected else 'VIOLATION')
    assert len(result['trials']) == 6*len(states)
    seen = set()
    rows = assessment['operations']
    edges = [(i,j) for i in range(3) for j in range(3) if i != j and rows[i]['end'] < rows[j]['start']]
    assert result['edges'] == [[CLIENTS[i],CLIENTS[j]] for i,j in edges]
    for trial in result['trials']:
        order = [CLIENTS.index(x) for x in trial['order']]
        assert sorted(order) == [0,1,2]
        key = (trial['initial'],tuple(order))
        assert key not in seen and trial['initial'] in states
        seen.add(key)
        blocked = [(i,j) for i,j in edges if order.index(i)>order.index(j)]
        if blocked:
            assert trial['outcome'] == 'ORDER_BLOCKED' and trial['path'] == [trial['initial']]
            assert trial['blocked'] == [CLIENTS[x] for x in blocked[0]]
            continue
        value = trial['initial']
        path = [value]
        for i in order:
            following = relation(rows[i],value)
            if not following:
                assert trial['outcome'] == 'RETURN_MISMATCH' and trial['client'] == CLIENTS[i]
                assert trial['observed'] == rows[i]['observed']
                required = value if rows[i]['kind']=='READ' else ('ACK' if rows[i]['kind']=='WRITE' else ('OK' if value==rows[i]['expected'] else 'FAIL'))
                assert trial['required'] == required
                break
            value = next(iter(following))
            path.append(value)
        else:
            assert trial['outcome'] == 'PASS' and value in expected
        assert trial['path'] == path
