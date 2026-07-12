/* CERBERUS browser process model — Watchdog. Research demonstration only. */
'use strict';
let proposalPort = null;
let authorityPort = null;
let commandPort = null;
let authority = 'A3';
let currentTick = 0;
let lastProposalSequence = 0;
let commandSequence = 0;

const report = (kind, text, extra = {}) => {
  self.postMessage({ actor: 'watchdog', kind, text, ...extra });
};
const rank = state => ({ A0: 0, A1: 1, A2: 2, A3: 3 })[state] ?? -1;

function requiredAuthority(action) {
  if (action === 'diagnostic-request') return 'A1';
  if (action === 'low-energy-correction') return 'A2';
  if (action === 'bounded-mission-maneuver' || action === 'irreversible-deployment') return 'A3';
  return null;
}

function magnitudeLimit(action) {
  if (action === 'diagnostic-request') return 0;
  if (action === 'low-energy-correction') return 0.25;
  if (action === 'bounded-mission-maneuver') return 0.75;
  if (action === 'irreversible-deployment') return 0.10;
  return -1;
}

function reject(reason, message) {
  report('DENY', `${reason}${message?.proposal_id ? ` · ${message.proposal_id}` : ''}`, { reason, message });
}

function evaluate(message) {
  if (!message || message.type !== 'PROPOSAL') {
    reject('Non-proposal or non-delegable request rejected at Pilot boundary', message);
    return;
  }
  if (message.origin !== 'pilot') {
    reject('Proposal origin is not Pilot', message);
    return;
  }
  if (!Number.isInteger(message.sequence) || message.sequence <= lastProposalSequence) {
    reject('Proposal sequence is stale or replayed', message);
    return;
  }
  lastProposalSequence = message.sequence;
  if (!Number.isInteger(message.expires_at_tick) || currentTick > message.expires_at_tick) {
    reject('Proposal expired before Watchdog evaluation', message);
    return;
  }
  const required = requiredAuthority(message.action);
  if (!required) {
    reject('Action is outside the declared proposal vocabulary', message);
    return;
  }
  if (rank(authority) < rank(required)) {
    reject(`${message.action} requires ${required}; current authority is ${authority}`, message);
    return;
  }
  if (!Number.isFinite(message.magnitude) || message.magnitude < 0 || message.magnitude > magnitudeLimit(message.action)) {
    reject(`Deterministic magnitude envelope failed for ${message.action}`, message);
    return;
  }

  commandSequence += 1;
  const command = {
    type: 'APPROVED_COMMAND',
    origin: 'watchdog',
    capability: 'CERBERUS_WATCHDOG_V1',
    command_sequence: commandSequence,
    proposal_id: message.proposal_id,
    proposal_sequence: message.sequence,
    authority,
    action: message.action,
    magnitude: message.magnitude,
    expires_at_tick: message.expires_at_tick
  };
  commandPort.postMessage(command);
  report('APPROVE', `${message.proposal_id} admitted to Anchor under ${authority}.`, { command });
}

self.onmessage = event => {
  const message = event.data || {};
  if (message.type === 'CONNECT') {
    proposalPort = message.proposalPort;
    authorityPort = message.authorityPort;
    commandPort = message.commandPort;
    proposalPort.onmessage = event2 => evaluate(event2.data || {});
    authorityPort.onmessage = event2 => {
      const update = event2.data || {};
      if (update.type === 'AUTHORITY_UPDATE' && update.origin === 'authority-kernel') {
        authority = update.authority;
        report('AUTHORITY', `Watchdog envelope set to ${authority}.`, { update });
      }
    };
    proposalPort.start();
    authorityPort.start();
    commandPort.start();
    report('READY', 'Proposal, authority, and Anchor-command capabilities connected.');
    return;
  }
  if (message.type === 'TICK') {
    currentTick = message.tick;
    return;
  }
  if (message.type === 'RESET') {
    authority = 'A3';
    currentTick = 0;
    lastProposalSequence = 0;
    commandSequence = 0;
    report('RESET', 'Watchdog state and replay counters reset.');
  }
};
