# Review notes

## Acquired observations and consensus

Only HTTPS raw GitHub URLs pinned to a commit within the deployment's fixed source repository are accepted. Raw SHA-256 is checked before JSON interpretation. Source schemas reject duplicate keys, wrong round headers, incomplete clauses and wrong ordered client identities. This proves byte identity and scope, not reporter authority, commit ancestry, clock synchronization or actual physical service behavior.

Leader and validators each fetch full reports and extract all eighteen normalized fields. Validators compare every field exactly, then separately audit all three full clause categories for each operation: call/arguments, invocation/completion interval, and actual return. No hash-only, format-only or leader-only approval occurs. In particular, CAS comparison failure differs from transport failure; missing completion differs from observer export time; cancelled proposals differ from completed calls. UNKNOWN stays explicit. Matching model failures do not count as agreed interpretation.

The extra audit asks whether each representation is faithful to available information. A known acknowledged return can coexist with a lost completion timestamp. Its return remains ACK/OK/FAIL and its missing end remains UNKNOWN; that faithful representation can pass interpretation consensus while still blocking round advancement as INCOMPLETE. The audit must not conflate faithful missingness with complete timing. Every exact comparison and all nine substantive audit flags remain required. Earlier rejected live attempts and diagnostic stdout are retained separately in the proof history.

## Concurrency and frontier invariants

Each fixed client has exactly one completed operation per round. There is one object, one bounded register and no pending operations. Real-time constraints come only from strict end-before-start comparisons. Equal tick bins leave relative order unspecified. These are precise model assumptions, not proof of sub-tick real-time behavior.

The exhaustive checker includes all six orders from every possible current state. A failed order retains its earliest unsupported return, or a concrete real-time edge that blocks the order. Every successful terminal value is retained. A separate completed-prefix dynamic program checks the decision and frontier; a local witness checker validates every trial path and counterexample. A successful round's strict cut puts all earlier accepted operations before the next accepted round, making the frontier a sufficient summary for this register model.

Only a complete linearizable candidate advances round, cut and frontier. Impossible, incomplete and invalid-cut candidates remain recorded without advancing. A later round cannot skip that slot. A new report may offer a corrected candidate for that same round, retaining the old diagnosis. This is reasoning about alternative published reports, not a mechanism that alters previously executed physical operations.

Counterfactual views hold source interpretation and original cut fixed while changing only the hypothetical initial register value. They cannot mutate the live cursor. A counterfactual witness is not a claim that its initial value was actual.

## Bounds and operations

Six source records, three operations, four register values and at most 24 trial rows bound storage and search. Any admissible caller can consume a record slot, including with an impossible or incomplete candidate. This is a permissionless bounded audit instance rather than a spam-resistant global registry. No administrator can erase an adverse report or override its result. Source/hash/model acquisition errors and rejected round/replay calls append nothing.

There are no native-value transfers, token allowances, arbitrary RPC requests or external contract invocations. Proof callers use disposable encrypted keystores and no funded assets. Mutation hashes are journaled; ambiguous sends are never automatically retried. Read retries are bounded. Full vote maps retain dissent and idle entries, and lifecycle finality is checked separately from execution success. Expected rejection bytes and unchanged full state are verified.

The direct tests use controlled source/model mocks and manual validator replays. They compare 32,064 history/frontier configurations with independent prefix search, cover every interpretation field and clause audit, and cross-check actual VM outputs with the JavaScript oracle used by live verification. Live workflows separately exercise real fetching/AI consensus, decode actual signed calldata, compare source bytes and full before/after state, and freshly query receipts, code, cursor and counterfactuals. Hosted verification times remain recorded; an offline merge is never labeled a new live RPC check.
