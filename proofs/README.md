# ChronoCAS: verified streaming-history proofs

Gasless GenLayer StudioNet, chain **61999**. Four independent CLI deployments, **25 finalized MAJORITY_AGREE receipts**: 13 successful operations and 12 expected rejections. Complete states and **36 counterfactual views** match an independent completed-prefix state-search oracle.

Contract source SHA-256: `613cd24e0aea92f54548ae132178c5833e3dbb4a5a3d6fb1290704e4a8784cab`. Fixture revision: `7bf5294d2916a691a557d27ea1ec37a0f8032bf8`. Workflow revision: `0fed56f49112562e9910eabd8980c075bd56e8d2`. [Contract](../contracts/chrono_cas.py) · [Architecture](../docs/architecture.md) · [Verification summary](verification.json) · [Local offline replay](offline-verification.json) · [Artifact metadata](artifact-manifest.json).

| Scenario | Explorer contract | Deployment | Report outcomes | Final cursor | Fresh workflow |
|---|---|---|---|---|---|
| frontier | [`0xA59933825BbfC63e44b79724Fd16cCdd62DB254D`](https://explorer-studio.genlayer.com/address/0xA59933825BbfC63e44b79724Fd16cCdd62DB254D) | [transaction](https://explorer-studio.genlayer.com/tx/0x4a620981417b0d385ca5e9f66ab3d21d3a5e24460c06f930a8790a205300596c) | LINEARIZABLE, LINEARIZABLE, INVALID_HISTORY | round 2; cut 20; states [2] | [run 40232353266](https://github.com/mohammadisina1988-jpg/chrono-cas/actions/runs/40232353266) |
| cas | [`0x6998BeE811479679C37bB72a5d8c861FfA6e695e`](https://explorer-studio.genlayer.com/address/0x6998BeE811479679C37bB72a5d8c861FfA6e695e) | [transaction](https://explorer-studio.genlayer.com/tx/0x3357c8ec726725e8d4926383f3f1f334e9b2f977722fda9114f23f8fdf572a06) | VIOLATION, LINEARIZABLE | round 1; cut 5; states [1] | [run 40232359109](https://github.com/mohammadisina1988-jpg/chrono-cas/actions/runs/40232359109) |
| realtime | [`0xEf3DB84c15a0A327285d5F00A1716109e5a848e1`](https://explorer-studio.genlayer.com/address/0xEf3DB84c15a0A327285d5F00A1716109e5a848e1) | [transaction](https://explorer-studio.genlayer.com/tx/0xd5fd6b3845a4c024f8c32b4c41c95486ed56bc710a05acef6cab7870e27713e5) | VIOLATION, LINEARIZABLE | round 1; cut 6; states [1] | [run 40232365377](https://github.com/mohammadisina1988-jpg/chrono-cas/actions/runs/40232365377) |
| incomplete | [`0x0B921Fcc1499F311322E9fa0E69D2AC6F6210daA`](https://explorer-studio.genlayer.com/address/0x0B921Fcc1499F311322E9fa0E69D2AC6F6210daA) | [transaction](https://explorer-studio.genlayer.com/tx/0x84fd0b728df2aa8ee1b1358372a41758af2a1fb07017b2b4c1c2d87bdea2cbce) | INCOMPLETE, LINEARIZABLE | round 1; cut 5; states [1,2,3] | [run 40232368586](https://github.com/mohammadisina1988-jpg/chrono-cas/actions/runs/40232368586) |

## Material scenarios

- **Frontier:** three overlapping writes leave all values `[1,2,3]` possible. A later read wave prunes the frontier to `[2]`. Keeping only one earlier order would lose that legal continuation. A stale report overlaps the accepted cut and cannot advance round two.
- **CAS:** two exchanges both claim success comparing the same initial zero to different replacements, with no reset. Every admissible sequence fails. A corrected candidate with one failed comparison has legal witnesses and advances the same pending round.
- **Real-time:** a write completes before a stale read is invoked, forcing a violation. An overlapping candidate with the same call/return values permits read-before-write ordering.
- **Incomplete:** a missing completion marker remains UNKNOWN; the observer export time and assumed deadline are not invented responses. A completed candidate advances the same round.
- Every suite rejects a wrong raw hash, a source replay and a skipped round. All rejected calls preserve the entire state and match exact expected error bytes.

## Report-by-report state and witnesses

| Scenario / report | Report round | Result | Legal final states | Trial rows | Cursor after |
|---|---|---|---|---|---|
| frontier / overlap | 0 | LINEARIZABLE | [1,2,3] | 6 | round 1; cut 5; states [1,2,3] |
| frontier / narrow | 1 | LINEARIZABLE | [2] | 18 | round 2; cut 20; states [2] |
| frontier / stale | 2 | INVALID_HISTORY | not evaluated | 0 | round 2; cut 20; states [2] |
| cas / cas-bad | 0 | VIOLATION | [] | 6 | round 0; cut -1; states [0] |
| cas / cas-good | 0 | LINEARIZABLE | [1] | 6 | round 1; cut 5; states [1] |
| realtime / realtime-bad | 0 | VIOLATION | [] | 6 | round 0; cut -1; states [0] |
| realtime / realtime-good | 0 | LINEARIZABLE | [1] | 6 | round 1; cut 6; states [1] |
| incomplete / unknown | 0 | INCOMPLETE | not evaluated | 0 | round 0; cut -1; states [0] |
| incomplete / resolved | 0 | LINEARIZABLE | [1,2,3] | 6 | round 1; cut 5; states [1,2,3] |

Full successful paths, concrete time-order blockers and first-return mismatches are preserved in the linked final states, traces and individual receipts. Counterfactuals use the same accepted source and original cut with only the hypothetical initial value changed. They do not assert that hypothetical value was actual.

## Every signed transaction

| Call | Explorer transaction | Execution | Final votes agree / disagree / idle |
|---|---|---|---|
| frontier-deployment | [`0x4a62098141…`](https://explorer-studio.genlayer.com/tx/0x4a620981417b0d385ca5e9f66ab3d21d3a5e24460c06f930a8790a205300596c) · [receipt](frontier-deployment-receipt.json) | SUCCESS | 5 / 0 / 0 |
| frontier-reject-hash | [`0x8824cc64db…`](https://explorer-studio.genlayer.com/tx/0x8824cc64dbf25346b96bf01dd79246f908ff8c9e4c0221b10eab6da3b6d1ffb3) · [receipt](frontier-reject-hash-receipt.json) | ERROR | 3 / 0 / 2 |
| frontier-audit-overlap | [`0xf2eeec926f…`](https://explorer-studio.genlayer.com/tx/0xf2eeec926f0fc896ee05f4e7ec9b3a211d3028df7ed8f6bc1d3a4f9228ee82af) · [receipt](frontier-audit-overlap-receipt.json) | SUCCESS | 3 / 0 / 2 |
| frontier-audit-narrow | [`0x5e31b98cc1…`](https://explorer-studio.genlayer.com/tx/0x5e31b98cc168525cfa2d7049b12ab57f3e19bcd595cf3813484ce97a3a4d1eaf) · [receipt](frontier-audit-narrow-receipt.json) | SUCCESS | 3 / 0 / 2 |
| frontier-audit-stale | [`0xd0cbf545ea…`](https://explorer-studio.genlayer.com/tx/0xd0cbf545ea5c0bb3255a2c12100ef707f82280bd49c524a9c4d1731f40fd2717) · [receipt](frontier-audit-stale-receipt.json) | SUCCESS | 3 / 0 / 2 |
| frontier-reject-replay | [`0x39f3719fda…`](https://explorer-studio.genlayer.com/tx/0x39f3719fda1310e5fe38f4f92b228ffa710d948805e8ebff63d7b49164574627) · [receipt](frontier-reject-replay-receipt.json) | ERROR | 3 / 0 / 2 |
| frontier-reject-skip | [`0x1611dcb783…`](https://explorer-studio.genlayer.com/tx/0x1611dcb783590dabb928bb77d20df3be53f9eee76de9ac1bed8f185e7ab32ac9) · [receipt](frontier-reject-skip-receipt.json) | ERROR | 3 / 0 / 2 |
| cas-deployment | [`0x3357c8ec72…`](https://explorer-studio.genlayer.com/tx/0x3357c8ec726725e8d4926383f3f1f334e9b2f977722fda9114f23f8fdf572a06) · [receipt](cas-deployment-receipt.json) | SUCCESS | 3 / 0 / 2 |
| cas-reject-hash | [`0xe93a6fc443…`](https://explorer-studio.genlayer.com/tx/0xe93a6fc4437ce0bcb768ac5f0e416994e2b6e40eab6b1c96c4feb7da9d979384) · [receipt](cas-reject-hash-receipt.json) | ERROR | 3 / 0 / 2 |
| cas-audit-cas-bad | [`0xc8743e1c1e…`](https://explorer-studio.genlayer.com/tx/0xc8743e1c1e18853a64843d45d3474e8f6187d05077e5eeb6056f5ab9d55316fa) · [receipt](cas-audit-cas-bad-receipt.json) | SUCCESS | 3 / 0 / 2 |
| cas-audit-cas-good | [`0x1decae9c5f…`](https://explorer-studio.genlayer.com/tx/0x1decae9c5f826fcd4eafda1dda45422a683875976dce3474e1913b8f4b9d830f) · [receipt](cas-audit-cas-good-receipt.json) | SUCCESS | 3 / 0 / 2 |
| cas-reject-replay | [`0x61844d490f…`](https://explorer-studio.genlayer.com/tx/0x61844d490fdb709624c62ec350296ed4464b63fa3bf32489e53f42fd2e39ab07) · [receipt](cas-reject-replay-receipt.json) | ERROR | 3 / 0 / 2 |
| cas-reject-skip | [`0x08bfdcd822…`](https://explorer-studio.genlayer.com/tx/0x08bfdcd822f09b5fc2a93a2f771396ddae902a302b8f037dfaade45a7d5a106f) · [receipt](cas-reject-skip-receipt.json) | ERROR | 3 / 0 / 2 |
| realtime-deployment | [`0xd5fd6b3845…`](https://explorer-studio.genlayer.com/tx/0xd5fd6b3845a4c024f8c32b4c41c95486ed56bc710a05acef6cab7870e27713e5) · [receipt](realtime-deployment-receipt.json) | SUCCESS | 3 / 0 / 2 |
| realtime-reject-hash | [`0xed40cf0416…`](https://explorer-studio.genlayer.com/tx/0xed40cf0416167afc2af1c57af796cae7c6dd7408031f14103ca46e7ca70afc05) · [receipt](realtime-reject-hash-receipt.json) | ERROR | 3 / 0 / 2 |
| realtime-audit-realtime-bad | [`0x4dbcbb01b5…`](https://explorer-studio.genlayer.com/tx/0x4dbcbb01b5c52d7aed3e5039853e11de2ea4013ee385306dfe2a7e3e9800fc5a) · [receipt](realtime-audit-realtime-bad-receipt.json) | SUCCESS | 3 / 0 / 2 |
| realtime-audit-realtime-good | [`0xb0a817f259…`](https://explorer-studio.genlayer.com/tx/0xb0a817f259e430c4a770e54c29b787fec065b007e4e458633a8cff7b5f531b8e) · [receipt](realtime-audit-realtime-good-receipt.json) | SUCCESS | 3 / 0 / 2 |
| realtime-reject-replay | [`0x4c17f11b29…`](https://explorer-studio.genlayer.com/tx/0x4c17f11b293fd48a9d349cf9870aac9e1cf4d59275ebc9f8c99be70e318e2796) · [receipt](realtime-reject-replay-receipt.json) | ERROR | 3 / 0 / 2 |
| realtime-reject-skip | [`0xb2606032d9…`](https://explorer-studio.genlayer.com/tx/0xb2606032d93a723bab31644c7a450bbee802e53f4de1983f337772f24f126517) · [receipt](realtime-reject-skip-receipt.json) | ERROR | 3 / 0 / 2 |
| incomplete-deployment | [`0x84fd0b728d…`](https://explorer-studio.genlayer.com/tx/0x84fd0b728df2aa8ee1b1358372a41758af2a1fb07017b2b4c1c2d87bdea2cbce) · [receipt](incomplete-deployment-receipt.json) | SUCCESS | 3 / 0 / 2 |
| incomplete-reject-hash | [`0xe3842962b7…`](https://explorer-studio.genlayer.com/tx/0xe3842962b79bc11c215fb079f100c4b2ca3d5666d3bbb720a4dbdd24b5c3d490) · [receipt](incomplete-reject-hash-receipt.json) | ERROR | 3 / 0 / 2 |
| incomplete-audit-unknown | [`0xbb03546284…`](https://explorer-studio.genlayer.com/tx/0xbb0354628442f7f14b7e0f3c236f21556bc2d0d504816382496fed524f52bf57) · [receipt](incomplete-audit-unknown-receipt.json) | SUCCESS | 3 / 0 / 2 |
| incomplete-audit-resolved | [`0x85ac09f148…`](https://explorer-studio.genlayer.com/tx/0x85ac09f1482f7b328c3ad89d7950f1e5d66342201b5ab3770cb19d1036509cdf) · [receipt](incomplete-audit-resolved-receipt.json) | SUCCESS | 3 / 0 / 2 |
| incomplete-reject-replay | [`0x7339c2d128…`](https://explorer-studio.genlayer.com/tx/0x7339c2d1282a5cae97a6284c0020497a9df2f3b0c7202721975ab8e4f8dab15a) · [receipt](incomplete-reject-replay-receipt.json) | ERROR | 4 / 0 / 1 |
| incomplete-reject-skip | [`0x11bca20871…`](https://explorer-studio.genlayer.com/tx/0x11bca20871fc1138b3219a86d411165bf5ebae9c2339b71594f1ee9f85e6bf15) · [receipt](incomplete-reject-skip-receipt.json) | ERROR | 3 / 0 / 2 |

Aggregate final vote maps: **78 agree, 0 disagree, 47 idle**. These totals do not flatten earlier rounds. Full receipts preserve dissent, idle entries, round counts and rotations.

## Verification scope

The verifier decodes actual signed calldata with the pinned CLI SDK, checks signer/target, exact deployment bytes, fixture commitments, every acquired report and all eighteen accepted fields. Independent prefix-state search checks every terminal frontier, while the witness checker validates every time-order blocker, state path and earliest failed return. Every report and cursor transition is linked to the complete preceding state. Expected errors require exact result bytes and whole-state rollback. Hosted workflows freshly re-fetch all receipts, deployed source, final states and counterfactuals.

Local and hosted JUnit reports retain **209 passing direct tests**, including **32,064 history/frontier configurations**: exhaustive binary operation triples across six time patterns and three frontiers, plus 64 generated full-value histories across all fifteen nonempty frontiers. Tests exercise every independent interpretation disagreement and clause-audit rejection, actual VM versus JavaScript checks, error categories, source replay, round gates and capacity bounds. Additional regression tests reject invented completion times, erased known acknowledgements and false audit flags even when another field faithfully remains UNKNOWN. Seven transport tests ensure ambiguous writes are never automatically retried. Mocked tests exercise code; live receipts exercise actual fetching and AI consensus.

## Retained earlier attempts

[Historical attempts](historical/README.md) retain 25 earlier-source receipts separately from this primary set. Two missing-completion attempts finalized MAJORITY_DISAGREE and are not counted as passing audits. Diagnostic stdout showed that extraction matched while some extra audits rejected the missing window or known return; one audit emitted a non-boolean UNKNOWN flag. The final instructions distinguish faithful representation of missing information from complete timing, without removing exact extraction agreement or any required audit flag. The final four instances all deploy the same source bytes.

Verification mode: `merged-hosted-fresh-rpc-and-state`; latest recorded fresh time: `2026-10-25T20:55:41.783Z`. Fresh receipt, deployed-source, complete-state and counterfactual RPC checks were performed by the linked hosted workflows at the recorded times. This merge independently matches their results against local offline replay; it makes no additional fresh RPC claim.

Synthetic candidate reports establish consistency with this bounded abstract register and the reported partial time order. They do not authenticate real server behavior, clock synchronization, unreported events or order hidden inside equal timestamp bins. Corrected candidates are alternative reports, not retroactive changes to physical operations. Six records and three completed clients bound this permissionless audit instance.
