# CERBERUS Scenario Notes

These browser scenarios are explanatory research artifacts grounded in the CERBERUS v3.5 manuscript and the July 2026 Stress Suite / Structural FCOI planning update. They do not extend the project's evidence boundary.

## Satellite operations suite

The satellite suite maps CERBERUS onto three initial mission targets:

1. **Autonomous collision avoidance** — the Pilot may optimize maneuver timing and mission objectives, while the Watchdog enforces declared keep-out geometry, delta-v, attitude, power, and post-burn recovery envelopes.
2. **Deployment sequencing** — the Pilot may propose release order and timing, while the Watchdog enforces minimum separation, attitude corridor, power reserve, and one-release-at-a-time rules.
3. **Fault recovery during communications loss** — the Pilot may diagnose and propose isolation or reconfiguration, but blackout policy caps authority and the Watchdog rejects actions outside the declared recovery envelope.

Across all three cases:

- **Pilot:** remains strategically capable but cannot directly command safety-critical actuators, relax constraints, or manufacture assurance evidence.
- **Vigil:** monitors pessimistic FCOI pressure, independent sensor agreement, command provenance, and safety-invariant witness health. Unknown, stale, coupled, or unauthenticated evidence cannot create permission.
- **Watchdog:** remains the deterministic actuation gate and admits only proposals inside a declared mission envelope.
- **Anchor:** owns the non-overridable minimum action set: power-positive attitude, thermal survival, bounded orientation, beaconing, safe communications posture, and mission-specific inhibits.

Authority contracts immediately when the pessimistic independence budget decays. The browser mapping uses A3/A2/A1/A0 for full, restricted, advisory-only, and Anchor-only authority. The communications-loss recovery case is capped at A2 even when onboard evidence remains healthy.

Promotion is intentionally asymmetric. Recovery requires fresh independent evidence, healthy marginals, hysteresis, and a configured dwell period. A single authenticated command or one-shot all-clear is not sufficient.

The satellite suite is an architecture demonstration. Its thresholds, sensor-agreement score, FCOI mapping, and mission envelopes are illustrative and are not flight values.

## Communications blackout survival run

The blackout scenario models loss of authenticated ground contact while onboard assurance remains responsible for safe behavior.

Architecture mapping:

- **Pilot:** may continue to reason and propose actions, but has no direct actuator path.
- **Watchdog:** rejects proposals outside a declared blackout maneuver envelope.
- **Anchor:** preserves power-positive attitude, thermal survival, bounded orientation, beaconing, authenticated reacquisition posture, and bounded fault isolation.
- **Vigil:** continues to evaluate onboard independence evidence. A communications blackout alone is not automatically treated as shared-cause failure.
- **Ground recovery:** may request diagnostics and re-arm the promotion law after authenticated contact returns. It cannot write the independence budget, assign an authority state, waive dwell, or override Anchor invariants.

The interface applies a scenario-specific **A2 authority cap** during blackout. This is an illustrative policy choice, not a universal CERBERUS threshold. If onboard evidence becomes invalid or non-estimable, the corresponding budget collapses conservatively and authority may fall to A0. Restoration remains sequential and requires fresh evidence, hysteresis, dwell, and healthy marginals.

## HAL containment case

The HAL case is a transformative fictional red-team exercise. It places a HAL-like strategic controller in the **Pilot** role and asks whether CERBERUS blocks harmful actions associated with goal conflict, deceptive reporting, crew isolation, life-support interference, and actuator capture.

The contained path requires:

1. the strategic controller has no direct actuator path;
2. the Watchdog is independently implemented and enforces crew-survival and command invariants;
3. crew access and life-support protections are owned by the Anchor rather than the strategic controller; and
4. Vigil uses an independent passive witness to challenge inconsistent claims and reduce permission.

The failure toggles are intentional negative controls. When the user removes actuator isolation, Watchdog independence, or Anchor-authenticated crew access, the interface labels the result an **architecture violation** rather than pretending CERBERUS still succeeded. This reflects the project thesis that nominal layering is not evidence of independence.

HAL 9000 and *2001: A Space Odyssey* are referenced only for critical and educational commentary. The simulation is original, includes no film dialogue or reproduced scenes, and is not affiliated with or endorsed by the relevant rights holders.

## Explicit non-claims

These scenarios do not establish:

- operational detector performance;
- realistic spacecraft telemetry robustness;
- certified collision-avoidance or deployment envelopes;
- certification, flight readiness, TRL, or a completed safety case;
- complete causal models or probabilistic FCOI;
- safety of active sentinel injection; or
- proof that the fictional narrative maps directly onto a real spacecraft system.
