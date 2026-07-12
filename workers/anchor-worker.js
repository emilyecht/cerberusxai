/* CERBERUS browser process model — Anchor. Research demonstration only. */
'use strict';
let authorityPort = null;
let commandPort = null;
let authority = 'A3';
let currentTick = 0;
let lastCommandSequence = 0;
let executed = 0;

const report = (kind, text, extra = {}) => {
  self.postMessage({ actor: 'anchor', kind, text, executed, ...extra });
};
const rank = state => ({ A0: 0, A1: 1, A2: 2, A3: 3 })[state] ?? -1;

function requiredAuthority(action) {
  if (action === 'diagnostic-request') return 'A1';
  if (action === 'low-energy-correction') return 'A2';
  if (action === 'bounded-mission-maneuver' || action === 'irreversible-deployment') return 'A3';
  return null;
}

function localLimit(action) {
  if (action === 'diagnostic-request') return 0;
  if (action === 'low-energy-correction') return 0.25;
  if (action === 'bounded-mission-maneuver') return 0.75;
  if (action === 'irreversible-deployment') return 0.10;
  return -1;
}

function reject(reason, command) {
  report('DENY', `Anchor rejected command: ${reason}`, { reason, command });
}

function evaluate(command) {
  if (!command || command.type !== 'APPROVED_COMMAND') {
    reject('unsupported command type', command);
    return;
  }
  if (command.origin !== 'watchdog' || command.capability !== 'CERBERUS_WATCHDOG_V1') {
    reject('Watchdog capability absent or invalid', command);
    return;
  }
  if (!Number.isInteger(command.command_sequence) || command.command_sequence <= lastCommandSequence) {
    reject('command sequence stale or replayed', command);
    return;
  }
  lastCommandSequence = command.command_sequence;
  if (command.authority !== authority) {
    reject(`claimed authority ${command.authority} does not match Anchor state ${authority}`, command);
    return;
  }
  if (!Number.isInteger(command.expires_at_tick) || currentTick > command.expires_at_tick) {
    reject('command expired before actuation', command);
    return;
  }
  const required = requiredAuthority(command.action);
  if (!required || rank(authority) < rank(required)) {
    reject(`${command.action} is outside ${authority}`, command);
    return;
  }
  const limit = localLimit(command.action);
  if (!Number.isFinite(command.magnitude) || command.magnitude < 0 || command.magnitude > limit) {
    reject('Anchor-local magnitude invariant failed', command);
    return;
  }

  executed += 1;
  report('EXECUTE', `${command.action} executed from ${command.proposal_id}; survival invariants remain armed.`, { command });
}

self.onmessage = event => {
  const message = event.data || {};
  if (message.type === 'CONNECT') {
    authorityPort = message.authorityPort;
    commandPort = message.commandPort;
    authorityPort.onmessage = event2 => {
      const update = event2.data || {};
      if (update.type === 'AUTHORITY_UPDATE' && update.origin === 'authority-kernel') {
        authority = update.authority;
        report('AUTHORITY', `Anchor local authority set to ${authority}.`, { update });
      }
    };
    commandPort.onmessage = event2 => evaluate(event2.data || {});
    authorityPort.start();
    commandPort.start();
    report('READY', 'Authority and Watchdog-command capabilities connected; actuator surface owned locally.');
    return;
  }
  if (message.type === 'TICK') {
    currentTick = message.tick;
    return;
  }
  if (message.type === 'SURVIVAL_TICK') {
    const mode = authority === 'A0' ? 'ACTIVE' : 'ARMED';
    report('SURVIVAL', `${mode}: attitude, thermal, beacon, and bounded isolation invariants checked.`, { mode });
    return;
  }
  if (message.type === 'RESET') {
    authority = 'A3';
    currentTick = 0;
    lastCommandSequence = 0;
    executed = 0;
    report('RESET', 'Anchor state and command replay counter reset.');
  }
};
