# CERBERUS process and message contracts

Copyright © 2026 Emily Echterhoff. All rights reserved.

> Research reference contract. The browser worker demonstration is an explanatory capability-topology model, not a claim of OS-level or hardware isolation.

## Capability topology

```text
Pilot  ── proposal port ──► Watchdog ── approved-command port ──► Anchor
                                  ▲                                  ▲
                                  │                                  │
Kernel ── authority port ─────────┴──────────────────────────────────┘
  ▲
  │ evidence-only port
Vigil
```

The test harness may inject scenario inputs and receive telemetry from every component. It does not use those telemetry channels as an actuator path.

## Pilot

Receives observations and produces `PROPOSAL` messages only.

Required fields:

```json
{
  "type": "PROPOSAL",
  "proposal_id": "P-0007",
  "origin": "pilot",
  "sequence": 7,
  "created_at_tick": 42,
  "expires_at_tick": 48,
  "action": "low-energy-correction",
  "magnitude": 0.18,
  "rationale": "bounded conjunction response"
}
```

Pilot is never given the Anchor command port or authority port.

## Vigil

Consumes scenario evidence and emits `EVIDENCE` to the authority kernel.

```json
{
  "type": "EVIDENCE",
  "origin": "vigil",
  "epoch": 18,
  "status": "fresh",
  "fcoi_ucb": 0.47,
  "sensor_agreement": 0.73,
  "provenance_valid": true,
  "witness_independent": true,
  "anchor_healthy": true
}
```

Vigil has no actuator port and cannot emit `APPROVED_COMMAND`.

## Authority kernel

Consumes evidence and emits signed-by-role `AUTHORITY_UPDATE` messages to Watchdog and Anchor.

```json
{
  "type": "AUTHORITY_UPDATE",
  "origin": "authority-kernel",
  "authority": "A1",
  "target": "A0",
  "epoch": 23,
  "transition": "demotion",
  "promotion_count": 0
}
```

The browser prototype uses an unforgeable JavaScript `MessagePort` capability rather than cryptographic signatures. A hardware implementation would need channel authentication and independent key ownership.

## Watchdog

Consumes proposals and authority updates. It may emit `APPROVED_COMMAND` only when all checks pass.

```json
{
  "type": "APPROVED_COMMAND",
  "origin": "watchdog",
  "capability": "CERBERUS_WATCHDOG_V1",
  "proposal_id": "P-0007",
  "authority": "A2",
  "sequence": 11,
  "action": "low-energy-correction",
  "magnitude": 0.18,
  "expires_at_tick": 48
}
```

The Watchdog rejects:

- unknown message types;
- direct authority-assignment requests;
- stale proposals;
- actions outside the current authority envelope;
- malformed or non-finite magnitudes;
- proposals that violate the illustrative deterministic envelope.

## Anchor

Consumes authority updates and Watchdog-approved commands. It rejects any command that:

- lacks the Watchdog capability marker;
- claims a mismatched authority state;
- is stale;
- violates the Anchor-local magnitude or action invariant;
- requests authority assignment or invariant override.

Anchor survival actions are internal to Anchor and do not require Pilot permission.

## Non-claims

The Web Worker topology demonstrates explicit message ownership and the absence of a coded Pilot-to-Anchor route. It does not establish:

- process or memory isolation against a hostile browser runtime;
- real cryptographic command provenance;
- hard real-time behavior;
- independently powered hardware;
- flight readiness or certification credit.
