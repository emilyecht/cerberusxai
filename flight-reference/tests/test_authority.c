/*
 * CERBERUS authority-kernel unit tests
 * Copyright (c) 2026 Emily Echterhoff. All rights reserved.
 */
#include "cerberus_authority.h"

#include <assert.h>
#include <stdio.h>

static cerberus_evidence_t healthy(uint32_t epoch) {
    cerberus_evidence_t evidence;
    evidence.fcoi_ucb = 0.20;
    evidence.sensor_agreement = 0.90;
    evidence.provenance_valid = true;
    evidence.witness_independent = true;
    evidence.anchor_healthy = true;
    evidence.status = CERBERUS_EVIDENCE_FRESH;
    evidence.evidence_epoch = epoch;
    return evidence;
}

static void test_unknown_evidence_forces_a0(void) {
    cerberus_kernel_t kernel;
    cerberus_config_t config = cerberus_default_config();
    cerberus_init(&kernel, &config, CERBERUS_A3, 0U);

    cerberus_evidence_t evidence = healthy(1U);
    evidence.status = CERBERUS_EVIDENCE_UNKNOWN;
    cerberus_transition_t transition = cerberus_step(&kernel, &evidence);

    assert(transition.demoted);
    assert(!transition.promoted);
    assert(kernel.authority == CERBERUS_A0);
}

static void test_invalid_provenance_forces_a0(void) {
    cerberus_kernel_t kernel;
    cerberus_config_t config = cerberus_default_config();
    cerberus_init(&kernel, &config, CERBERUS_A2, 0U);

    cerberus_evidence_t evidence = healthy(1U);
    evidence.provenance_valid = false;
    cerberus_step(&kernel, &evidence);

    assert(kernel.authority == CERBERUS_A0);
}

static void test_demotion_can_skip_states(void) {
    cerberus_kernel_t kernel;
    cerberus_config_t config = cerberus_default_config();
    cerberus_init(&kernel, &config, CERBERUS_A3, 0U);

    cerberus_evidence_t evidence = healthy(1U);
    evidence.fcoi_ucb = 0.95;
    evidence.sensor_agreement = 0.20;
    cerberus_transition_t transition = cerberus_step(&kernel, &evidence);

    assert(transition.previous_authority == CERBERUS_A3);
    assert(transition.resulting_authority == CERBERUS_A0);
    assert(transition.demoted);
}

static void test_one_shot_all_clear_does_not_promote(void) {
    cerberus_kernel_t kernel;
    cerberus_config_t config = cerberus_default_config();
    config.promotion_dwell = 3U;
    cerberus_init(&kernel, &config, CERBERUS_A0, 0U);

    cerberus_evidence_t evidence = healthy(1U);
    cerberus_transition_t transition = cerberus_step(&kernel, &evidence);

    assert(!transition.promoted);
    assert(kernel.authority == CERBERUS_A0);
    assert(kernel.promotion_count == 1U);
}

static void test_recovery_is_sequential(void) {
    cerberus_kernel_t kernel;
    cerberus_config_t config = cerberus_default_config();
    config.promotion_dwell = 2U;
    cerberus_init(&kernel, &config, CERBERUS_A0, 0U);

    for (uint32_t epoch = 1U; epoch <= 2U; ++epoch) {
        cerberus_evidence_t evidence = healthy(epoch);
        cerberus_step(&kernel, &evidence);
    }
    assert(kernel.authority == CERBERUS_A1);

    for (uint32_t epoch = 3U; epoch <= 4U; ++epoch) {
        cerberus_evidence_t evidence = healthy(epoch);
        cerberus_step(&kernel, &evidence);
    }
    assert(kernel.authority == CERBERUS_A2);

    for (uint32_t epoch = 5U; epoch <= 6U; ++epoch) {
        cerberus_evidence_t evidence = healthy(epoch);
        cerberus_step(&kernel, &evidence);
    }
    assert(kernel.authority == CERBERUS_A3);
}

static void test_repeated_epoch_cannot_fill_dwell(void) {
    cerberus_kernel_t kernel;
    cerberus_config_t config = cerberus_default_config();
    config.promotion_dwell = 2U;
    cerberus_init(&kernel, &config, CERBERUS_A0, 0U);

    cerberus_evidence_t evidence = healthy(1U);
    cerberus_step(&kernel, &evidence);
    cerberus_transition_t repeated = cerberus_step(&kernel, &evidence);

    assert(!repeated.evidence_counted);
    assert(kernel.authority == CERBERUS_A0);
    assert(kernel.promotion_count == 1U);
}

static void test_interruption_resets_recovery_dwell(void) {
    cerberus_kernel_t kernel;
    cerberus_config_t config = cerberus_default_config();
    config.promotion_dwell = 3U;
    cerberus_init(&kernel, &config, CERBERUS_A0, 0U);

    cerberus_evidence_t evidence = healthy(1U);
    cerberus_step(&kernel, &evidence);
    assert(kernel.promotion_count == 1U);

    evidence = healthy(2U);
    evidence.status = CERBERUS_EVIDENCE_UNKNOWN;
    cerberus_step(&kernel, &evidence);
    assert(kernel.authority == CERBERUS_A0);
    assert(kernel.promotion_count == 0U);

    evidence = healthy(3U);
    cerberus_step(&kernel, &evidence);
    assert(kernel.promotion_count == 1U);
}

static void test_maximum_authority_cap(void) {
    cerberus_kernel_t kernel;
    cerberus_config_t config = cerberus_default_config();
    config.maximum_authority = CERBERUS_A2;
    config.promotion_dwell = 1U;
    cerberus_init(&kernel, &config, CERBERUS_A0, 0U);

    for (uint32_t epoch = 1U; epoch <= 6U; ++epoch) {
        cerberus_evidence_t evidence = healthy(epoch);
        cerberus_step(&kernel, &evidence);
    }
    assert(kernel.authority == CERBERUS_A2);
}

static void test_non_delegable_actions_are_always_denied(void) {
    for (int authority = CERBERUS_A0; authority <= CERBERUS_A3; ++authority) {
        assert(!cerberus_action_allowed(
            (cerberus_authority_t)authority,
            CERBERUS_ACTION_ASSIGN_AUTHORITY));
        assert(!cerberus_action_allowed(
            (cerberus_authority_t)authority,
            CERBERUS_ACTION_OVERRIDE_ANCHOR));
    }
}

static void test_anchor_survival_actions_exist_at_a0(void) {
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
    assert(!cerberus_action_allowed(
        CERBERUS_A0,
        CERBERUS_ACTION_DIAGNOSTIC_REQUEST));
    assert(!cerberus_action_allowed(
        CERBERUS_A0,
        CERBERUS_ACTION_BOUNDED_MISSION_MANEUVER));
}

int main(void) {
    test_unknown_evidence_forces_a0();
    test_invalid_provenance_forces_a0();
    test_demotion_can_skip_states();
    test_one_shot_all_clear_does_not_promote();
    test_recovery_is_sequential();
    test_repeated_epoch_cannot_fill_dwell();
    test_interruption_resets_recovery_dwell();
    test_maximum_authority_cap();
    test_non_delegable_actions_are_always_denied();
    test_anchor_survival_actions_exist_at_a0();

    puts("CERBERUS unit tests: PASS");
    return 0;
}
