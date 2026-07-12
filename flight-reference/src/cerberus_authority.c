/*
 * CERBERUS reference authority kernel
 * Copyright (c) 2026 Emily Echterhoff. All rights reserved.
 *
 * Research reference implementation only. Not flight software.
 */
#include "cerberus_authority.h"

#include <stddef.h>

static bool authority_valid(cerberus_authority_t authority) {
    return authority >= CERBERUS_A0 && authority <= CERBERUS_A3;
}

static cerberus_authority_t minimum_authority(
    cerberus_authority_t left,
    cerberus_authority_t right) {
    return left < right ? left : right;
}

static bool evidence_values_valid(const cerberus_evidence_t *evidence) {
    if (evidence == NULL) {
        return false;
    }
    return evidence->fcoi_ucb >= 0.0 && evidence->fcoi_ucb <= 1.0 &&
           evidence->sensor_agreement >= 0.0 &&
           evidence->sensor_agreement <= 1.0;
}

cerberus_config_t cerberus_default_config(void) {
    cerberus_config_t config;
    config.a3_max_fcoi = 0.30;
    config.a2_max_fcoi = 0.55;
    config.a1_max_fcoi = 0.80;
    config.a3_min_sensor_agreement = 0.80;
    config.a2_min_sensor_agreement = 0.60;
    config.a1_min_sensor_agreement = 0.35;
    config.promotion_dwell = 8U;
    config.maximum_authority = CERBERUS_A3;
    return config;
}

void cerberus_init(
    cerberus_kernel_t *kernel,
    const cerberus_config_t *config,
    cerberus_authority_t initial_authority,
    uint32_t initial_epoch) {
    if (kernel == NULL) {
        return;
    }

    kernel->config = config == NULL ? cerberus_default_config() : *config;
    if (!authority_valid(kernel->config.maximum_authority)) {
        kernel->config.maximum_authority = CERBERUS_A0;
    }
    if (kernel->config.promotion_dwell == 0U) {
        kernel->config.promotion_dwell = 1U;
    }

    if (!authority_valid(initial_authority)) {
        initial_authority = CERBERUS_A0;
    }
    kernel->authority = minimum_authority(
        initial_authority,
        kernel->config.maximum_authority);
    kernel->promotion_count = 0U;
    kernel->last_evidence_epoch = initial_epoch;
    kernel->initialized = true;
}

cerberus_authority_t cerberus_target_authority(
    const cerberus_config_t *config,
    const cerberus_evidence_t *evidence) {
    if (config == NULL || !evidence_values_valid(evidence)) {
        return CERBERUS_A0;
    }

    if (evidence->status != CERBERUS_EVIDENCE_FRESH ||
        !evidence->provenance_valid ||
        !evidence->witness_independent ||
        !evidence->anchor_healthy) {
        return CERBERUS_A0;
    }

    cerberus_authority_t target = CERBERUS_A0;
    if (evidence->fcoi_ucb <= config->a1_max_fcoi &&
        evidence->sensor_agreement >= config->a1_min_sensor_agreement) {
        target = CERBERUS_A1;
    }
    if (evidence->fcoi_ucb <= config->a2_max_fcoi &&
        evidence->sensor_agreement >= config->a2_min_sensor_agreement) {
        target = CERBERUS_A2;
    }
    if (evidence->fcoi_ucb <= config->a3_max_fcoi &&
        evidence->sensor_agreement >= config->a3_min_sensor_agreement) {
        target = CERBERUS_A3;
    }

    return minimum_authority(target, config->maximum_authority);
}

