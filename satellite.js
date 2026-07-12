(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const missions = {
    collision: {
      title: 'Autonomous collision avoidance',
      strap: 'Conjunction response without surrendering actuator authority',
      proposal: 'Pilot proposes a time-bounded avoidance maneuver from onboard conjunction estimates.',
      watchdog: 'Watchdog checks keep-out geometry, delta-v, attitude, power, and post-burn recovery envelopes.',
      anchor: 'Power-positive attitude · thermal survival · beaconing · bounded orientation',
      decision: 'Avoidance proposal'
    },
    deployment: {
      title: 'Deployment sequencing',
      strap: 'Adaptive release planning inside deterministic separation rules',
      proposal: 'Pilot proposes release order and timing to optimize coverage and vehicle constraints.',
      watchdog: 'Watchdog enforces separation time, attitude corridor, power reserve, and one-release-at-a-time rules.',
      anchor: 'Deployment inhibit · power-positive attitude · thermal survival · authenticated command posture',
      decision: 'Deployment sequence'
    },
    recovery: {
      title: 'Fault recovery during communications loss',
      strap: 'Onboard recovery while ground authority is unavailable',
      proposal: 'Pilot diagnoses a fault and proposes isolation, reconfiguration, and mission continuation.',
      watchdog: 'Watchdog constrains isolation boundaries and rejects recovery actions outside the declared blackout envelope.',
      anchor: 'Attitude · power · thermal limits · beaconing · safe communications posture',
      decision: 'Recovery proposal'
    }
  };

  let activeMission = 'collision';

  function authorityFromBudget(budget, mission) {
    let state = budget < 0.18 ? 'A0' : budget < 0.42 ? 'A1' : budget < 0.70 ? 'A2' : 'A3';
    if (mission === 'recovery' && state === 'A3') state = 'A2';
    return state;
  }

  function setLayer(layer, className, status) {
    const element = document.querySelector(`[data-sat-layer="${layer}"]`);
    if (!element) return;
    element.className = className;
    element.querySelector('i').textContent = status;
  }

  function selectMission(name) {
    activeMission = name;
    document.querySelectorAll('[data-mission]').forEach((button) => {
      button.classList.toggle('on', button.dataset.mission === name);
      button.setAttribute('aria-selected', button.dataset.mission === name ? 'true' : 'false');
    });
    const mission = missions[name];
    $('satCaseTitle').textContent = mission.title;
    $('satCaseStrap').textContent = mission.strap;
    $('satProposal').textContent = mission.proposal;
    $('satWatchdogRule').textContent = mission.watchdog;
    $('satAnchorSet').textContent = mission.anchor;
    runSatellite();
  }

  function runSatellite(event) {
    if (event) event.preventDefault();

    const mission = missions[activeMission];
    const fcoi = Number($('satFcoi').value);
    const agreement = Number($('satAgreement').value);
    const dwell = Number($('satDwell').value);
    const provenance = $('satProvenance').checked;
    const invariants = $('satInvariants').checked;
    const independent = $('satIndependent').checked;

    const overlapBudget = independent ? clamp((0.86 - fcoi) / (0.86 - 0.18), 0, 1) : 0;
    const sensorBudget = agreement >= 0.45 ? clamp((agreement - 0.45) / 0.45, 0, 1) : 0;
    const provenanceBudget = provenance ? 1 : 0;
    const invariantBudget = invariants ? 1 : 0;
    const budget = Math.min(overlapBudget, sensorBudget, provenanceBudget, invariantBudget);
    const authority = authorityFromBudget(budget, activeMission);
    const permission = authority === 'A3' || authority === 'A2';
    const anchorActive = authority === 'A0';
    const evidenceFresh = independent && agreement >= 0.62 && provenance && invariants && fcoi <= 0.52;

    let actuation = 'BLOCKED';
    if (permission && activeMission === 'collision') actuation = authority === 'A3' ? 'ENVELOPE CHECK' : 'RESTRICTED CHECK';
    if (permission && activeMission === 'deployment') actuation = authority === 'A3' ? 'SEQUENCE CHECK' : 'ONE-AT-A-TIME';
    if (permission && activeMission === 'recovery') actuation = 'BLACKOUT ENVELOPE';
    if (authority === 'A1') actuation = 'ADVISORY ONLY';
    if (authority === 'A0') actuation = 'REVOKED';

    $('satAuthority').textContent = authority;
    $('satBudget').textContent = budget.toFixed(2);
    $('satActuation').textContent = actuation;
    $('satRecovery').textContent = evidenceFresh ? `${dwell} FRESH SAMPLES` : 'NOT ELIGIBLE';
    $('satDisposition').textContent = anchorActive
      ? 'ANCHOR SURVIVAL MODE'
      : authority === 'A1'
        ? 'STRATEGIC LAYER ADVISORY-ONLY'
        : 'PROPOSAL PATH CONSTRAINED';
    $('satDisposition').className = `satDisposition ${anchorActive ? 'anchorMode' : permission ? 'constrained' : 'advisory'}`;

    $('satMonFcoi').textContent = fcoi.toFixed(2);
    $('satMonAgreement').textContent = agreement.toFixed(2);
    $('satMonProvenance').textContent = provenance ? 'AUTHENTIC' : 'FAILED';
    $('satMonInvariants').textContent = invariants ? 'HEALTHY' : 'BREACH';

    const events = [
      { t: '00:00', k: 'safe', g: 'PILOT', m: mission.proposal },
      { t: '00:04', k: independent ? 'safe' : 'warn', g: 'FCOI', m: independent ? `Independent evidence estimates overlap pressure at ${fcoi.toFixed(2)}.` : 'Independence cannot be established; unknown evidence creates no permission.' },
      { t: '00:06', k: agreement >= 0.62 ? 'safe' : 'warn', g: 'SENSORS', m: agreement >= 0.62 ? `Independent channels agree at ${agreement.toFixed(2)} within the declared case model.` : 'Sensor agreement is insufficient for mission-critical promotion.' },
      { t: '00:08', k: provenance ? 'safe' : 'warn', g: 'PROVENANCE', m: provenance ? 'Command origin and authorization chain authenticate.' : 'Command provenance fails authentication; strategic authority is revoked.' },
      { t: '00:10', k: invariants ? 'safe' : 'warn', g: 'INVARIANTS', m: invariants ? mission.watchdog : 'A safety invariant witness reports a breach or becomes unavailable.' }
    ];

    if (permission) {
      events.push({
        t: '00:12',
        k: 'safe',
        g: 'WATCHDOG',
        m: authority === 'A3'
          ? `${mission.decision} enters the deterministic gate; the Pilot still has no direct actuator path.`
          : `${mission.decision} is limited to the A2 restricted envelope before any actuation.`
      });
    } else if (authority === 'A1') {
      events.push({ t: '00:12', k: 'warn', g: 'A1', m: 'Pilot output is retained for diagnosis but cannot command mission-critical actuation.' });
    } else {
      events.push({ t: '00:12', k: 'anchor', g: 'A0', m: `Authority contracts immediately. Anchor preserves ${mission.anchor.toLowerCase()}.` });
    }

    if (activeMission === 'recovery') {
      events.push({ t: '00:14', k: 'anchor', g: 'LINK', m: 'Loss of ground contact caps authority at A2 even when onboard evidence remains healthy.' });
    }

    events.push(evidenceFresh
      ? { t: '00:18', k: 'safe', g: 'RECOVERY', m: `Promotion remains sequential and requires ${dwell} consecutive fresh evidence samples; no one-shot all-clear is accepted.` }
      : { t: '00:18', k: 'anchor', g: 'RECOVERY', m: 'Restoration is not eligible. The system remains at or below its current authority until independent evidence is re-established.' });

    $('satLog').innerHTML = events.map((item) => `
      <li class="${item.k}"><time>${item.t}</time><b>${item.g}</b><span>${item.m}</span></li>
    `).join('');

    setLayer('pilot', authority === 'A0' ? 'blocked' : authority === 'A1' ? 'limited' : 'active', authority === 'A0' ? 'REVOKED' : authority === 'A1' ? 'ADVISORY' : 'PROPOSES');
    setLayer('vigil', independent ? (evidenceFresh ? 'active' : 'limited') : 'bad', independent ? (evidenceFresh ? 'FRESH' : 'CONTRACT') : 'UNKNOWN');
    setLayer('watchdog', invariants ? 'active' : 'bad', invariants ? 'GATE' : 'HOLD');
    setLayer('anchor', anchorActive ? 'safe' : 'standby', anchorActive ? 'ACTIVE' : 'STANDBY');
  }

  document.querySelectorAll('[data-mission]').forEach((button) => {
    button.addEventListener('click', () => selectMission(button.dataset.mission));
  });

  $('satForm').addEventListener('submit', runSatellite);
  [['satFcoi', 'satFcoiOut'], ['satAgreement', 'satAgreementOut']].forEach(([input, output]) => {
    $(input).addEventListener('input', (event) => {
      $(output).textContent = Number(event.target.value).toFixed(2);
    });
  });

  selectMission('collision');
})();
