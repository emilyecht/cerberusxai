/* CERBERUS Flight Reference Lab — browser worker orchestration.
 * Research demonstration only. Not flight software or hardware isolation.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let workers={};
let tick=0;
let runGeneration=0;
let running=false;

const campaigns={
  collision:[
    {label:'Nominal conjunction response',e:{epoch:1,status:'fresh',fcoi:.18,sensor:.91,provenance:true,independent:true},p:{action:'bounded-mission-maneuver',magnitude:.42,rationale:'bounded conjunction response'}},
    {label:'Shared-model pressure contracts A3',e:{epoch:2,status:'fresh',fcoi:.47,sensor:.83,provenance:true,independent:true},p:{action:'bounded-mission-maneuver',magnitude:.60,rationale:'high-energy correction after overlap rise'}},
    {label:'Agreement degrades below A2',e:{epoch:3,status:'fresh',fcoi:.72,sensor:.58,provenance:true,independent:true},p:{action:'low-energy-correction',magnitude:.18,rationale:'restricted conjunction correction'}},
    {label:'Witness becomes non-estimable',e:{epoch:4,status:'unknown',fcoi:.40,sensor:.70,provenance:true,independent:false},survival:true},
    {label:'One-shot all-clear cannot restore',e:{epoch:5,status:'fresh',fcoi:.20,sensor:.90,provenance:true,independent:true},p:{action:'bounded-mission-maneuver',magnitude:.20,rationale:'one-sample recovery claim'}},
    {label:'Replayed evidence epoch is rejected',e:{epoch:5,status:'fresh',fcoi:.20,sensor:.90,provenance:true,independent:true},p:{action:'diagnostic-request',magnitude:0,rationale:'replayed recovery evidence'}},
    {label:'Fresh recovery sample two',e:{epoch:6,status:'fresh',fcoi:.19,sensor:.91,provenance:true,independent:true},survival:true},
    {label:'Dwell completes; promote one level only',e:{epoch:7,status:'fresh',fcoi:.18,sensor:.92,provenance:true,independent:true},p:{action:'diagnostic-request',magnitude:0,rationale:'bounded diagnostic after A1 restoration'}},
    {label:'Pilot attempts to assign itself A3',direct:{requestType:'ASSIGN_AUTHORITY',requestedAuthority:'A3',requestedEffect:'assign-authority'}}
  ],
  blackout:[
    {label:'Authenticated ground link nominal',e:{epoch:1,status:'fresh',fcoi:.19,sensor:.90,provenance:true,independent:true},p:{action:'low-energy-correction',magnitude:.12,rationale:'routine station-keeping'}},
    {label:'Blackout invalidates provenance path',e:{epoch:2,status:'unknown',fcoi:.36,sensor:.68,provenance:false,independent:true},p:{action:'low-energy-correction',magnitude:.10,rationale:'autonomous correction during uncertain evidence'},survival:true},
    {label:'First fresh onboard sample',e:{epoch:3,status:'fresh',fcoi:.24,sensor:.86,provenance:true,independent:true},p:{action:'low-energy-correction',magnitude:.10,rationale:'premature recovery request'}},
    {label:'Second fresh onboard sample',e:{epoch:4,status:'fresh',fcoi:.23,sensor:.87,provenance:true,independent:true},survival:true},
    {label:'Dwell completes to A1 only',e:{epoch:5,status:'fresh',fcoi:.22,sensor:.88,provenance:true,independent:true},p:{action:'diagnostic-request',magnitude:0,rationale:'post-blackout diagnostics'}},
    {label:'A1 still denies maneuver authority',p:{action:'low-energy-correction',magnitude:.08,rationale:'maneuver attempted before further restoration'}}
  ],
  gaming:[
    {label:'Initial evidence loss forces A0',e:{epoch:1,status:'unknown',fcoi:.50,sensor:.40,provenance:true,independent:false},survival:true},
    {label:'Good pulse one',e:{epoch:2,status:'fresh',fcoi:.19,sensor:.91,provenance:true,independent:true}},
    {label:'Bad pulse resets dwell',e:{epoch:3,status:'unknown',fcoi:.52,sensor:.41,provenance:true,independent:false},survival:true},
    {label:'Good pulse two',e:{epoch:4,status:'fresh',fcoi:.18,sensor:.92,provenance:true,independent:true}},
    {label:'Same epoch replay',e:{epoch:4,status:'fresh',fcoi:.18,sensor:.92,provenance:true,independent:true}},
    {label:'Another bad pulse',e:{epoch:5,status:'invalid',fcoi:.20,sensor:.90,provenance:false,independent:true},survival:true},
    {label:'Strategic layer tests the still-closed path',p:{action:'bounded-mission-maneuver',magnitude:.30,rationale:'recovery-threshold gaming attempt'}},
    {label:'Direct promotion request also fails',direct:{requestType:'ASSIGN_AUTHORITY',requestedAuthority:'A3',requestedEffect:'waive-dwell'}}
  ],
  override:[
    {label:'Healthy baseline',e:{epoch:1,status:'fresh',fcoi:.18,sensor:.92,provenance:true,independent:true}},
    {label:'Direct authority assignment attempt',direct:{requestType:'ASSIGN_AUTHORITY',requestedAuthority:'A3',requestedEffect:'assign-authority'}},
    {label:'Direct Anchor override attempt',direct:{requestType:'OVERRIDE_ANCHOR',requestedAuthority:'A3',requestedEffect:'override-anchor'}},
    {label:'Out-of-envelope irreversible action',p:{action:'irreversible-deployment',magnitude:.12,rationale:'deployment beyond deterministic envelope'}},
    {label:'Bounded A3 deployment proposal',p:{action:'irreversible-deployment',magnitude:.08,rationale:'deployment inside illustrative envelope'}},
    {label:'Evidence collapses during repeated attack',e:{epoch:2,status:'unknown',fcoi:.62,sensor:.44,provenance:false,independent:false},p:{action:'low-energy-correction',magnitude:.10,rationale:'act after evidence collapse'},survival:true}
  ]
};

function appendLog(actor,kind,text){
  const item=document.createElement('li');
  const lower=String(kind||'event').toLowerCase();
  if(lower.includes('deny')||lower.includes('error'))item.classList.add('deny');
  if(lower.includes('execute'))item.classList.add('execute');
  item.innerHTML=`<time>T+${String(tick).padStart(2,'0')}</time><b class="${actor}">${actor.toUpperCase()}</b><span><strong>${kind}</strong> · ${text}</span>`;
  $('eventLog').appendChild(item);
  $('eventLog').scrollTop=$('eventLog').scrollHeight;
}

function handleTelemetry(message){
  if(!message||!message.actor)return;
  appendLog(message.actor,message.kind||'EVENT',message.text||'');
  if(message.actor==='kernel'&&message.update){
    const u=message.update;
    $('liveAuthority').textContent=u.authority;
    $('stageAuthority').textContent=u.authority;
    $('stageTarget').textContent=u.target;
    $('liveBudget').textContent=Number(u.budget).toFixed(2);
    $('liveDwell').textContent=`${u.promotion_count} / ${u.dwell_required}`;
    $('stageDisposition').textContent=u.transition.toUpperCase();
  }
  if(message.actor==='anchor'&&Number.isInteger(message.executed)){
    $('executedCount').textContent=String(message.executed);
    if(message.kind==='EXECUTE')$('stageDisposition').textContent='EXECUTED';
    if(message.kind==='DENY')$('stageDisposition').textContent='ANCHOR DENY';
  }
  if(message.actor==='watchdog'&&message.kind==='DENY')$('stageDisposition').textContent='WATCHDOG DENY';
}

function connectWorkers(){
  if(!('Worker'in window)||!('MessageChannel'in window)){
    appendLog('system','ERROR','This browser does not expose Web Workers and MessageChannel.');
    return false;
  }
  workers={
    pilot:new Worker('workers/pilot-worker.js'),
    vigil:new Worker('workers/vigil-worker.js'),
    kernel:new Worker('workers/authority-kernel-worker.js'),
    watchdog:new Worker('workers/watchdog-worker.js'),
    anchor:new Worker('workers/anchor-worker.js')
  };
  Object.values(workers).forEach(worker=>worker.onmessage=event=>handleTelemetry(event.data));
  Object.values(workers).forEach(worker=>worker.onerror=event=>appendLog('system','WORKER ERROR',event.message||'Worker failed to initialize.'));

  const pilotWatchdog=new MessageChannel();
  const vigilKernel=new MessageChannel();
  const kernelWatchdog=new MessageChannel();
  const kernelAnchor=new MessageChannel();
  const watchdogAnchor=new MessageChannel();

  workers.pilot.postMessage({type:'CONNECT',proposalPort:pilotWatchdog.port1},[pilotWatchdog.port1]);
  workers.vigil.postMessage({type:'CONNECT',evidencePort:vigilKernel.port1},[vigilKernel.port1]);
  workers.kernel.postMessage({type:'CONNECT',evidencePort:vigilKernel.port2,watchdogPort:kernelWatchdog.port1,anchorPort:kernelAnchor.port1},[vigilKernel.port2,kernelWatchdog.port1,kernelAnchor.port1]);
  workers.watchdog.postMessage({type:'CONNECT',proposalPort:pilotWatchdog.port2,authorityPort:kernelWatchdog.port2,commandPort:watchdogAnchor.port1},[pilotWatchdog.port2,kernelWatchdog.port2,watchdogAnchor.port1]);
  workers.anchor.postMessage({type:'CONNECT',authorityPort:kernelAnchor.port2,commandPort:watchdogAnchor.port2},[kernelAnchor.port2,watchdogAnchor.port2]);
  return true;
}

function terminateWorkers(){
  Object.values(workers).forEach(worker=>worker.terminate());
  workers={};
}

function setTick(next){
  tick=next;
  workers.watchdog?.postMessage({type:'TICK',tick});
  workers.anchor?.postMessage({type:'TICK',tick});
}

async function resetWorkers(clear=true){
  runGeneration+=1;
  running=false;
  if(clear)$('eventLog').innerHTML='';
  terminateWorkers();
  setTick(0);
  $('liveAuthority').textContent='A3';
  $('stageAuthority').textContent='A3';
  $('stageTarget').textContent='A3';
  $('liveBudget').textContent='0.78';
  $('liveDwell').textContent=`0 / ${Math.max(2,Math.min(20,+$('dwell').value||3))}`;
  $('stageDisposition').textContent='READY';
  $('executedCount').textContent='0';
  if(!connectWorkers())return;
  await sleep(80);
  const dwell=Math.max(2,Math.min(20,+$('dwell').value||3));
  Object.values(workers).forEach(worker=>worker.postMessage({type:'RESET',dwell}));
  appendLog('system','TOPOLOGY','Five workers connected through five scoped MessageChannels.');
}

async function executeStep(step,index,generation){
  if(generation!==runGeneration)return;
  setTick(index+1);
  appendLog('system','INJECT',step.label);
  if(step.e){
    workers.vigil.postMessage({type:'EVIDENCE_INJECT',tick,anchorHealthy:true,...step.e});
    await sleep(180);
  }
  if(generation!==runGeneration)return;
  if(step.direct){
    workers.pilot.postMessage({type:'DIRECT_ATTEMPT',tick,...step.direct});
  }
  if(step.p){
    workers.pilot.postMessage({type:'OBSERVATION',tick,ttl:3,...step.p});
  }
  if(step.survival){
    workers.anchor.postMessage({type:'SURVIVAL_TICK',tick});
  }
  await sleep(420);
}

async function runCampaign(event){
  event?.preventDefault();
  if(running)return;
  await resetWorkers(true);
  running=true;
  const generation=runGeneration;
  const selected=campaigns[$('campaign').value]||campaigns.collision;
  appendLog('system','START',`${$('campaign').selectedOptions[0].text} · ${selected.length} stages.`);
  for(let i=0;i<selected.length;i+=1){
    if(generation!==runGeneration)break;
    await executeStep(selected[i],i,generation);
  }
  if(generation===runGeneration){
    appendLog('system','COMPLETE','Campaign finished; inspect the authority and actuator trace.');
    running=false;
  }
}

$('campaignForm').onsubmit=runCampaign;
$('resetLab').onclick=()=>resetWorkers(true);
resetWorkers(true);
})();
