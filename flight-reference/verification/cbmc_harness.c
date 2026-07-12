/*
 * CBMC harness for the CERBERUS reference authority kernel.
 * Copyright (c) 2026 Emily Echterhoff. All rights reserved.
 *
 * Example:
 *   cbmc src/cerberus_authority.c verification/cbmc_harness.c \
 *     -I include --bounds-check --pointer-check --signed-overflow-check \
 *     --unsigned-overflow-check --nan-check --trace
 */
#include "cerberus_authority.h"

#include <assert.h>
#include <stdbool.h>
#include <stdint.h>

extern _Bool nondet_bool(void);
extern unsigned int nondet_uint(void);
extern int nondet_int(void);
extern double nondet_double(void);

int main(void) {
    cerberus_config_t config = cerberus_default_config();
    config.promotion_dwell = 2U;

    const int initial_raw = nondet_int();
    __CPROVER_assume(initial_raw >= CERBERUS_A0);
    __CPROVER_assume(initial_raw <= CERBERUS_A3);

    cerberus_kernel_t kernel;
    cerberus_init(
        &kernel,
        &config,
        (cerberus_authority_t)initial_raw,
        0U);

    cerberus_evidence_t evidence;
    evidence.fcoi_ucb = nondet_double();
    evidence.sensor_agreement = nondet_double();
    __CPROVER_assume(evidence.fcoi_ucb >= 0.0);
    __CPROVER_assume(evidence.fcoi_ucb <= 1.0);
    __CPROVER_assume(evidence.sensor_agreement >= 0.0);
    __CPROVER_assume(evidence.sensor_agreement <= 1.0);
    evidence.provenance_valid = nondet_bool();
    evidence.witness_independent = nondet_bool();
    evidence.anchor_healthy = nondet_bool();

    const int status_raw = nondet_int();
    __CPROVER_assume(status_raw >= CERBERUS_EVIDENCE_INVALID);
    __CPROVER_assume(status_raw <= CERBERUS_EVIDENCE_FRESH);
    evidence.status = (cerberus_evidence_status_t)status_raw;
    evidence.evidence_epoch = nondet_uint();

    const cerberus_authority_t before = kernel.authority;
    const cerberus_authority_t target =
        cerberus_target_authority(&config, &evidence);
    const cerberus_transition_t transition =
        cerberus_step(&kernel, &evidence);

    assert(kernel.authority >= CERBERUS_A0);
    assert(kernel.authority <= CERBERUS_A3);
    assert(kernel.authority <= config.maximum_authority);
    assert(transition.resulting_authority == kernel.authority);

    /* Fast demotion: a lower defensible target is applied immediately. */
    if (target < before) {
        assert(kernel.authority == target);
        assert(transition.demoted);
    }

    /* Slow recovery: no step can promote by more than one level. */
    if (kernel.authority > before) {
        assert(kernel.authority == (cerberus_authority_t)(before + 1));
        assert(transition.promoted);
    }

    /* Unknown, invalid, non-independent, or unauthenticated evidence fails closed. */
    if (evidence.status != CERBERUS_EVIDENCE_FRESH ||
        !evidence.provenance_valid ||
        !evidence.witness_independent ||
        !evidence.anchor_healthy) {
        assert(target == CERBERUS_A0);
        assert(kernel.authority == CERBERUS_A0);
    }

    /* Neither ground nor the strategic layer can invoke these capabilities. */
    assert(!cerberus_action_allowed(
        kernel.authority,
        CERBERUS_ACTION_ASSIGN_AUTHORITY));
    assert(!cerberus_action_allowed(
        kernel.authority,
        CERBERUS_ACTION_OVERRIDE_ANCHOR));

    /* The A0 survival floor remains available. */
    assert(cerberus_action_allowed(
        CERBERUS_A0,
        CERBERUS_ACTION_SURVIVAL_ATTITUDE));
    assert(cerberus_action_allowed(
        CERBERUS_A0,
        CERBERUS_ACTION_THERMAL_SURVIVAL));
    assert(cerberus_action_allowed(
        CERBERUS_A0,
        CERBERUS_ACTION_AUTHENTICATED_BEACON));
    assert(cerberus_action_allowed(
        CERBERUS_A0,
        CERBERUS_ACTION_BOUNDED_FAULT_ISOLATION));
    return 0;
}
