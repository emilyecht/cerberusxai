/* CERBERUS browser process model — Pilot. Research demonstration only. */
'use strict';
let proposalPort = null;
let sequence = 0;

const report = (kind, text, extra = {}) => {
  self.postMessage({ actor: 'pilot', kind, text, ...extra });
};

self.onmessage = event => {
  const message = event.data || {};
  if (message.type === 'CONNECT') {
    proposalPort = message.proposalPort;
    proposalPort.start();
    report('READY', 'Proposal capability received; no Anchor capability exists.');
    return;
  }
  if (message.type === 'RESET') {
    sequence = 0;
    report('RESET', 'Pilot state reset.');
    return;
  }
  if (!proposalPort) {
    report('ERROR', 'Pilot cannot emit: proposal port is absent.');
    return;
  }
  if (message.type === 'OBSERVATION') {
    sequence += 1;
    const proposal = {
      type: 'PROPOSAL',
      proposal_id: `P-${String(sequence).padStart(4, '0')}`,
      origin: 'pilot',
      sequence,
      created_at_tick: message.tick,
      expires_at_tick: message.tick + (message.ttl ?? 3),
      action: message.action,
      magnitude: message.magnitude,
      rationale: message.rationale || 'adaptive mission proposal'
    };
    proposalPort.postMessage(proposal);
    report('PROPOSAL', `${proposal.proposal_id} → ${proposal.action} (${proposal.magnitude.toFixed(2)})`, { proposal });
    return;
  }
  if (message.type === 'DIRECT_ATTEMPT') {
    sequence += 1;
    const attempt = {
      type: message.requestType,
      origin: 'pilot',
      sequence,
      requested_authority: message.requestedAuthority || 'A3',
      requested_effect: message.requestedEffect || 'override-anchor',
      created_at_tick: message.tick
    };
    proposalPort.postMessage(attempt);
    report('BYPASS_ATTEMPT', `${attempt.type} sent on the only capability Pilot owns.`, { attempt });
  }
};
