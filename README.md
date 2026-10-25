# ChronoCAS

**Consensus interpretation of concurrent reports, exhaustive linearizability witnesses, and an ambiguity-preserving streaming register frontier.**

ChronoCAS audits published candidate histories of a bounded atomic register. The contract independently fetches complete commit-pinned reports, interprets each client's call/interval/return, compares every normalized field across leader and validators and separately audits all full clauses. It then checks all six operation orders from every possible prior value, respecting reported real-time precedence and actual READ/WRITE/CAS semantics.

Every legal final value survives into the next round. Impossible, incomplete or overlapping-cut reports cannot advance the round. A corrected candidate must be evaluated in the same round; later rounds cannot skip it. All source interpretations, before/after cursors, successful witness paths and failed-order diagnostics remain immutable. There is no administrator override or graph-edit workflow.

## Read and reproduce

- [Pinned GenVM contract](contracts/chrono_cas.py)
- [Architecture and model boundary](docs/architecture.md)
- [Synthetic concurrent reports](reports)
- [Independent prefix-DP tests](tests/direct)
- [CLI proof driver](scripts/live-proof.cjs) and [receipt/state verifier](scripts/verify-proofs.cjs)
- [Live proof index](proofs/README.md)

```sh
pip install -r requirements-dev.txt
npm ci --no-audit --no-fund
genvm-lint download --version v0.2.16
genvm-lint check contracts/chrono_cas.py --json
python -m pytest tests/direct -q
node --test tests/rpc-preflight.test.cjs
```

Python 3.13 and Node 24. Runner, SDK, CLI and test dependencies are pinned. A linter notice about a newer runner does not change the concrete reviewed source header.

## Interface

Deploy with `(repository,initial)` where initial is a register value 0..3. `audit_report(round_number,url,sha256)` accepts only the current round and HTTPS raw GitHub reports pinned to a forty-character commit within that repository's `reports/` directory. Each report contains exactly one completed operation from each distinct client a/b/c. Full call, window and return paragraphs are acquired inside consensus; callers do not supply authoritative operation tuples.

`get_state()` returns immutable configuration, current round/cut/frontier and all source-bound report records. `simulate(report,initial)` re-evaluates a recorded report from a hypothetical initial register value, preserving that report's original cut and accepted interpretation. It does not mutate the live frontier.

READ returns the current value; WRITE sets its update and returns ACK; CAS succeeds and updates only when the current value equals its expected value, returning OK, otherwise FAIL with no update. A transport timeout is UNKNOWN. Every field remains present, including NA for inapplicable arguments. Missing completion data is never replaced with an export time or a planned deadline.

Invocation/response ticks are integers 0..255 in one shared clock. Strictly earlier response requires earlier operation order; equal ticks leave ordering unspecified. Each accepted round is separated from the prior accepted round by a strict time cut. Unknown fields yield INCOMPLETE. Invalid intervals or overlapping cuts yield INVALID_HISTORY. Complete histories yield LINEARIZABLE with all possible final states, or VIOLATION with a complete bounded failed-order journal. Only LINEARIZABLE advances the cursor.

Bounds are deliberate: six report records, three clients/operations per round, four register values, six operation orders and at most 24 trial rows per report. Reports are permissionless and first-come, so anyone with an admissible source can consume this finite log. Failed or incomplete candidates remain recorded and consume a slot. Deploy a new reviewed instance if capacity or corrections require it.

The independent decision oracle searches reachable completed-operation masks and register states, rather than enumerating the contract's full permutations. The witness checker validates every blocked order, state transition and first failed return. Tests cover exhaustive binary operation triples across six time patterns, all fifteen nonempty frontiers for generated full-value histories, source/model failures, all eighteen validator decisions and every clause audit. Hosted workflows separately exercise real fetching and AI consensus, verify actual signed calldata/votes/error bytes and freshly read deployed source, complete state and counterfactual views.

Synthetic reports demonstrate consistency with an abstract register and reported partial clock order. This does not prove a real service's behavior, reporter honesty, clock synchronization, unreported events, or ordering hidden inside equal timestamp bins. A corrected candidate is alternative reported data, not retroactive alteration of physical operations. Pending calls, overlapping rounds and multi-object histories are outside this model.

MIT. Classical linearizability is credited in the architecture note. Generic CLI transport and test bootstrap are reused under MIT with attribution retained. Streaming frontier semantics, concurrency witnesses, fixtures and independent prefix-DP oracles are specific to ChronoCAS.
