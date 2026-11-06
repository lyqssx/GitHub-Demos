'use strict';
// Reduced Air 2 V2.0 Manual and Level components; original vector assets.
const QUICK_MODES=[['stimulation','刺激'],['expression','吸乳'],['mixed','混合']];
function quickState(){return state.quick||(state.quick={mode:'stimulation',left:1,right:1,status:'idle',elapsedMs:0,startedAt:null});}
function quickElapsed(q){return (q.elapsedMs||0)+(q.startedAt===null||q.startedAt===undefined?0:performance.now()-q.startedAt);}
function quickTime(q){const seconds=Math.floor(quickElapsed(q)/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function quickPause(q){q.elapsedMs=quickElapsed(q);q.startedAt=null;q.status='paused';}
function quickGlyph(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">${({plus:'<path d="M5 12h14M12 5v14"/>',minus:'<path d="M5 12h14"/>',play:'<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',pause:'<path d="M9 5v14M16 5v14" stroke-width="3"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>'})[name]}</svg>`;}
function quickDeviceStatus(){
 const label=state.connected?'已连接':state.btAuthorization==='notDetermined'?'等待授权':state.failure?'未连接':'正在连接';
 const mac=DEVICE.mac.match(/.{1,2}/g).join(':');
 return `<header class="qc-device-status" aria-label="设备连接状态"><div><span class="qc-model"><small>Model</small><strong>${DEVICE.name}</strong></span><span class="qc-connection ${state.connected?'connected':state.failure?'failed':'pending'}" role="status"><i></i>${label}</span></div><p><span>MAC</span>${mac}</p></header>`;
}
function quickControlMarkup(){
 const q=quickState(),disabled=!state.connected;
 if(disabled&&q.status==='running')quickPause(q);
 const active=q.status==='running',session=['running','paused'].includes(q.status);
 const side=(key,letter)=>`<section class="qc-step-row" aria-label="${key==='left'?'左侧':'右侧'}档位"><span class="qc-side-name">${letter}</span><div class="qc-stepper"><button data-action="qc-level-${key}-plus" aria-label="${key==='left'?'左侧':'右侧'}增加档位" ${disabled||q[key]===15?'disabled':''}>${quickGlyph('plus')}</button><output aria-live="polite" aria-label="${key==='left'?'左侧':'右侧'}当前档位">${q[key]}</output><button data-action="qc-level-${key}-minus" aria-label="${key==='left'?'左侧':'右侧'}减少档位" ${disabled||q[key]===0?'disabled':''}>${quickGlyph('minus')}</button></div></section>`;
 return `<div class="app-page clip-control-page qc-page">${quickDeviceStatus()}${state.failure?clipConnectionBanner():''}<div class="qc-content"><section class="pdcp-manual-plan"><div class="pdcp-manual-head"><img src="assets/quick-control/pdcp-manual-header.svg" alt=""><h2>手动</h2><span class="pdcp-method-time" id="qc-timer" role="timer" aria-label="吸乳计时">${quickTime(q)}</span></div><div class="pdcp-manual-tabs" role="group" aria-label="吸乳模式">${QUICK_MODES.map(([key,name])=>`<button data-action="qc-mode-${key}" aria-pressed="${q.mode===key}" ${disabled?'disabled':''}><img src="assets/quick-control/pdcp-mode-${key}.svg" alt=""><span>${name}</span></button>`).join('')}</div></section><section class="pdcp-level-card" aria-label="独立档位调节"><h2 class="pdcp-level-title"><img src="assets/quick-control/pdcp-level-gauge.svg" alt="">档位 <span>0~15</span></h2>${side('left','L')}${side('right','R')}</section></div><div class="qc-actions">${session?`<button class="v4-finish" data-action="qc-stop" ${disabled?'disabled':''}>${quickGlyph('stop')}<span>长按停止</span></button><button class="v4-pause" data-action="qc-${active?'pause':'start'}" aria-label="${active?'暂停':'继续'}" ${disabled?'disabled':''}>${quickGlyph(active?'pause':'play')}</button>`:`<button class="v4-start" data-action="qc-start" ${disabled?'disabled':''}>开始</button>`}</div>${appInstallBanner()}</div>`;
}
function quickControlAction(action){
 if(state.origin!=='clip'||!state.connected||state.dialog)return;
 const q=quickState();
 if(action==='qc-stop'&&!quickHoldConfirmed){const label=document.querySelector('[data-action="qc-stop"] span');if(label){label.textContent='按住直到进度完成';setTimeout(()=>{if(label.isConnected)label.textContent='长按停止';},1600);}return;}
 if(action.startsWith('qc-mode-')){const mode=action.slice(8);if(QUICK_MODES.some(([key])=>key===mode))q.mode=mode;}
 else if(action.startsWith('qc-level-')){const parts=action.split('-'),side=parts[2],direction=parts[3];if(['left','right'].includes(side)&&['minus','plus'].includes(direction))q[side]=Math.max(0,Math.min(15,q[side]+(direction==='plus'?1:-1)));}
 else if(action==='qc-start'&&q.status!=='running'){if(q.status!=='paused')q.elapsedMs=0;q.startedAt=performance.now();q.status='running';}
 else if(action==='qc-pause'&&q.status==='running')quickPause(q);
 else if(action==='qc-stop'&&quickHoldConfirmed&&['running','paused'].includes(q.status)){quickPause(q);q.status='stopped';render();storyCompletedUse();return;}
 render();
}
setInterval(()=>{if(typeof state==='undefined'||!state?.quick)return;const timer=document.getElementById('qc-timer');if(timer)timer.textContent=quickTime(state.quick);},250);

// Same 900ms hold duration as the source v4 finish interaction.
let quickHoldTimer=null,quickHoldButton=null,quickHoldConfirmed=false;
function cancelQuickHold(){clearTimeout(quickHoldTimer);quickHoldTimer=null;quickHoldButton?.classList.remove('qc-holding');quickHoldButton=null;}
function beginQuickHold(button){
 if(button.disabled||quickHoldTimer)return;
 quickHoldButton=button;button.classList.add('qc-holding');
 quickHoldTimer=setTimeout(()=>{const valid=button.isConnected&&!button.disabled;cancelQuickHold();if(valid){quickHoldConfirmed=true;quickControlAction('qc-stop');quickHoldConfirmed=false;}},900);
}
document.addEventListener('pointerdown',event=>{const button=event.target.closest('[data-action="qc-stop"]');if(button&&event.button===0)beginQuickHold(button);});
document.addEventListener('pointerup',cancelQuickHold);
document.addEventListener('pointercancel',cancelQuickHold);
document.addEventListener('pointerout',event=>{if(quickHoldButton&&quickHoldButton.contains(event.target)&&!quickHoldButton.contains(event.relatedTarget))cancelQuickHold();});
document.addEventListener('keydown',event=>{const button=event.target.closest('[data-action="qc-stop"]');if(button&&[' ','Enter'].includes(event.key)){event.preventDefault();if(!event.repeat)beginQuickHold(button);}});
document.addEventListener('keyup',event=>{if([' ','Enter'].includes(event.key))cancelQuickHold();});
window.addEventListener('blur',cancelQuickHold);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelQuickHold();});