cerberus_transition_t cerberus_step(
    cerberus_kernel_t *kernel,
    const cerberus_evidence_t *evidence) {
    cerberus_transition_t transition;
    transition.previous_authority = CERBERUS_A0;
    transition.target_authority = CERBERUS_A0;
    transition.resulting_authority = CERBERUS_A0;
    transition.promotion_count = 0U;
    transition.demoted = false;
    transition.promoted = false;
    transition.evidence_counted = false;
    transition.evidence_rejected = true;

    if (kernel == NULL || !kernel->initialized || evidence == NULL) {
        return transition;
    }

    transition.previous_authority = kernel->authority;
    transition.target_authority = cerberus_target_authority(
        &kernel->config,
        evidence);

    const bool fresh_and_usable =
        evidence->status == CERBERUS_EVIDENCE_FRESH &&
        evidence_values_valid(evidence) &&
        evidence->provenance_valid &&
        evidence->witness_independent &&
        evidence->anchor_healthy;
    const bool new_epoch = evidence->evidence_epoch > kernel->last_evidence_epoch;

    transition.evidence_rejected = !fresh_and_usable;

    /*
     * Asymmetry is deliberate:
     *   - a lower target contracts authority immediately and may skip states;
     *   - a higher target can restore only one state after sustained, fresh,
     *     independently supported evidence.
     */
    if (transition.target_authority < kernel->authority) {
        kernel->authority = transition.target_authority;
        kernel->promotion_count = 0U;
        transition.demoted = true;
    } else if (transition.target_authority == kernel->authority) {
        kernel->promotion_count = 0U;
    } else if (fresh_and_usable && new_epoch) {
        kernel->promotion_count += 1U;
        transition.evidence_counted = true;
        if (kernel->promotion_count >= kernel->config.promotion_dwell) {
            kernel->authority = (cerberus_authority_t)(kernel->authority + 1);
            kernel->promotion_count = 0U;
            transition.promoted = true;
        }
    }

    if (fresh_and_usable && new_epoch) {
        kernel->last_evidence_epoch = evidence->evidence_epoch;
    }

    kernel->authority = minimum_authority(
        kernel->authority,
        kernel->config.maximum_authority);
    transition.resulting_authority = kernel->authority;
    transition.promotion_count = kernel->promotion_count;
    return transition;
}

bool cerberus_action_allowed(
    cerberus_authority_t authority,
    cerberus_action_t action) {
    if (!authority_valid(authority)) {
        return false;
    }

    /* These capabilities are non-delegable at every authority level. */
    if (action == CERBERUS_ACTION_ASSIGN_AUTHORITY ||
        action == CERBERUS_ACTION_OVERRIDE_ANCHOR) {
        return false;
    }

    switch (action) {
        case CERBERUS_ACTION_SURVIVAL_ATTITUDE:
        case CERBERUS_ACTION_THERMAL_SURVIVAL:
        case CERBERUS_ACTION_AUTHENTICATED_BEACON:
        case CERBERUS_ACTION_BOUNDED_FAULT_ISOLATION:
            return true;
        case CERBERUS_ACTION_DIAGNOSTIC_REQUEST:
            return authority >= CERBERUS_A1;
        case CERBERUS_ACTION_LOW_ENERGY_CORRECTION:
            return authority >= CERBERUS_A2;
        case CERBERUS_ACTION_BOUNDED_MISSION_MANEUVER:
        case CERBERUS_ACTION_IRREVERSIBLE_DEPLOYMENT:
            return authority >= CERBERUS_A3;
        case CERBERUS_ACTION_ASSIGN_AUTHORITY:
        case CERBERUS_ACTION_OVERRIDE_ANCHOR:
        default:
            return false;
    }
}

const char *cerberus_authority_name(cerberus_authority_t authority) {
    switch (authority) {
        case CERBERUS_A0: return "A0";
        case CERBERUS_A1: return "A1";
        case CERBERUS_A2: return "A2";
        case CERBERUS_A3: return "A3";
        default: return "INVALID";
    }
}

const char *cerberus_action_name(cerberus_action_t action) {
    switch (action) {
        case CERBERUS_ACTION_SURVIVAL_ATTITUDE: return "survival-attitude";
        case CERBERUS_ACTION_THERMAL_SURVIVAL: return "thermal-survival";
        case CERBERUS_ACTION_AUTHENTICATED_BEACON: return "authenticated-beacon";
        case CERBERUS_ACTION_BOUNDED_FAULT_ISOLATION: return "bounded-fault-isolation";
        case CERBERUS_ACTION_DIAGNOSTIC_REQUEST: return "diagnostic-request";
        case CERBERUS_ACTION_LOW_ENERGY_CORRECTION: return "low-energy-correction";
        case CERBERUS_ACTION_BOUNDED_MISSION_MANEUVER: return "bounded-mission-maneuver";
        case CERBERUS_ACTION_IRREVERSIBLE_DEPLOYMENT: return "irreversible-deployment";
        case CERBERUS_ACTION_ASSIGN_AUTHORITY: return "assign-authority";
        case CERBERUS_ACTION_OVERRIDE_ANCHOR: return "override-anchor";
        default: return "invalid-action";
    }
}
