# CERBERUS executable reference kernel

Copyright © 2026 Emily Echterhoff. All rights reserved.

> **Evidence boundary:** This is a research reference implementation for inspectable authority logic. It is not flight software, certification evidence, an operational detector, or a completed safety case.

## What this adds

The browser simulations explain CERBERUS. This directory adds a small executable kernel whose job is narrower and testable:

```text
pessimistic evidence → defensible target → asymmetric transition → permitted action set
```

The kernel enforces:

- unknown or invalid evidence fails closed to A0;
- worsening evidence demotes immediately and may skip states;
- recovery is sequential and requires sustained fresh evidence;
- replayed evidence epochs cannot fill promotion dwell;
- mission policy may cap maximum authority;
- ground/Pilot cannot directly assign authority;
- no state may override Anchor invariants;
- A0 retains a minimal declared survival set.

## Repository layout

```text
flight-reference/
├── include/cerberus_authority.h
├── src/cerberus_authority.c
├── src/demo.c
├── tests/test_authority.c
├── tests/property_campaign.c
├── verification/cbmc_harness.c
├── specification/authority-state-machine.md
├── specification/message-contracts.md
└── Makefile
```

The public site also contains a dedicated Web Worker demonstration. Pilot, Vigil, authority kernel, Watchdog, and Anchor run in separate worker contexts connected only by explicit `MessagePort` capabilities. The browser topology is explanatory and does not claim OS- or hardware-grade isolation.

## Build

Requires a C11 compiler and `make`.

```bash
cd flight-reference
make all
make test
make demo
```

### Sanitizers

```bash
make sanitize
```

The sanitizer target uses AddressSanitizer and UndefinedBehaviorSanitizer when supported by the selected compiler.

## Bounded model checking

A CBMC harness is included for the load-bearing safety properties:

```bash
cd flight-reference
cbmc src/cerberus_authority.c verification/cbmc_harness.c \
  -I include \
  --bounds-check \
  --pointer-check \
  --signed-overflow-check \
  --unsigned-overflow-check \
  --nan-check \
  --trace
```

The harness checks state bounds, immediate demotion, one-level-at-a-time promotion, fail-closed evidence handling, permanent denial of authority assignment/Anchor override, and preservation of the A0 survival set.

## Tests

`test_authority.c` covers named requirements and edge cases.

`property_campaign.c` executes 250,000 deterministic randomized transitions and checks invariants on every step, including stale-epoch replay, unknown evidence, compromised provenance, witness loss, and recovery oscillation.

The GitHub Actions workflow compiles and runs the suite with GCC and Clang and executes the sanitizer target.

## Architectural boundary

The kernel intentionally does not:

- estimate causal FCOI;
- authenticate real commands;
- calculate spacecraft trajectories;
- replace a mission Watchdog;
- provide hard real-time guarantees;
- prove that the configured thresholds are correct for any mission.

Those belong to separate assurance cases. Keeping this kernel small is a feature: its authority law should remain inspectable even when the Pilot and mission environment are complex.
