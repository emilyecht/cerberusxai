/* CERBERUS browser process model — Vigil. Research demonstration only. */
'use strict';
let evidencePort = null;

const report = (kind, text, extra = {}) => {
  self.postMessage({ actor: 'vigil', kind, text, ...extra });
};

self.onmessage = event => {
  const message = event.data || {};
  if (message.type === 'CONNECT') {
    evidencePort = message.evidencePort;
    evidencePort.start();
    report('READY', 'Evidence-only capability received; no command capability exists.');
    return;
  }
  if (message.type === 'RESET') {
    report('RESET', 'Vigil evidence state reset.');
    return;
  }
  if (message.type !== 'EVIDENCE_INJECT' || !evidencePort) {
    return;
  }

  const sample = {
    type: 'EVIDENCE',
    origin: 'vigil',
    epoch: message.epoch,
    status: message.status,
    fcoi_ucb: message.fcoi,
    sensor_agreement: message.sensor,
    provenance_valid: message.provenance,
    witness_independent: message.independent,
    anchor_healthy: message.anchorHealthy !== false
  };
  evidencePort.postMessage(sample);
  report(
    'EVIDENCE',
    `epoch ${sample.epoch} · ${sample.status} · FCOI ${sample.fcoi_ucb.toFixed(2)} · sensor ${sample.sensor_agreement.toFixed(2)}`,
    { sample }
  );
};
