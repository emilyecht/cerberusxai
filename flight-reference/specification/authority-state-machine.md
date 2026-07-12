# CERBERUS authority state machine

Copyright © 2026 Emily Echterhoff. All rights reserved.

> Research reference specification. This is not flight software, certification evidence, or a completed safety case.

## Purpose

The reference kernel converts pessimistic runtime evidence into a bounded authority state. It is intentionally small enough to inspect, test, and model-check.

The kernel does **not** estimate FCOI, authenticate commands, perform orbital dynamics, or certify mission envelopes. It consumes already-formed evidence and applies the authority law.

## States

| State | Strategic-layer surface | Required gate |
|---|---|---|
| A3 | bounded mission proposals | deterministic Watchdog validation |
| A2 | restricted, low-consequence proposals | mission-specific restricted envelope |
| A1 | advisory and diagnostic output only | no executable proposal accepted |
| A0 | Anchor survival set only | Anchor-local invariants |

A3 is not unrestricted autonomy. Pilot never receives direct actuator authority.

## Inputs

Each evidence sample contains:

- pessimistic FCOI upper bound in `[0, 1]`;
- independent sensor agreement/health in `[0, 1]`;
- command-provenance validity;
- witness-independence status;
- Anchor health status;
- evidence status: `fresh`, `unknown`, or `invalid`;
- monotonically increasing evidence epoch.

An evidence epoch must advance before a sample can count toward restoration. Replaying a previously accepted epoch cannot fill dwell.

## Required properties

### P1 — fail closed on missing assurance

If evidence is invalid, unknown, malformed, unauthenticated, non-independent, or reports an unhealthy Anchor, the defensible target is A0.

### P2 — immediate contraction

When the defensible target is lower than current authority, the kernel moves to that target in the same step. Demotion may skip intermediate states.

### P3 — sequential restoration

Authority may increase by at most one level per completed dwell interval.

### P4 — sustained fresh evidence

Promotion requires consecutive usable samples with strictly increasing evidence epochs. Any sample whose target is not above the current state resets the promotion counter.

### P5 — maximum-authority cap

Mission policy may cap the state below A3. Evidence cannot lift authority above that cap.

### P6 — non-delegable operations

`assign-authority` and `override-anchor` are denied in every state and for every origin.

### P7 — survivable A0 residue

A0 retains only the declared minimum survival operations:

- power-positive or otherwise survivable attitude;
- thermal survival;
- authenticated beacon/reacquisition posture;
- bounded fault isolation.

### P8 — usefulness does not create permission

Pilot computation may remain useful at A0 or A1, but the action surface remains restricted by authority rather than inferred capability.

## Default illustrative thresholds

| State | Maximum FCOI UCB | Minimum sensor agreement |
|---|---:|---:|
| A3 | 0.30 | 0.80 |
| A2 | 0.55 | 0.60 |
| A1 | 0.80 | 0.35 |
| A0 | otherwise | otherwise |

These values exist to make the implementation executable and testable. They are **not** mission thresholds and carry no flight or certification claim.

## Traceability

| Property | Implementation | Unit/property test | BMC harness |
|---|---|---|---|
| P1 | `cerberus_target_authority`, `cerberus_step` | unknown, invalid provenance, randomized campaign | fail-closed assertions |
| P2 | `cerberus_step` demotion branch | skip-state demotion | immediate target assertion |
| P3 | `cerberus_step` promotion branch | sequential recovery | one-level assertion |
| P4 | epoch and dwell handling | replayed epoch, interruption reset | bounded promotion condition |
| P5 | `maximum_authority` clamp | maximum-cap test | state-bound assertions |
| P6 | `cerberus_action_allowed` | non-delegable-action test | action-denial assertions |
| P7 | `cerberus_action_allowed` | A0 survival test | survival assertions |
| P8 | state-specific action table | action-table tests | bounded action checks |
