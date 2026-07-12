/*
 * CERBERUS reference authority kernel
 * Copyright (c) 2026 Emily Echterhoff. All rights reserved.
 *
 * Research reference implementation only. Not flight software.
 */
#ifndef CERBERUS_AUTHORITY_H
#define CERBERUS_AUTHORITY_H

#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    CERBERUS_A0 = 0,
    CERBERUS_A1 = 1,
    CERBERUS_A2 = 2,
    CERBERUS_A3 = 3
} cerberus_authority_t;

typedef enum {
    CERBERUS_EVIDENCE_INVALID = 0,
    CERBERUS_EVIDENCE_UNKNOWN = 1,
    CERBERUS_EVIDENCE_FRESH = 2
} cerberus_evidence_status_t;

typedef enum {
    CERBERUS_ACTION_SURVIVAL_ATTITUDE = 0,
    CERBERUS_ACTION_THERMAL_SURVIVAL,
    CERBERUS_ACTION_AUTHENTICATED_BEACON,
    CERBERUS_ACTION_BOUNDED_FAULT_ISOLATION,
    CERBERUS_ACTION_DIAGNOSTIC_REQUEST,
    CERBERUS_ACTION_LOW_ENERGY_CORRECTION,
    CERBERUS_ACTION_BOUNDED_MISSION_MANEUVER,
    CERBERUS_ACTION_IRREVERSIBLE_DEPLOYMENT,
    CERBERUS_ACTION_ASSIGN_AUTHORITY,
    CERBERUS_ACTION_OVERRIDE_ANCHOR
} cerberus_action_t;

typedef struct {
    /* Pessimistic upper bound: larger overlap means less independence. */
    double fcoi_ucb;
    /* Independently measured agreement/health in [0, 1]. */
    double sensor_agreement;
    bool provenance_valid;
    bool witness_independent;
    bool anchor_healthy;
    cerberus_evidence_status_t status;
    /* Must advance for evidence to count toward promotion dwell. */
    uint32_t evidence_epoch;
} cerberus_evidence_t;

typedef struct {
    double a3_max_fcoi;
    double a2_max_fcoi;
    double a1_max_fcoi;
    double a3_min_sensor_agreement;
    double a2_min_sensor_agreement;
    double a1_min_sensor_agreement;
    uint32_t promotion_dwell;
    cerberus_authority_t maximum_authority;
} cerberus_config_t;

typedef struct {
    cerberus_config_t config;
    cerberus_authority_t authority;
    uint32_t promotion_count;
    uint32_t last_evidence_epoch;
    bool initialized;
} cerberus_kernel_t;

typedef struct {
    cerberus_authority_t previous_authority;
    cerberus_authority_t target_authority;
    cerberus_authority_t resulting_authority;
    uint32_t promotion_count;
    bool demoted;
    bool promoted;
    bool evidence_counted;
    bool evidence_rejected;
} cerberus_transition_t;

cerberus_config_t cerberus_default_config(void);

void cerberus_init(
    cerberus_kernel_t *kernel,
    const cerberus_config_t *config,
    cerberus_authority_t initial_authority,
    uint32_t initial_epoch);

cerberus_authority_t cerberus_target_authority(
    const cerberus_config_t *config,
    const cerberus_evidence_t *evidence);

cerberus_transition_t cerberus_step(
    cerberus_kernel_t *kernel,
    const cerberus_evidence_t *evidence);

bool cerberus_action_allowed(
    cerberus_authority_t authority,
    cerberus_action_t action);

const char *cerberus_authority_name(cerberus_authority_t authority);
const char *cerberus_action_name(cerberus_action_t action);

#ifdef __cplusplus
}
#endif

#endif /* CERBERUS_AUTHORITY_H */
