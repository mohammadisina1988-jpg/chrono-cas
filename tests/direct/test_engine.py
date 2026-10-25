from copy import deepcopy
from itertools import product
import random
import pytest
from support import F,answer,verify


def variants():
    return ([{'kind':'READ','expected':'NA','update':'NA','observed':x} for x in range(2)]
        + [{'kind':'WRITE','expected':'NA','update':x,'observed':'ACK'} for x in range(2)]
        + [{'kind':'CAS','expected':e,'update':n,'observed':o} for e,n,o in product(range(2),range(2),['OK','FAIL'])])


WINDOWS = [[(1,5)]*3,[(1,2),(3,4),(5,6)],[(5,6),(3,4),(1,2)],[(1,4),(2,5),(6,7)],[(1,2),(2,3),(3,4)],[(1,6),(2,3),(4,5)]]


@pytest.mark.parametrize('windows,first',list(product(WINDOWS,variants())))
def test_all_binary_operation_triples_six_time_patterns_and_three_frontiers(windows,first):
    for second,third in product(variants(),repeat=2):
        a = {'operations':[{**row,'start':s,'end':e} for row,(s,e) in zip([first,second,third],windows)]}
        for states in [[0],[1],[0,1]]:
            verify(a,states,F['analyze'](a,states,-1))


@pytest.mark.parametrize('seed',range(64))
def test_full_register_values_all_fifteen_frontiers(seed):
    rng = random.Random(seed)
    rows = []
    for _ in range(3):
        kind = rng.choice(['READ','WRITE','CAS'])
        s = rng.randint(0,12)
        rows.append({'kind':kind,'expected':rng.randint(0,3) if kind=='CAS' else 'NA',
            'update':rng.randint(0,3) if kind!='READ' else 'NA','start':s,'end':s+rng.randint(1,6),
            'observed':rng.randint(0,3) if kind=='READ' else ('ACK' if kind=='WRITE' else rng.choice(['OK','FAIL']))})
    a = {'operations':rows}
    for mask in range(1,16):
        states = [i for i in range(4) if mask&(1<<i)]
        verify(a,states,F['analyze'](a,states,-1))


def test_ambiguity_must_survive_until_a_later_wave_prunes_it():
    before = {'round':0,'boundary':-1,'states':[0]}
    first = F['analyze'](answer(),before['states'],before['boundary'])
    assert first['final_states'] == [1,2,3]
    after = F['advance'](before,first,answer())
    second = F['analyze'](answer('narrow'),after['states'],after['boundary'])
    assert second['final_states'] == [2]
    assert F['analyze'](answer('narrow'),[3],after['boundary'])['status'] == 'VIOLATION'


def test_same_calls_different_real_time_order_has_different_answer():
    assert F['analyze'](answer('realtime-bad'),[0],-1)['status'] == 'VIOLATION'
    assert F['analyze'](answer('realtime-good'),[0],-1)['final_states'] == [1]
    assert F['analyze'](answer('cas-bad'),[0],-1)['status'] == 'VIOLATION'
    assert F['analyze'](answer('cas-good'),[0],-1)['final_states'] == [1]


def test_incomplete_invalid_interval_and_cut_never_advance():
    cursor = {'round':0,'boundary':-1,'states':[0]}
    result = F['analyze'](answer('unknown'),[0],-1)
    assert result == {'status':'INCOMPLETE','unknown':['b:end']}
    assert F['advance'](cursor,result,answer('unknown')) == cursor
    a = answer()
    a['operations'][0]['end'] = 1
    assert F['analyze'](a,[0],-1)['status'] == 'INVALID_HISTORY'
    assert F['analyze'](answer(),[0],5)['issues'] == [{'client':x,'reason':'CUT_OVERLAP'} for x in ['a','b','c']]


@pytest.mark.parametrize('bad',[True,False,None,1.0,-1,256,'1',[],{}])
def test_strict_timestamp_types(bad):
    a = answer()
    a['operations'][0]['start'] = bad
    assert not F['valid_assessment'](a)
