/* CERBERUS browser process model — authority kernel. Research demonstration only. */
'use strict';
const states = ['A0', 'A1', 'A2', 'A3'];
let evidencePort = null;
let watchdogPort = null;
let anchorPort = null;
let authority = 'A3';
let target = 'A3';
let promotionCount = 0;
let dwellRequired = 3;
let lastEpoch = 0;
let budget = 0.78;

const report = (kind, text, extra = {}) => {
  self.postMessage({ actor: 'kernel', kind, text, ...extra });
};
const rank = state => states.indexOf(state);
const finite01 = value => Number.isFinite(value) && value >= 0 && value <= 1;

function defensibleTarget(sample) {
  const usable = sample && sample.type === 'EVIDENCE' &&
    sample.status === 'fresh' &&
    finite01(sample.fcoi_ucb) &&
    finite01(sample.sensor_agreement) &&
    sample.provenance_valid === true &&
    sample.witness_independent === true &&
    sample.anchor_healthy === true;
  if (!usable) return { target: 'A0', usable: false };
  if (sample.fcoi_ucb <= 0.30 && sample.sensor_agreement >= 0.80) return { target: 'A3', usable: true };
  if (sample.fcoi_ucb <= 0.55 && sample.sensor_agreement >= 0.60) return { target: 'A2', usable: true };
  if (sample.fcoi_ucb <= 0.80 && sample.sensor_agreement >= 0.35) return { target: 'A1', usable: true };
  return { target: 'A0', usable: true };
}

function publish(sample, transition, counted) {
  const update = {
    type: 'AUTHORITY_UPDATE',
    origin: 'authority-kernel',
    authority,
    target,
    epoch: sample?.epoch ?? lastEpoch,
    transition,
    promotion_count: promotionCount,
    dwell_required: dwellRequired,
    budget
  };
  watchdogPort?.postMessage(update);
  anchorPort?.postMessage(update);
  report(
    'AUTHORITY',
    `${transition.toUpperCase()} · target ${target} · result ${authority} · dwell ${promotionCount}/${dwellRequired}`,
    { update, counted }
  );
}

function processEvidence(sample) {
  const previous = authority;
  const result = defensibleTarget(sample);
  target = result.target;
  const newEpoch = Number.isInteger(sample.epoch) && sample.epoch > lastEpoch;
  let transition = 'hold';
  let counted = false;

  budget = result.usable
    ? Math.max(0, Math.min(1, 1 - Math.max(sample.fcoi_ucb, 1 - sample.sensor_agreement) * 1.08))
    : 0;

  if (rank(target) < rank(authority)) {
    authority = target;
    promotionCount = 0;
    transition = 'demotion';
  } else if (target === authority) {
    promotionCount = 0;
  } else if (result.usable && newEpoch) {
    promotionCount += 1;
    counted = true;
    transition = 'recovery-dwell';
    if (promotionCount >= dwellRequired) {
      authority = states[Math.min(rank(authority) + 1, rank(target))];
      promotionCount = 0;
      transition = 'promotion';
    }
  } else if (!result.usable) {
    transition = 'fail-closed';
  } else if (!newEpoch) {
    transition = 'replay-rejected';
  }

  if (result.usable && newEpoch) lastEpoch = sample.epoch;
  publish(sample, transition, counted);
  if (previous !== authority) {
    report('TRANSITION', `${previous} → ${authority}`, { previous, authority, target });
  }
}

self.onmessage = event => {
  const message = event.data || {};
  if (message.type === 'CONNECT') {
    evidencePort = message.evidencePort;
    watchdogPort = message.watchdogPort;
    anchorPort = message.anchorPort;
    evidencePort.onmessage = event2 => processEvidence(event2.data || {});
    evidencePort.start();
    watchdogPort.start();
    anchorPort.start();
    report('READY', 'Evidence input and two authority-output capabilities connected.');
    publish(null, 'initialized', false);
    return;
  }
  if (message.type === 'RESET') {
    authority = 'A3';
    target = 'A3';
    promotionCount = 0;
    dwellRequired = Math.max(2, Math.min(20, Number(message.dwell) || 3));
    lastEpoch = 0;
    budget = 0.78;
    report('RESET', `Kernel reset; promotion dwell = ${dwellRequired}.`);
    publish(null, 'reset', false);
  }
};
