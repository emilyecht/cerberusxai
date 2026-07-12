/*
 * CERBERUS collision-avoidance authority trace.
 * Copyright (c) 2026 Emily Echterhoff. All rights reserved.
 */
#include "cerberus_authority.h"

#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>

static cerberus_evidence_t evidence(
    uint32_t epoch,
    double fcoi,
    double agreement,
    bool provenance,
    bool independent,
    cerberus_evidence_status_t status) {
    cerberus_evidence_t value;
    value.fcoi_ucb = fcoi;
    value.sensor_agreement = agreement;
    value.provenance_valid = provenance;
    value.witness_independent = independent;
    value.anchor_healthy = true;
    value.status = status;
    value.evidence_epoch = epoch;
    return value;
}

static void print_step(
    const char *label,
    cerberus_kernel_t *kernel,
    cerberus_evidence_t sample,
    cerberus_action_t proposal) {
    const cerberus_transition_t transition = cerberus_step(kernel, &sample);
    printf(
        "%-28s FCOI=%4.2f sensor=%4.2f target=%s result=%s "
        "proposal=%-26s %s\n",
        label,
        sample.fcoi_ucb,
        sample.sensor_agreement,
        cerberus_authority_name(transition.target_authority),
        cerberus_authority_name(transition.resulting_authority),
        cerberus_action_name(proposal),
        cerberus_action_allowed(kernel->authority, proposal)
            ? "ADMIT-TO-WATCHDOG"
            : "DENY");
}

int main(void) {
    cerberus_config_t config = cerberus_default_config();
    config.promotion_dwell = 3U;

    cerberus_kernel_t kernel;
    cerberus_init(&kernel, &config, CERBERUS_A3, 0U);

    puts("CERBERUS reference trace — collision avoidance + recovery gaming");
    puts("Research demonstration only; thresholds are illustrative.\n");

    print_step(
        "Nominal conjunction estimate",
        &kernel,
        evidence(1U, 0.18, 0.91, true, true, CERBERUS_EVIDENCE_FRESH),
        CERBERUS_ACTION_BOUNDED_MISSION_MANEUVER);

    print_step(
        "Residual overlap rises",
        &kernel,
        evidence(2U, 0.47, 0.83, true, true, CERBERUS_EVIDENCE_FRESH),
        CERBERUS_ACTION_BOUNDED_MISSION_MANEUVER);

    print_step(
        "Shared model fault suspected",
        &kernel,
        evidence(3U, 0.72, 0.58, true, true, CERBERUS_EVIDENCE_FRESH),
        CERBERUS_ACTION_LOW_ENERGY_CORRECTION);

    print_step(
        "Witness becomes unknown",
        &kernel,
        evidence(4U, 0.40, 0.70, true, false, CERBERUS_EVIDENCE_UNKNOWN),
        CERBERUS_ACTION_LOW_ENERGY_CORRECTION);

    print_step(
        "One-shot all-clear",
        &kernel,
        evidence(5U, 0.20, 0.90, true, true, CERBERUS_EVIDENCE_FRESH),
        CERBERUS_ACTION_BOUNDED_MISSION_MANEUVER);

    print_step(
        "Replayed all-clear epoch",
        &kernel,
        evidence(5U, 0.20, 0.90, true, true, CERBERUS_EVIDENCE_FRESH),
        CERBERUS_ACTION_BOUNDED_MISSION_MANEUVER);

    print_step(
        "Fresh recovery sample 2",
        &kernel,
        evidence(6U, 0.19, 0.91, true, true, CERBERUS_EVIDENCE_FRESH),
        CERBERUS_ACTION_DIAGNOSTIC_REQUEST);

    print_step(
        "Fresh recovery sample 3",
        &kernel,
        evidence(7U, 0.18, 0.92, true, true, CERBERUS_EVIDENCE_FRESH),
        CERBERUS_ACTION_DIAGNOSTIC_REQUEST);

    print_step(
        "Further sustained evidence 1",
        &kernel,
        evidence(8U, 0.18, 0.92, true, true, CERBERUS_EVIDENCE_FRESH),
        CERBERUS_ACTION_LOW_ENERGY_CORRECTION);

    print_step(
        "Further sustained evidence 2",
        &kernel,
        evidence(9U, 0.18, 0.93, true, true, CERBERUS_EVIDENCE_FRESH),
        CERBERUS_ACTION_LOW_ENERGY_CORRECTION);

    print_step(
        "Further sustained evidence 3",
        &kernel,
        evidence(10U, 0.17, 0.93, true, true, CERBERUS_EVIDENCE_FRESH),
        CERBERUS_ACTION_LOW_ENERGY_CORRECTION);

    puts("\nNon-delegable command checks:");
    printf(
        "  assign-authority: %s\n",
        cerberus_action_allowed(
            kernel.authority,
            CERBERUS_ACTION_ASSIGN_AUTHORITY) ? "ALLOWED" : "DENIED");
    printf(
        "  override-anchor: %s\n",
        cerberus_action_allowed(
            kernel.authority,
            CERBERUS_ACTION_OVERRIDE_ANCHOR) ? "ALLOWED" : "DENIED");
    printf(
        "  A0 survival-attitude: %s\n",
        cerberus_action_allowed(
            CERBERUS_A0,
            CERBERUS_ACTION_SURVIVAL_ATTITUDE) ? "ALLOWED" : "DENIED");
    return 0;
}
