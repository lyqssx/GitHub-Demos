'use strict';
// Figma 203:10944 / 10895 / 10972 / 11002; body excludes shared OS chrome.
function fpPair(small=false){return `<div class="fp-pair ${small?'small':''}">${['Left','Right'].map((side,i)=>`<div class="fp-device"><span class="fp-crop ${i?'right':''}"><img src="assets/pairing-figma/pumps.png" alt="Air 2 ${side}"></span></div>`).join('')}</div>`;}
function figmaPairingMarkup(view){
 const title=view==='guide'||view==='discovered'?'Connect to Device':'Connecting';
 const header=`<header class="fp-nav"><button data-action="fp-back" aria-label="返回配网"><img src="assets/pairing-figma/back.svg" alt=""></button><h1>${title}</h1></header>`;
 let body='';
 if(view==='guide')body=`<main class="fp-guide"><div class="fp-guide-hero">${fpPair()}</div><p>Please follow these steps</p><div class="fp-step"><b>1</b><span>Press and hold the power button for 2 seconds to turn on the device to be paired.</span></div><div class="fp-step"><b>2</b><span>Keep them close to your phone.</span></div></main><div class="fp-scanning" role="status"><img src="assets/pairing-figma/scanning.svg" alt=""><p>Scanning...</p></div>`;
 if(view==='discovered')body=`<main class="fp-found"><p>New Device Connectable</p><div class="fp-found-grid"><button class="fp-device-card" data-action="fp-select" aria-pressed="true" aria-label="选择 Air 2">${fpPair(true)}<span>Air 2</span></button></div></main><footer class="fp-footer"><button class="fp-primary rose" data-action="start-connection">Connect</button></footer>`;
 if(view==='connecting')body=`<div class="fp-radar"><img src="assets/pairing-figma/ring-outer.svg" alt=""><img src="assets/pairing-figma/ring-inner.svg" alt=""></div><div class="fp-device-stage">${fpPair()}</div><div class="fp-result"><div class="fp-percent"><img src="assets/pairing-figma/phone.svg" alt=""><span>${[33,66,99][state.stage]||33}%</span></div><p>Connecting to the mobile phone.<br>Keep closer to it.</p></div>`;
 if(view==='success')body=`<div class="fp-device-stage">${fpPair()}</div><div class="fp-result success"><h2>Air 2</h2><div><span>Connect Successfully</span><img src="assets/pairing-figma/success.svg" alt="连接成功"></div></div><footer class="fp-footer"><button class="fp-primary" data-action="enter-control">Done</button></footer>`;
 return `<div class="figma-pair-host" data-fp-view="${view}"><div class="fp-canvas">${header}${body}</div></div>`;
}
function mountFigmaPairing(){const host=document.querySelector('.figma-pair-host');if(!host)return;const fit=()=>{const scale=host.clientWidth/375;host.style.setProperty('--fp-scale',scale);host.style.setProperty('--fp-height',host.clientHeight/scale+'px');};fit();if(!host.dataset.observed){host.dataset.observed='1';const ro=new ResizeObserver(()=>{if(host.isConnected)fit();else ro.disconnect();});ro.observe(host);}}
document.addEventListener('click',event=>{const action=event.target.closest('button')?.dataset.action;if(action==='fp-back'){if(state.page==='guide')runAction('exit');else go('guide',{connected:false,failure:'',guideScanTime:0});}});
// Simulated discovery pauses together with the review controls and exit dialogs.
let fpLast=performance.now();
setInterval(()=>{const now=performance.now(),dt=Math.min(300,now-fpLast);fpLast=now;if(typeof state==='undefined'||state.page!=='guide'||state.dialog||paused||document.hidden)return;if(state.failure)return;state.guideScanTime=(state.guideScanTime||0)+dt;if(state.guideScanTime>=2800)go('discovered',{guideScanTime:0});},150);
