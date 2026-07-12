# CERBERUS Pages

Interactive research interface for **CERBERUS: Runtime Independence Budgeting for Layered Assurance in Autonomous Systems**.

This repository presents browser-based explanatory simulations for:

- the matched-model Vigil evidence pipeline;
- pessimistic Failure-Cause Overlap Index (FCOI) evidence;
- asymmetric authority contraction and evidence-gated restoration;
- Structural FCOI minimal-cut-set overlap and near-match reporting;
- the planned Stress Suite v1 scenario families;
- a satellite operations suite covering autonomous collision avoidance, deployment sequencing, and fault recovery during communications loss;
- a communications-blackout survival simulation;
- a HAL-inspired fictional containment case that tests whether authority separation actually prevents harmful actuation;
- an assurance workbench for inspectable mission policies, decision traces, provenance, architecture comparisons, claims mapping, and HIL planning; and
- an executable C11 authority kernel plus a capability-scoped Web Worker process demonstration.

## Incident Theatre

Open [`scenarios.html`](scenarios.html) for the satellite operations suite, communications-blackout run, and HAL containment simulation.

The satellite suite makes the mission mapping explicit:

- **Pilot** optimizes maneuvering, deployment, and recovery proposals but has no direct actuator path;
- **Vigil** tracks FCOI pressure, independent sensor agreement, command provenance, and safety-invariant health;
- **Watchdog** applies deterministic mission envelopes before actuation; and
- **Anchor** preserves attitude, power, thermal limits, beaconing, and a safe communications posture whenever authority contracts.

Restoration is sequential and requires sustained fresh independent evidence rather than a one-shot all-clear.

## Assurance Workbench

Open [`assurance-workbench.html`](assurance-workbench.html) for the integrated review surface. It includes:

- an exportable evidence ledger and printable run report;
- a monolith vs. nominal layering vs. CERBERUS comparison;
- an illustrative mission-profile and authority-policy builder;
- a failure gallery and claims-to-evidence map;
- a hardware-in-the-loop roadmap and scenario replay timeline;
- an A3–A0 authority-envelope visualizer;
- a command-provenance inspector;
- a research hub and collaboration needs page.

All generated policies, thresholds, command decisions, and reports are explicitly illustrative and remain inside the repository's evidence boundary.

## Flight Reference Kernel

Open [`flight-kernel.html`](flight-kernel.html) for the process-separated browser laboratory, or inspect [`flight-reference/`](flight-reference/) for the executable C11 implementation.

The reference implementation adds:

- a small authority kernel implementing `evidence → target → transition → action surface`;
- immediate skip-state demotion and one-level-at-a-time recovery;
- freshness epochs that prevent replayed evidence from filling dwell;
- permanent denial of direct authority assignment and Anchor override;
- an explicit A0 survival-action residue;
- named C unit tests;
- a deterministic 250,000-transition randomized property campaign;
- a CBMC bounded-model-checking harness;
- GCC, Clang, AddressSanitizer, and UndefinedBehaviorSanitizer CI;
- five dedicated Web Workers connected through capability-scoped `MessageChannel` ports.

The browser demonstration gives Pilot no Anchor command port and gives Vigil no actuator capability. This is a coded topology demonstration, not OS-level or hardware isolation.

## Evidence boundary

This site is a research communication artifact. It is **not flight software, certification evidence, an operational detector, or a completed safety case**. Browser simulations and reference code must not be interpreted as extending the evidence boundary of the CERBERUS v3.5 manuscript or its supplemental roadmap.

The matched-model demonstration is intentionally aligned with its synthetic generator. Its purpose is pipeline verification and reproducibility, not realistic detector validation. Mission-specific authority thresholds require independent engineering and certification.

The satellite cases use illustrative authority thresholds and simplified mission envelopes. They do not establish operational collision-avoidance performance, deployment safety, flight readiness, or validated fault-recovery behavior. The communications-blackout scenario declares an illustrative A2 authority cap during loss of authenticated ground contact. The HAL containment case is an original educational thought experiment: it does not reproduce film dialogue, claim that the fictional system had CERBERUS architecture, or establish real-world validation.

The C11 kernel establishes only that the implemented state machine enforces its stated software properties under its declared inputs and test assumptions. It does not establish that FCOI evidence is causally correct, mission thresholds are valid, isolation survives hostile hardware/software, or a spacecraft is safe.

## Local use

Serve the repository with a static web server so Web Workers can load under the same origin:

```bash
python -m http.server 8080
```

Then visit:

- `http://localhost:8080/`
- `http://localhost:8080/assurance-workbench.html`
- `http://localhost:8080/flight-kernel.html`

Build the C reference kernel with:

```bash
cd flight-reference
make all
make test
make demo
```

## Scenario notes

Detailed architecture mapping and non-claims are documented in [`SCENARIO_NOTES.md`](SCENARIO_NOTES.md).

## Research basis

- CERBERUS v3.5 architecture manuscript, July 2026
- CERBERUS White Paper Update: Stress Suite v1 and Structural FCOI Engine v1, July 2026

## Copyright

Copyright © 2026 Emily Echterhoff. All rights reserved. See [`COPYRIGHT.md`](COPYRIGHT.md).
