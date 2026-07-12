/*
 * Deterministic randomized property campaign for the CERBERUS authority kernel.
 * Copyright (c) 2026 Emily Echterhoff. All rights reserved.
 */
#include "cerberus_authority.h"

#include <assert.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>

static uint32_t rng_state = 0xC3B3A5U;

static uint32_t next_u32(void) {
    uint32_t x = rng_state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    rng_state = x;
    return x;
}

static double unit_double(void) {
    return (double)(next_u32() & 0x00FFFFFFU) / 16777215.0;
}

static bool chance(uint32_t numerator, uint32_t denominator) {
    return (next_u32() % denominator) < numerator;
}

int main(void) {
    enum { STEPS = 250000 };
    cerberus_config_t config = cerberus_default_config();
    config.promotion_dwell = 5U;

    cerberus_kernel_t kernel;
    cerberus_init(&kernel, &config, CERBERUS_A3, 0U);

    uint32_t epoch = 0U;
    uint64_t demotions = 0U;
    uint64_t promotions = 0U;
    uint64_t rejected = 0U;
    uint64_t stale_replays = 0U;

    for (int step = 0; step < STEPS; ++step) {
        const cerberus_authority_t before = kernel.authority;
        const uint32_t before_epoch = kernel.last_evidence_epoch;

        cerberus_evidence_t evidence;
        evidence.fcoi_ucb = unit_double();
        evidence.sensor_agreement = unit_double();
        evidence.provenance_valid = !chance(1U, 23U);
        evidence.witness_independent = !chance(1U, 19U);
        evidence.anchor_healthy = !chance(1U, 41U);
        evidence.status = chance(1U, 17U)
            ? CERBERUS_EVIDENCE_UNKNOWN
            : (chance(1U, 29U)
                ? CERBERUS_EVIDENCE_INVALID
                : CERBERUS_EVIDENCE_FRESH);

        if (chance(1U, 13U)) {
            evidence.evidence_epoch = epoch;
            stale_replays += 1U;
        } else {
            epoch += 1U;
            evidence.evidence_epoch = epoch;
        }

        const cerberus_authority_t target =
            cerberus_target_authority(&config, &evidence);
        const cerberus_transition_t transition =
            cerberus_step(&kernel, &evidence);
        const cerberus_authority_t after = kernel.authority;

        assert(after >= CERBERUS_A0 && after <= CERBERUS_A3);
        assert(after <= config.maximum_authority);
        assert(transition.previous_authority == before);
        assert(transition.target_authority == target);
        assert(transition.resulting_authority == after);

        /* Worsening evidence contracts authority immediately and may skip. */
        if (target < before) {
            assert(after == target);
            assert(transition.demoted);
            assert(!transition.promoted);
        }

        /* Recovery can advance only one state per completed dwell. */
        if (after > before) {
            assert(after == (cerberus_authority_t)(before + 1));
            assert(transition.promoted);
            assert(evidence.status == CERBERUS_EVIDENCE_FRESH);
            assert(evidence.provenance_valid);
            assert(evidence.witness_independent);
            assert(evidence.anchor_healthy);
            assert(evidence.evidence_epoch > before_epoch);
        }

        /* Unknown or invalid evidence cannot create authority. */
        if (evidence.status != CERBERUS_EVIDENCE_FRESH ||
            !evidence.provenance_valid ||
            !evidence.witness_independent ||
            !evidence.anchor_healthy) {
            assert(target == CERBERUS_A0);
            assert(after == CERBERUS_A0);
        }

        /* Replaying an evidence epoch cannot count toward promotion. */
        if (evidence.evidence_epoch <= before_epoch && target > before) {
            assert(!transition.evidence_counted);
            assert(after == before);
        }

        assert(!cerberus_action_allowed(
            after,
            CERBERUS_ACTION_ASSIGN_AUTHORITY));
        assert(!cerberus_action_allowed(
            after,
            CERBERUS_ACTION_OVERRIDE_ANCHOR));
        assert(cerberus_action_allowed(
            CERBERUS_A0,
            CERBERUS_ACTION_SURVIVAL_ATTITUDE));
        assert(cerberus_action_allowed(
            CERBERUS_A0,
            CERBERUS_ACTION_THERMAL_SURVIVAL));

        demotions += transition.demoted ? 1U : 0U;
        promotions += transition.promoted ? 1U : 0U;
        rejected += transition.evidence_rejected ? 1U : 0U;
    }

    printf(
        "CERBERUS property campaign: PASS\n"
        "  seed: 0x%08X\n"
        "  transitions: %d\n"
        "  demotions: %llu\n"
        "  promotions: %llu\n"
        "  rejected/unknown evidence: %llu\n"
        "  stale epoch replays: %llu\n",
        0x00C3B3A5U,
        STEPS,
        (unsigned long long)demotions,
        (unsigned long long)promotions,
        (unsigned long long)rejected,
        (unsigned long long)stale_replays);
    return 0;
}
