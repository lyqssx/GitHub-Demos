'use strict';

// All device, account and install states are local demonstration data.
// No hardware, credentials, App Store, or external binding APIs are called.
const $ = id => document.getElementById(id);
const DEVICE = {name:'Air2', brand:'Momcozy', productName:'智能吸奶器Air2', cardTitle:'智能吸奶器Air2', mac:'DAC610001909', suffix:'1909', image:'assets/device.svg'};

// Self-contained card assets avoid blank hero/brand regions after a failed image request.
const CLIP_CARD_IMAGE = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22900%22%20height%3D%22600%22%20viewBox%3D%220%200%20900%20600%22%20fill%3D%22none%22%3E%0A%20%20%3Ctitle%3E%E6%89%8B%E6%9C%BA%E8%BF%9E%E6%8E%A5%20Momcozy%20Air2%20%E6%99%BA%E8%83%BD%E5%90%B8%E5%A5%B6%E5%99%A8%3C%2Ftitle%3E%0A%20%20%3Crect%20width%3D%22900%22%20height%3D%22600%22%20fill%3D%22%23EDF2F5%22%2F%3E%0A%20%20%3Cellipse%20cx%3D%22292%22%20cy%3D%22497%22%20rx%3D%22103%22%20ry%3D%2212%22%20fill%3D%22%23DCE3E8%22%2F%3E%0A%20%20%3Cellipse%20cx%3D%22650%22%20cy%3D%22497%22%20rx%3D%22132%22%20ry%3D%2212%22%20fill%3D%22%23DCE3E8%22%2F%3E%0A%20%20%3Cg%20stroke%3D%22%23657782%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%0A%20%20%20%20%3Crect%20x%3D%22191%22%20y%3D%2297%22%20width%3D%22202%22%20height%3D%22394%22%20rx%3D%2238%22%20fill%3D%22%23FCFDFE%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%22206%22%20y%3D%22112%22%20width%3D%22172%22%20height%3D%22364%22%20rx%3D%2226%22%20fill%3D%22%23E1EBF0%22%20stroke%3D%22%23A8B8C2%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%22263%22%20y%3D%22123%22%20width%3D%2258%22%20height%3D%2212%22%20rx%3D%226%22%20fill%3D%22%23657782%22%20stroke%3D%22none%22%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M272%20456h40%22%20stroke%3D%22%2391A3AF%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%3C%2Fg%3E%0A%20%20%3Cg%20transform%3D%22translate%28292%20289%29%22%20stroke%3D%22%23A47B87%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%3E%0A%20%20%20%20%3Cpath%20d%3D%22M-10-28c15%2015%2015%2041%200%2056M8-42c23%2023%2023%2061%200%2084%22%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M-29-13c7%207%207%2019%200%2026%22%2F%3E%0A%20%20%3C%2Fg%3E%0A%20%20%3Cg%20stroke%3D%22%2391A9B9%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%3E%0A%20%20%20%20%3Cpath%20d%3D%22M445%20270c10%2017%2010%2043%200%2060%22%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M464%20254c17%2026%2017%2066%200%2092%22%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M483%20238c24%2036%2024%2088%200%20124%22%2F%3E%0A%20%20%3C%2Fg%3E%0A%20%20%3Cg%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%0A%20%20%20%20%3Cpath%20d%3D%22M526%20355c-4%2088%2040%20137%20124%20137s128-49%20124-137%22%20fill%3D%22%23FAFCFD%22%20stroke%3D%22%23A9B8C2%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M545%20373c4%2058%2040%2096%20105%2096s101-38%20105-96%22%20stroke%3D%22%23CBD6DD%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M650%20165c-63%200-117%2065-124%20157-7%2080%2042%20111%20124%20111s131-31%20124-111c-7-92-61-157-124-157Z%22%20fill%3D%22%23E2BFC7%22%20stroke%3D%22%23A8818D%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M553%20281c16-54%2051-92%2088-98%22%20stroke%3D%22%23F4DFE4%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%3Cellipse%20cx%3D%22650%22%20cy%3D%22219%22%20rx%3D%2247%22%20ry%3D%2224%22%20fill%3D%22%23EBD0D6%22%20stroke%3D%22%23FAEBEE%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%3Cg%20stroke%3D%22%23FFF4F6%22%20stroke-width%3D%223%22%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M625%20210h12m-12%209h12m-12%209h12m-14-16v5m16-5v5m-16%204v5m16-5v5M647%20210h12m-12%209h12m-12%209h12m-14-16v5m16-5v5m-16%204v5m16-5v5%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M675%20216v6m-3-3h6%22%2F%3E%0A%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%3Cellipse%20cx%3D%22615%22%20cy%3D%22178%22%20rx%3D%2210%22%20ry%3D%225%22%20fill%3D%22%23F0D7DD%22%20stroke%3D%22%23B997A2%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%3Cellipse%20cx%3D%22685%22%20cy%3D%22178%22%20rx%3D%2210%22%20ry%3D%225%22%20fill%3D%22%23F0D7DD%22%20stroke%3D%22%23B997A2%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M645%20164h10%22%20stroke%3D%22%23FAEBEE%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%22650%22%20y%3D%22389%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2223%22%20letter-spacing%3D%221%22%20fill%3D%22%23FFF2F5%22%3Emomcozy%3C%2Ftext%3E%0A%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E%0A';
const CLIP_BRAND_IMAGE = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%2080%22%3E%3Crect%20width%3D%2280%22%20height%3D%2280%22%20rx%3D%2220%22%20fill%3D%22%23800e32%22%2F%3E%3Ctext%20x%3D%2240%22%20y%3D%2257%22%20text-anchor%3D%22middle%22%20font-family%3D%22Georgia%2Cserif%22%20font-style%3D%22italic%22%20font-size%3D%2262%22%20fill%3D%22white%22%3Em%3C%2Ftext%3E%3C%2Fsvg%3E%0A';
const ACCOUNT = '体验账号';
let timer;
let installTimer;
let clipNoticeTimer;
let paused = false;
let platform = 'ios';
let state;
const platformSnapshots={};
const iosScopeMarkup=document.querySelector('.scope-note p').innerHTML;
const iosTechnicalMarkup=document.querySelector('.technical-note p').innerHTML;
const iosSourcesMarkup=document.querySelector('.entry-sources').innerHTML;
const icons = {
  back:'<path d="m14 5-7 7 7 7"/>',
  headset:'<path d="M4 13v-2a8 8 0 0 1 16 0v2M4 12H3v6h4v-6H4Zm16 0h1v6h-4v-6h3ZM20 18v1a3 3 0 0 1-3 3h-4"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  nfc:'<path d="M8 6c4 3 4 9 0 12M12 3c7 5 7 13 0 18M4 9c2 1.5 2 4.5 0 6"/>',
  clip:'<rect x="4" y="4" width="16" height="16" rx="5" stroke-dasharray="2 3"/><path d="m11 7-3 5h5l-2 5 6-7h-5l1-3"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.nfc}</svg>`;
const button = (label,action,secondary=false) => `<button class="${secondary?'secondary':'primary'}" data-action="${action}">${label}</button>`;
const nav = (title,back='exit',badge='') => `<div class="navbar">${back?`<button class="icon-button" data-action="${back}" aria-label="返回">${icon('back')}</button>`:''}<strong>${title}</strong>${badge?`<span class="nav-badge">${badge}</span>`:''}</div>`;
const device = (note='来自本次 NFC 触碰') => `<div class="device-mini"><img src="${DEVICE.image}" alt="通用设备示意"><div><strong>${DEVICE.name}</strong><span>${note} · 尾号 ${DEVICE.suffix}</span></div></div>`;

function reset(scenario=platform==='android'?'download':'clip') {
  const androidPreferences=platform==='android'?{androidVersion:state?.androidVersion||16,region:state?.region||'global'}:null;
  clearTimeout(timer);clearTimeout(installTimer);clearTimeout(clipNoticeTimer);clipNoticeTimer=null;
  state={legacyOpenRequested:false,scenario,page:'home',origin:scenario==='clip'?'clip':'nfc',installed:!['clip','download'].includes(scenario),logged:['signed','signed-bound'].includes(scenario),targetBound:scenario.endsWith('-bound'),bindingChecked:false,nfcDestination:'',flowComplete:false,clipSuccessVisible:false,target:false,connected:false,bound:false,stage:0,installProgress:0,installStatus:'idle',failure:'',outcome:'success',dialog:null,guideTimeout:false,loginError:false,installDone:false,reconnecting:false,clipUsed:false,settingsRequested:false,btAuthorization:'notDetermined',parameterFallback:'',appManualSelection:false};
  if(platform==='android')Object.assign(state,{...androidPreferences,browserFallback:false,fromMarket:false});
  render();
}
function go(page,extra={}) {
  if(state?.quick?.status==='running'&&!['control','store'].includes(page))quickPause(state.quick);
  clearTimeout(timer);
  if(page==='guide'){state.guideToken=(state.guideToken||0)+1;state.guideStatus='';}
  Object.assign(state,extra,{page});render();schedule();
}
function isClipConnecting(){return state.origin==='clip'&&state.btAuthorization==='allowedAlways'&&['control','store'].includes(state.page)&&!state.connected&&!state.failure;}
function isWorking(){return !state.dialog&&(isClipConnecting()||state.page==='connecting');}
function schedule(){clearTimeout(timer);if(paused||!isWorking())return;timer=setTimeout(advance,isClipConnecting()?2200:1800);}
function advance(){
  if(!isWorking())return;
  if(isClipConnecting()){
    if(state.outcome==='not-found'){go('control',{failure:'connection',connected:false});return;}
    if(state.stage<2){state.stage++;render();schedule();return;}
    if(state.outcome==='connection-fail'){go('control',{failure:'connection',connected:false});return;}
    state.connected=true;state.clipUsed=true;state.clipSuccessVisible=true;state.failure='';render();schedule();
  }else if(state.page==='connecting'){
    if(state.outcome==='not-found'){go('guide',{failure:'not-found',connected:false});return;}
    if(state.stage<2){state.stage++;render();schedule();return;}
    if(state.outcome==='connection-fail'){go('failure',{failure:'connection',connected:false});return;}
    state.connected=true;state.bound=true;state.targetBound=true;state.bindingChecked=true;go('success');
  }
}
function scheduleClipNotice(){
 if(state.origin!=='clip'||!['control','store'].includes(state.page)||!state.connected||!state.clipSuccessVisible){
   clearTimeout(clipNoticeTimer);clipNoticeTimer=null;state.clipSuccessVisible=false;return;
 }
 if(clipNoticeTimer)return;
 clipNoticeTimer=setTimeout(()=>{clipNoticeTimer=null;state.clipSuccessVisible=false;render();},1500);
}
function scheduleInstallation(){
 clearTimeout(installTimer);
 if(platform!=='ios'||paused||state.dialog||state.origin!=='clip'||!['control','store','clip-fallback'].includes(state.page)||state.installStatus!=='downloading')return;
 installTimer=setTimeout(advanceInstallation,650);
}
function advanceInstallation(){
 if(state.installStatus!=='downloading')return;
 state.installProgress=Math.min(100,state.installProgress+25);
 if(state.installProgress===100){state.installed=true;state.installDone=true;state.installStatus='installed';}
 render();
}
function startInstallation(){
 go(state.page==='clip-fallback'?'clip-fallback':'store',{installStatus:'downloading',installProgress:0,installDone:false});
}

function touch(){
  if(platform==='android'){androidTouch();return;}
  clearTimeout(timer);Object.assign(state,{legacyOpenRequested:false,dialog:null,target:true,outcome:'success',failure:'',connected:false,bound:false,bindingChecked:false,nfcDestination:'',flowComplete:false,clipSuccessVisible:false,reconnecting:false,parameterFallback:'',appManualSelection:false});
  if(state.installed){if(state.scenario!=='legacy')state.scenario=(state.logged?'signed':'unsigned')+(state.targetBound?'-bound':'');state.origin='nfc';go('notification');}
  else{state.origin='clip';state.quick=null;go('clip-card');}
}
function startConnection(){
  if(state.origin==='clip'&&state.parameterFallback){go('clip-fallback',{connected:false,dialog:null});return;}
  if(state.origin!=='clip'&&!state.logged){go('login');return;}
  if(state.origin==='clip'&&state.btAuthorization!=='allowedAlways'){
    go('control',{stage:0,connected:false,clipSuccessVisible:false,failure:state.btAuthorization==='notDetermined'?'':'bluetooth',dialog:state.btAuthorization==='notDetermined'?'clip-bluetooth-request':null});return;
  }
  go(state.origin==='clip'?'control':'connecting',{stage:0,connected:false,clipSuccessVisible:false,dialog:null,outcome:'success',failure:'',guideTimeout:false});
}
function routeNfcTarget(){
 if(state.scenario==='legacy'){go('legacy-web',{legacyOpenRequested:false});return;}
 if(!state.logged){go('login');return;}
 if(state.parameterFallback){
  Object.assign(state,{target:false,targetBound:false,bound:false,bindingChecked:false});
  if(state.parameterFallback==='mac'){state.nfcDestination='guide';beginSetup();}
  else go('normal-entry',{nfcDestination:'home',flowComplete:true});
  return;
 }
 state.bindingChecked=true;state.bound=state.targetBound;
 if(state.bound){go('control',{nfcDestination:'control',connected:false,stage:0,dialog:null,failure:''});}
 else{state.nfcDestination='guide';beginSetup();}
}
function beginSetup(){if(!state.logged){go('login');return;}go('guide',{target:!state.parameterFallback,connected:false,bound:false,dialog:null,failure:'',guideTimeout:false});}
function openFullApp(){
  if(state.parameterFallback){
    go('login',{origin:'app',installed:true,installDone:true,logged:false,appManualSelection:true,target:false,targetBound:false,bindingChecked:false,nfcDestination:'',connected:false,bound:false,failure:'',dialog:null});return;
  }
  // Formal App uses its own pairing flow; Air2 is the demo preset, not an imported Clip session.
  Object.assign(state,{origin:'app',installed:true,installDone:true,target:false,targetBound:false,bindingChecked:false,nfcDestination:'',connected:false,bound:false,failure:'',dialog:null,reconnecting:false});
  if(state.logged)beginSetup();else go('login');
}
function login(){
 const account=$('account'),password=$('password');
 if(!account?.value.trim()||!password?.value.trim())return;
 state.logged=true;state.loginError=false;
 if(state.appManualSelection||platform==='android'&&state.fromMarket){go('normal-entry',{flowComplete:true});return;}
 if(state.origin==='nfc')routeNfcTarget();else beginSetup();
}
const flows={
 legacy:[['notification','系统 NFC 通知','网页承接方案 · 路由前提待验证','新增'],['legacy-web','已有下载落地页','复用原页面 · 条件路径','复用']],
 clip:[['clip-card','App Clip 卡片','未安装 App · 点击打开 Clip','新增'],['control','Clip 快控与连接','顶部轻提示 · 自动扫描连接','新增'],['store','下载正式 App','系统横幅内获取 · 不离开快控','新增'],['login','正式 App · 注册／登录','重新进入正式 App 流程','复用'],['guide','正式 App · 配网指引','复用配网专项原有内容','复用'],['connecting','正式 App · 完整配网','复用原完整配网流程','复用'],['success','配网完成','完成后进入正式设备页','复用'],['app-control','正式 App 设备页','复用已有设备控制','复用']],
 signed:[['notification','系统 NFC 通知','点按进入正式 App · 查询账号绑定','新增'],['guide','设备配网引导','保留 NFC 目标 · 自动查找','复用'],['connecting','设备连接过程','找到目标设备后开始连接','复用'],['success','连接成功','本分支到此结束','复用']],
 unsigned:[['notification','系统 NFC 通知','点按进入正式 App','新增'],['login','注册／登录账号','登录后查询目标设备的绑定关系','复用'],['guide','设备配网引导','保留 NFC 目标 · 自动查找','复用'],['connecting','设备连接过程','找到目标设备后开始连接','复用'],['success','连接成功','本分支到此结束','复用']],
 'signed-bound':[['notification','系统 NFC 通知','点按进入正式 App · 查询账号绑定','新增'],['control','设备控制页','已绑定当前账号 · 直接进入','复用']],
 'unsigned-bound':[['notification','系统 NFC 通知','点按进入正式 App','新增'],['login','注册／登录账号','登录后查询目标设备的绑定关系','复用'],['control','设备控制页','已绑定登录账号 · 直接进入','复用']]
};
function flowPage(){
 if(state.page==='clip-fallback')return state.installStatus==='idle'?'control':'store';
 if(platform==='android'&&['home','android-notification'].includes(state.page))return 'android-entry';
 if(platform==='android'&&['login','register','normal-entry'].includes(state.page)&&state.fromMarket)return 'normal-launch';
 if(state.scenario==='clip'&&state.origin!=='clip'&&state.page==='control')return 'app-control';
 if(state.page==='register')return 'login';
 if(state.page==='installing')return 'store';
 if(state.page==='guide'&&state.origin==='clip')return 'control';
 if(state.page==='failure')return state.failure==='install'?'store':state.origin==='clip'?'control':'connecting';
 if(state.page==='app-resume')return state.target?'guide':'login';
 return state.page;
}

// Familiar iPhone Home Screen, rendered locally so the NFC overlay stays interactive.
const iosArt = {
  facetime:['#32ce62','<rect x="11" y="19" width="27" height="22" rx="6" fill="white"/><path d="m40 25 11-7v24l-11-7" fill="white"/>'],
  calendar:['#fff','<text x="30" y="17" text-anchor="middle" font-size="10" fill="#f04b43">星期三</text><text x="30" y="47" text-anchor="middle" font-size="32" font-weight="300" fill="#181818">4</text>'],
  photos:['#fff',Array.from({length:8},(_,i)=>`<ellipse cx="30" cy="19" rx="7" ry="12" fill="${['#ff9e31','#ffcd33','#a4ce4a','#4cc5ad','#4da7e8','#9872d5','#df78b0','#f87b70'][i]}" fill-opacity=".78" transform="rotate(${i*45} 30 30)"/>`).join('')],
  camera:['#e5e6ea','<path d="m15 20 5-7h19l5 7" fill="#606268"/><rect x="7" y="19" width="46" height="31" rx="7" fill="#55565c"/><circle cx="30" cy="34" r="12" fill="#303138"/><circle cx="30" cy="34" r="8" fill="#161925"/><circle cx="32" cy="31" r="3" fill="#374359"/><circle cx="46" cy="25" r="2" fill="#f3dba1"/>'],
  clock:['#16171b','<circle cx="30" cy="30" r="25" fill="white"/><g stroke="#353539" stroke-width="1.5">'+Array.from({length:12},(_,i)=>`<path d="M30 8v3" transform="rotate(${i*30} 30 30)"/>`).join('')+'<path d="M30 30 19 24M30 30V14" stroke-width="2.5" stroke-linecap="round"/></g><path d="M30 30 38 41" stroke="#ff6638" stroke-width="1.4"/><circle cx="30" cy="30" r="2.5" fill="#ff6638"/>'],
  maps:['#d8edcb','<path d="M6 0v60M30 0v60M0 17h60M0 45h60" stroke="white" stroke-width="6"/><path d="M43-5 17 65" stroke="#edc170" stroke-width="16"/><path d="M43-5 17 65" stroke="#fff" stroke-width="10"/><path d="m2 48 61-24" stroke="#7dbbdf" stroke-width="8"/><path d="m30 19 12 25-12-5-12 5 12-25Z" fill="#258bf0" stroke="white" stroke-width="2"/>'],
  weather:['#298ee6','<circle cx="22" cy="24" r="12" fill="#ffce39"/><path d="M18 44a9 9 0 0 1-1-18 13 13 0 0 1 24 1 9 9 0 1 1 3 17H18Z" fill="white"/>'],
  notes:['#fff','<path d="M0 0h60v19H0" fill="#ffcf30"/><path d="M0 19h60" stroke="#e5b82c"/><path d="M9 29h42M9 39h42M9 49h42" stroke="#d9d9da" stroke-width="1"/>'],
  reminders:['#fff','<g fill="none" stroke-width="2"><circle cx="14" cy="16" r="4" stroke="#278df5"/><circle cx="14" cy="30" r="4" stroke="#ff9d29"/><circle cx="14" cy="44" r="4" stroke="#f35e4c"/></g><path d="M25 16h25M25 30h25M25 44h25" stroke="#cacbd0" stroke-width="2"/>'],
  appstore:['#168af4','<g stroke="white" stroke-width="4.4" stroke-linecap="round"><path d="m24 12 20 35M34 12 14 47M10 38h40"/></g>'],
  books:['#ff8c21','<path d="M29 19c-8-6-17-5-21-3v30c7-3 15-2 21 2V19Zm2 0c8-6 17-5 21-3v30c-7-3-15-2-21 2V19Z" fill="white"/>'],
  health:['#fff','<path d="M30 45 12 28C0 14 21 6 30 19c9-13 30-5 18 9L30 45Z" fill="#ff4e65"/>'],
  settings:['#b7b9c0','<g fill="none" stroke="#575b65"><circle cx="30" cy="30" r="21" stroke-width="6" stroke-dasharray="5 3"/><circle cx="30" cy="30" r="15" stroke-width="3"/><circle cx="30" cy="30" r="9" stroke-width="4"/></g>'],
  wallet:['#222326','<rect x="8" y="10" width="44" height="29" rx="4" fill="#83c9e2"/><path d="M8 18h44v12H8" fill="#f4ca64"/><path d="M8 27h44v12H8" fill="#ec8e80"/><rect x="6" y="34" width="48" height="18" rx="4" fill="#414045"/><path d="M17 35v5c0 8 26 8 26 0v-5" stroke="#b7b6bd" stroke-width="2"/>'],
  home:['#fff','<path d="m8 28 22-19 22 19h-7v23H16V28H8Z" fill="#ffad28"/><path d="M26 37h9v14h-9" fill="#fff"/>'],
  podcasts:['#b24bdf','<g stroke="white" fill="none" stroke-width="2.6"><circle cx="30" cy="26" r="19"/><circle cx="30" cy="26" r="12"/></g><circle cx="30" cy="25" r="5" fill="white"/><path d="M23 36c0-6 14-6 14 0l-2 16H25l-2-16Z" fill="white" stroke="#b24bdf" stroke-width="2"/>'],
  phone:['#31cd5f','<path d="m17 10 9 11-5 6c3 6 6 9 12 12l6-5 11 8c-2 7-8 10-13 7C23 42 13 32 9 19c-2-5 2-8 8-9Z" fill="white"/>'],
  safari:['#fff','<circle cx="30" cy="30" r="25" fill="#2da8eb"/><circle cx="30" cy="30" r="21" stroke="white" stroke-width="2" stroke-dasharray="1 4"/><path d="m40 14-5 21-20 10 10-20 15-11Z" fill="white"/><path d="m40 14-5 21-10-10 15-11Z" fill="#ff4e55"/>'],
  messages:['#30cd61','<path d="M51 28c0 12-13 20-27 17l-10 5 2-9C0 32 6 10 28 10c13 0 23 7 23 18Z" fill="white"/>'],
  music:['#fa4262','<path d="M39 12v28c0 9-16 11-16 3 0-5 6-7 11-6V17l-14 3v24c0 9-16 11-16 3 0-5 6-7 11-6V17l24-5Z" fill="white" transform="translate(7 0)"/>'],
};
function iosApp(key,label,dock=false){
  const art=iosArt[key];
  const image=key==='momcozy'?'<img src="assets/mark.svg" alt="">':`<svg viewBox="0 0 60 60" aria-hidden="true"><defs><clipPath id="ios-${key}"><rect width="60" height="60" rx="13"/></clipPath></defs><g clip-path="url(#ios-${key})"><path fill="${art[0]}" d="M0 0h60v60H0z"/>${art[1]}</g></svg>`;
  return `<div class="ios-app${dock?' dock-app':''}">${image}${dock?'':`<span>${label}</span>`}</div>`;
}
function iosLauncher(){
  const apps=[['facetime','FaceTime'],['calendar','日历'],['photos','照片'],['camera','相机'],['reminders','提醒事项'],['clock','时钟'],['maps','地图'],['weather','天气'],['notes','备忘录'],['appstore','App Store'],['books','图书'],['health','健康'],['settings','设置'],['wallet','钱包'],['home','家庭'],state.installed?['momcozy','Momcozy']:['podcasts','播客']];
  return `<div class="ios-launcher" aria-label="iPhone 主屏幕"><div class="ios-widgets"><div class="ios-weather-widget"><span>上海</span><strong>23°</strong><div class="widget-sun">☀</div><small>晴<br>最高 25° 最低 18°</small></div><div class="ios-calendar-widget"><span>星期三</span><strong>4</strong><small>今天没有其他日程</small></div></div><div class="ios-app-grid">${apps.map(([key,label])=>iosApp(key,label)).join('')}</div><div class="ios-search"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4"/><path d="m9.5 9.5 4 4"/></svg>搜索</div><div class="ios-dock">${[['phone','电话'],['safari','Safari'],['messages','信息'],['music','音乐']].map(([key,label])=>iosApp(key,label,true)).join('')}</div></div>`;
}
function iosHome(show=''){
  return `<div class="ios-home">${iosLauncher()}${show==='notification'?`<button class="notification" data-action="open-nfc"><span class="nfc-icon notification-system-icon" aria-hidden="true">${icon('nfc')}</span><span class="notification-copy"><strong>检测到物品</strong><p>${state.scenario==='legacy'?'在 Safari 中打开':state.installed?'在 Momcozy 中打开':'查看 Momcozy 轻 App'}</p></span><span class="notification-time">9:41</span></button>`:''}${show==='card'?`<div class="clip-card-overlay"><section class="clip-card" aria-label="App Clip 小卡片"><div class="clip-card-hero"><img src="${CLIP_CARD_IMAGE}" alt="手机通过 NFC 连接 Momcozy Air2 吸奶器的简笔示意"><button class="clip-close" data-action="dismiss-card" aria-label="关闭小卡片">×</button></div><div class="clip-card-copy"><div class="clip-card-content"><div class="clip-card-text"><h2 aria-label="${DEVICE.cardTitle}"><span class="clip-product-name">${DEVICE.productName}</span></h2><p>碰一碰即刻控制，前往 App 开启专属智能体验</p></div><button class="clip-open" data-action="open-clip">打开</button></div><div class="clip-card-footer"><div class="clip-footer-brand"><img src="${CLIP_BRAND_IMAGE}" alt="Momcozy M Logo"><div><span>轻 App</span><strong>Momcozy</strong></div></div><span class="clip-store-link">${icon('clip')} App Clip</span></div></div></section></div>`:''}</div>`;
}
function clipConnectionBanner(){
 if(state.btAuthorization==='notDetermined')return `<section class="clip-connect-banner" role="status"><div class="clip-banner-copy"><strong>等待蓝牙授权</strong><p>允许使用蓝牙后，即可查找和连接设备。</p></div></section>`;
 if(state.connected)return state.clipSuccessVisible?`<section class="clip-connect-banner is-ready" role="status"><span class="clip-status-icon" aria-hidden="true">✓</span><div class="clip-banner-copy"><strong>连接成功</strong></div></section>`:'';
 if(state.failure){
   const [title,copy,cta,action]=failureInfo();
   return `<section class="clip-connect-banner is-error" role="status"><div class="clip-banner-copy"><strong>${title}</strong><p>${copy}</p></div><button class="clip-banner-retry" data-action="${action}">${cta}</button></section>`;
 }
 return `<section class="clip-connect-banner" aria-label="设备连接状态" role="status"><span class="quick-spinner" aria-hidden="true"></span><div class="clip-banner-copy"><strong>正在连接 Air 2</strong><p>MAC：${DEVICE.mac.match(/.{1,2}/g).join(':')}</p></div></section>`;
}

function pairingView(){
  return state.page==='guide'?'guide':state.page==='connecting'?'connecting':state.page==='failure'&&state.failure==='connection'&&state.origin!=='clip'?'failure':null;
}
function pairingConfig(){return {view:pairingView(),stage:state.stage,paused:paused,clip:state.origin==='clip',targetMac:state.origin==='nfc'&&state.target&&!state.parameterFallback?DEVICE.mac:'',model:DEVICE.name,dialog:state.dialog,guideTimeout:!!state.guideTimeout,guideToken:state.guideToken||0};}
function updatePairingFrame(){
  const frame=$('screen').querySelector('.pairing-frame');
  frame?.contentWindow?.postMessage({type:'pairing-config',config:pairingConfig()},location.origin);
}
function pairingMarkup(view){
  const params=new URLSearchParams({v:'9',view,stage:String(state.stage),paused:paused?'1':'0',clip:state.origin==='clip'?'1':'0',targetMac:state.origin==='nfc'&&state.target&&!state.parameterFallback?DEVICE.mac:'',model:DEVICE.name});
  return `<div class="app-page reused-pairing-page"><iframe class="pairing-frame" data-pairing-view="${view}" title="${state.origin==='clip'?'Clip 蓝牙连接':'配网专项-全面优化'} · ${view==='guide'?'操作指引':view==='failure'?'连接失败':'连接设备'}" src="pairing-module/index.html?${params}"></iframe></div>`;
}
function guideMarkup(){return pairingMarkup('guide');}
function connectMarkup(){return pairingMarkup('connecting');}
function controlMarkup(){
  const clip=state.origin==='clip'&&!state.bound;
  if(clip)return quickControlMarkup();
  const fullAppUrl=location.hostname==='127.0.0.1'||location.hostname==='localhost'?'full-app/nfc-entry.html':'../Air%202%20V2.0/nfc-entry.html';
  return `<div class="full-app-host"><iframe class="full-app-frame" title="Air 2 正式 App 控制页" src="${fullAppUrl}"></iframe></div>`;
}
function appInstallBanner(){
 const downloading=state.installStatus==='downloading',failed=state.installStatus==='failed';
 const subtitle=failed?'未能完成下载，请重试':downloading?'正在下载…':'开启专属智能体验';
 const action=state.installDone?'launch-app':failed?'retry-install':'install';
 const label=state.installDone?'打开':failed?'重试':'获取';
 const cta=downloading?`<button class="install-progress-button" data-action="cancel-install" aria-label="取消下载" title="取消下载"><svg viewBox="0 0 32 32" role="progressbar" aria-label="Momcozy 下载进度" aria-valuenow="${state.installProgress}" aria-valuemin="0" aria-valuemax="100"><circle class="install-track" cx="16" cy="16" r="12"/><circle class="install-ring" cx="16" cy="16" r="12" pathLength="100" stroke-dasharray="${state.installProgress} 100"/><rect x="12" y="12" width="8" height="8" rx="1"/></svg></button>`:`<button class="get-chip" data-action="${action}" aria-label="${label} Momcozy App">${label}</button>`;
 return `<section class="download-float system-app-overlay" aria-label="Momcozy App 系统安装横幅示意"><img class="overlay-app-icon" src="assets/auth-logo.svg" alt="Momcozy"><div class="overlay-app-copy"><strong>Momcozy</strong><small role="status">${subtitle}</small></div>${cta}</section>`;
}
function storeMarkup(){return controlMarkup();}
function clipFallbackMarkup(){
 return `<div class="app-page failure-page clip-fallback-page">${nav('添加设备','exit','APP CLIP')}<div class="page-content"><div class="result-mark" aria-hidden="true">!</div><h2>暂时无法连接设备</h2><p class="page-desc">请下载 Momcozy App，选择你的设备，按照设备指引添加设备。</p></div>${appInstallBanner()}</div>`;
}
function loginMarkup(){
 const registering=state.page==='register';
 const pin='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
 const eye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 8c3 8 15 8 18 0M5 12l-2 2m6 1-1 3m7-3 1 3m3-6 2 2"/></svg>';
 const google='<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.76-.06-1.49-.2-2.2H12v4.16h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.75 3.28-8.04Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.67l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.87 0-5.3-1.94-6.17-4.54H2.15v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.83 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.15a11 11 0 0 0 0 9.86l3.68-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A10.6 10.6 0 0 0 12 1a11 11 0 0 0-9.85 6.07l3.68 2.84C6.7 7.31 9.13 5.38 12 5.38Z"/></svg>';
 const apple='<svg viewBox="0 0 24 24" fill="#25313d"><path d="M17.1 12.3c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.2-2.7.8-3.4.8-.7 0-1.8-.8-2.9-.8-1.5 0-3 .9-3.8 2.2-1.6 2.8-.4 7 1.1 9.3.8 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.7-2.2c.9-1.3 1.2-2.6 1.3-2.7-.1 0-2.5-1-2.5-3.7ZM14.8 5.7c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.2 1.8-1.1 2.8 1 .1 2.1-.5 2.8-1.2Z"/></svg>';
 const facebook='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#3977ee"/><path fill="#fff" d="M13.8 22.8v-8.4h2.8l.4-3.2h-3.2v-2c0-.9.3-1.5 1.6-1.5H17V4.8c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.8v3.2h2.7v8.4Z"/></svg>';
 return `<div class="app-page login-page"><div class="auth-region"><label class="auth-country">${pin}<select aria-label="Country or region"><option>Australia</option><option>United States</option><option>Canada</option></select></label></div><form id="auth-form" class="auth-form"><img class="auth-logo" src="assets/auth-logo.svg" alt="Momcozy"><h1>${registering?'Create Account':'Welcome to Momcozy'}</h1><div class="auth-fields"><input id="account" name="account" aria-label="Email or phone number" placeholder="Email or phone number" autocomplete="off" spellcheck="false" required><div class="auth-password"><input id="password" name="password" type="password" aria-label="Password" placeholder="Password" autocomplete="off" required><button type="button" class="auth-eye" data-action="toggle-password" aria-label="Show password" aria-pressed="false">${eye}</button></div></div><div class="auth-links"><button type="button" data-action="code-login">Verification Code Login</button><button type="button" data-action="forgot-password">Forgot Password?</button></div><p id="auth-feedback" class="auth-feedback" role="status"></p><div class="auth-bottom"><button class="auth-primary" type="submit" disabled>${registering?'Create Account':'Login'}</button><button class="auth-secondary" type="button" data-action="toggle-auth">${registering?'Login':'Create Account'}</button><div class="auth-divider"><span>OR</span></div><div class="auth-social"><button type="button" aria-label="Continue with Google" data-action="demo-social">${google}</button><button type="button" aria-label="Continue with Apple" data-action="demo-social">${apple}</button><button type="button" aria-label="Continue with Facebook" data-action="demo-social">${facebook}</button></div></div></form></div>`;
}

function successMarkup(){
  const terminal=['signed','signed-bound','unsigned','unsigned-bound'].includes(state.scenario);
  const doneAction=terminal?'finish-flow':'enter-control';
  return `<div class="app-page success-page">
    <div class="completion-toolbar">
      <button class="completion-icon" data-action="${doneAction}" aria-label="${terminal?'结束本次演示':'关闭完成页'}">${icon('close')}</button>
      <button class="completion-icon" data-action="support" aria-label="联系客服">${icon('headset')}</button>
    </div>
    <div class="completion-content">
      <img class="completion-product" src="assets/breast-pump.png" width="586" height="570" alt="粉色 Momcozy 吸奶器">
      <h2><span>${DEVICE.name}</span><span>Connect Successfully</span></h2>
    </div>
    <div class="completion-actions"><button class="primary" data-action="${doneAction}" ${terminal&&state.flowComplete?'disabled':''}>Done</button></div>
  </div>`;
}
function failureInfo(){
 const map={
 connection:['未连接设备','请确认设备已开机、手机蓝牙已开启，并将设备靠近手机后重新扫描。','重新扫描','retry-connection'],
 'bluetooth-off':['请开启手机蓝牙','开启手机蓝牙后，再重新连接设备。','重新连接','enable-bluetooth'],
 bluetooth:['蓝牙权限未开启','请在系统设置中允许 Momcozy 轻 App 使用蓝牙，返回后重试。','去设置','settings'],
 install:['App 暂时无法安装','请检查网络或可用存储空间后重试。你也可以返回 Clip 继续使用。','重新安装','retry-install']};
 return map[state.failure]||map.connection;
}
function failureMarkup(){
 if(state.origin!=='clip'&&state.failure==='connection')return pairingMarkup('failure');
 const [title,copy,cta,action]=failureInfo();
 return `<div class="app-page failure-page">${nav(state.failure==='install'?'下载 App':'连接设备','exit','APP CLIP')}<div class="page-content"><div class="result-mark">!</div><h2>${title}</h2><p class="page-desc">${copy}</p>${device('本次体验设备')}</div><div class="page-actions">${button(cta,action)}${button(state.failure==='install'?'返回 Clip 继续使用':'暂时退出','exit',true)}</div></div>`;
}
function resumeMarkup(){return `<div class="app-page">${nav('Momcozy',null,'APP')}<div class="page-content resume-content"><div class="brand-icon">m</div><h1 class="page-title">稍后继续</h1><p class="page-desc">${state.target?'准备好后，可继续连接设备。':'注册／登录后，继续连接设备。'}</p></div><div class="page-actions">${button('继续','resume-continue')}</div></div>`;}

function dialogMarkup(){
  if(state.dialog==='clip-bluetooth-request')return `<div class="overlay ios-permission-overlay"><section class="ios-permission-dialog" role="dialog" aria-modal="true" aria-labelledby="clip-bluetooth-title"><h2 id="clip-bluetooth-title">“Momcozy”想要使用蓝牙</h2><p>用于查找、连接并控制附近的设备。</p><div class="ios-permission-actions"><button data-action="bt-deny">不允许</button><button data-action="bt-allow">好</button></div></section></div>`;
  if(state.dialog==='guide-help')return `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="guide-help-title"><h2 id="guide-help-title">检查设备电量</h2><p>如果按下电源键后设备没有反应，请先为设备充电，再尝试开机。</p>${button('返回连接指引','dismiss-guide-help')}</section></div>`;
  if(state.dialog==='support')return `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="support-title"><h2 id="support-title">需要帮助？</h2><p>设备已连接成功。如需更多帮助，可前往 App「我的 → 帮助与客服」。</p>${button('返回完成页','dismiss-support')}</section></div>`;
  const clipControl=['control','clip-fallback'].includes(state.page)&&state.origin==='clip';
  const copy=state.page==='guide'?'退出后将停止本次尝试。你可以再次碰触 NFC，重新查找设备。':['login','register'].includes(state.page)?'你可以稍后回到正式 App 注册或登录，再继续配网。':state.page==='connecting'?'本次连接将停止，返回连接准备后可以重试。':clipControl?'关闭后将结束当前 Clip 体验。你可以再次碰触 NFC 重新连接。':'你可以稍后继续使用当前设备。';
  return `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="exit-title"><h2 id="exit-title">暂时退出？</h2><p>${copy}</p>${button('继续当前操作','dismiss-exit')}${button('暂时退出','confirm-exit',true)}</section></div>`;
}

function exceptionDescription(title,trigger,display,effect,tag='分支'){
 return [title,'',tag,[`触发条件：${trigger}`,`展示内容：${display}`,`点击效果：${effect}`]];
}
function getExceptionSpec(){
 if(state.dialog==='clip-bluetooth-request')return exceptionDescription('首次蓝牙授权 · iOS 系统弹窗',
  'Clip 首次使用蓝牙，系统尚无授权记录。',
  '系统弹出「“Momcozy”想要使用蓝牙」，说明「用于查找、连接并控制附近的设备。」，按钮为「不允许」「好」。',
  '点击「好」，授权且手机蓝牙可用后开始扫描；点击「不允许」，停止扫描，显示「蓝牙权限未开启」提示，控制区域不可用。','新增');
 if(state.dialog==='exit'){
  const reused=!!pairingView();
  const title=reused?'退出配网流程？':'暂时退出？';
  const buttons=reused?'「取消」「退出」':'「继续当前操作」「暂时退出」';
  const effect=state.origin==='clip'&&['control','store','clip-fallback'].includes(state.page)?'确认退出后结束 Clip 体验并返回手机主屏幕。':state.page==='connecting'?'确认退出后停止本次连接，返回原配网准备页。':['login','register'].includes(state.page)?'确认退出后进入「稍后继续」，再次点击「继续」时返回登录流程。':'确认退出后结束本次尝试，返回当前流程的上一入口。';
  return exceptionDescription('退出当前流程','用户点击当前页面的返回或关闭入口。',`展示「${title}」退出确认，说明当前操作的退出影响，按钮为${buttons}。`,`点击${reused?'「取消」':'「继续当前操作」'}，关闭弹窗并保留当前操作；${effect}`);
 }
 if(state.dialog==='guide-help')return exceptionDescription('检查设备电量','用户点击连接指引中的开机帮助入口。','展示「检查设备电量」，说明「如果按下电源键后设备没有反应，请先为设备充电，再尝试开机。」，按钮为「返回连接指引」。','点击「返回连接指引」，关闭提示，回到当前连接指引。');
 if(state.dialog)return null;
 if(state.origin==='nfc'&&state.parameterFallback&&['notification','android-notification','login','register','guide','normal-entry'].includes(state.page)){
  const knownModel=state.parameterFallback==='mac';
  const trigger=`正式 App 收到 NFC 链接，${knownModel?'Model 有效，但 MAC 缺失或校验不通过。':'Model 缺失、无法识别或不支持。'}`;
  const next=knownModel?'进入该型号已有配网准备页，按正常流程发现同型号设备，不限制原 MAC。':'回到已有首页，由用户自行选择设备，不预先进入配网引导。';
  if(['notification','android-notification'].includes(state.page))return exceptionDescription('NFC 参数异常 · 系统入口',trigger,'展示当前平台的 NFC 系统通知。',`点击通知打开正式 App；${state.logged?'已登录，'+next:'未登录，先复用现有登录页，登录后'+next}`);
  if(['login','register'].includes(state.page))return exceptionDescription('NFC 参数异常 · 未登录',trigger+'当前账号未登录。','复用已有注册／登录页，不新增登录弹窗。','登录成功后，'+next);
  return exceptionDescription(knownModel?'NFC 参数异常 · 按型号配网':'NFC 参数异常 · 自行选择设备',trigger+'当前账号已登录。',knownModel?'复用该型号已有配网准备页，页面及自动发现卡片保持原样。':'展示已有 App 首页，不自动选择型号或打开配网准备页。',knownModel?'按原配网引导操作，发现并连接同型号设备，不按原 MAC 筛选；后续沿用正常配网流程。':'使用首页原有添加设备入口，自行选择型号，后续沿用正常添加流程。');
 }
 if(state.page==='clip-fallback'){
  const installDisplay=state.installDone?'安装横幅显示「打开」。':state.installStatus==='downloading'?'安装横幅显示下载进度。':state.installStatus==='failed'?'安装横幅显示下载失败及「重试」。':'保留正式 App「获取」入口。';
  const installEffect=state.installDone?'点击「打开」，正常启动正式 App，登录后进入已有首页。':state.installStatus==='downloading'?'点击进度按钮，取消下载，恢复「获取」入口。':state.installStatus==='failed'?'点击「重试」，重新下载。':'点击「获取」，沿用现有下载流程。';
  return exceptionDescription('NFC 参数异常','NFC 已打开 Clip，但 Model、MAC 或其他必要参数缺失、无效或无法识别。',
   '显示「暂时无法连接设备」「请下载 Momcozy App，选择你的设备，按照设备指引添加设备。」，不启动蓝牙扫描。'+installDisplay,
   installEffect+'安装后由用户自行选择设备，按现有指引添加，不按 NFC 参数预选型号或限定 MAC。');
 }
 if(state.appManualSelection&&['login','register','normal-entry'].includes(state.page))return [state.page==='normal-entry'?'正式 App · 已有首页':'正式 App · 注册／登录','下载后的正常启动流程直接复用已有功能。','复用',['登录后进入已有首页，由用户自行选择设备，按现有指引添加；不按 NFC 参数预选型号或限定 MAC。']];
 if(platform==='android'&&state.page==='landing'&&state.browserFallback&&state.scenario!=='legacy')return exceptionDescription('Android · 链接由浏览器打开',
  'NFC 链接由系统交给浏览器处理，未直接打开已安装的 App。',
  '浏览器展示已有下载落地页，页面及按钮沿用原有样式。',
  '点击原下载按钮尝试唤起 App；唤起成功后，未登录先登录，再按当前账号的绑定关系进入控制页或配网准备页。');
 if(state.origin!=='clip'||!['control','store','failure'].includes(state.page))return null;
 if((state.page==='store'&&state.installStatus==='failed')||state.failure==='install')return exceptionDescription('正式 App 安装失败',
  '在 Clip 内获取正式 App 时，系统返回下载或安装失败。',
  '保留快控页，安装横幅显示「未能完成下载，请重试」和「重试」按钮；原蓝牙连接不因安装失败而重置。',
  '点击「重试」，在原安装横幅重新开始下载，留在 Clip 当前页面。');
 const [title,copy,cta]=failureInfo();
 const display=`快控页顶部显示「${title}」，说明「${copy}」，按钮为「${cta}」；设备控制区域不可用。`;
 if(state.failure==='connection')return exceptionDescription('未连接设备',
  '扫描超时、连接失败，或使用中连接断开。',
  '快控页顶部显示「未连接设备」及「请确认设备已开机、手机蓝牙已开启，并将设备靠近手机后重新扫描。」，按钮为「重新扫描」；设备控制区域不可用。',
  '点击「重新扫描」，在当前页重新查找并连接本次 NFC 指定的设备。');
 if(state.failure==='bluetooth-off')return exceptionDescription('手机蓝牙关闭',
  '开始扫描、连接或使用过程中，检测到手机蓝牙已关闭。',display,
  '用户开启手机蓝牙后，点击「重新连接」，检查蓝牙状态并重新连接原设备；仍未开启时保留提示。');
 if(state.failure==='bluetooth')return exceptionDescription('蓝牙权限未开启',
  '系统蓝牙访问权限已被拒绝，Clip 无法扫描和连接设备。',display,
  '点击「去设置」尝试打开系统设置；返回后检查授权及蓝牙状态，通过后重连。不重复弹系统授权框，实际设置跳转入口需真机确认。');
 return null;
}

function getSpec(){
 const exception=getExceptionSpec();if(exception)return exception;
 if(state.scenario==='legacy')return legacySpec();
 if(platform==='android'){const spec=androidSpec();if(spec)return spec;}
 const clip=state.origin==='clip';
 if(state.dialog==='support')return ['帮助入口','复用当前帮助入口。','复用',['本地弹窗不发起真实客服会话。','关闭后返回当前页面。'],'当前设备状态不变。'];
 if(state.dialog)return ['退出当前流程','明确结束或保留当前操作。','分支',['取消返回当前页面。','Clip 快控页退出结束本次体验，并停止扫描及连接。','下载在快控页的系统横幅中进行，可取消或失败后重试。'],'退出停止当前计时，不误报连接成功。'];
 if(state.page==='home'&&state.scenario==='clip')return ['NFC 直达 App Clip 卡片','靠近充电仓后直接展示系统卡片。','新增',['点击「模拟碰 NFC」，直接出现底部 App Clip 卡片，不展示顶部通知。','用户点击卡片「打开」后才启动 Clip，并请求蓝牙权限。','以 NFC URL、域名关联及 App Clip experience 已正确配置为前提，实际表现需真机验收。']];
 if(state.page==='home')return ['NFC 入口，先看系统提示','普通 NFC 标签由 iPhone 后台读取；完整路径可从顶部「完整流程图」查看。','新增',['读取后先显示 iOS 系统通知，已解锁也需点按；不主动打开扫描器。','锁屏且亮屏：按系统提示解锁后继续；熄屏通常不触发后台读取。','相机、Wallet／Apple Pay 使用中等状态可能暂停后台读取。'],'以 NFC 链接、App Clip 体验及 App 关联配置正常为前提。'];
 if(state.page==='clip-card')return ['App Clip 卡片 · 未安装 App','展示当前设备的 App Clip 卡片。','新增',['标题使用产品名称，示例：智能吸奶器Air2。','说明：碰一碰即刻控制，前往 App 开启专属智能体验。','头图展示手机连接当前型号设备的示意图。','点击右上角关闭，收起卡片并返回手机主屏幕，不启动 Clip。','点击「打开」，进入 Clip 快控页并开始蓝牙连接流程。']];
 if(state.page==='guide')return state.origin==='nfc'?['NFC 目标设备 · 配网引导','直接进入「配网专项-全面优化」已有的配网准备／引导页。','复用',['根据 NFC 信息中的 model，进入对应设备已有的配网准备页。','根据 NFC 信息中的 MAC 查找指定设备，仅匹配该设备。','配网准备页、自动发现卡片及后续交互完整复用正常配网流程。'],'验证进入 NFC 对应型号的准备页，并查找指定 MAC 的设备；页面与正常流程一致。']:['正式 App · 配网指引','复用「配网专项-全面优化」已有内容。','复用',['正式 App 注册／登录后直接进入本配网准备／引导页。','复用原操作指引、扫描和后续配网流程。','正式 App 异常在原专项维护，本 Demo 不重复展开。'],'必须完成指引和配网，才能进入已绑定设备页。'];
 if(state.page==='control')return clip?[state.failure?'Clip 快控页 · '+failureInfo()[0]:state.connected?'Clip 快控页 · 已连接':'Clip 快控页 · 扫描与连接','卡片打开后直接展示快控页，顶部轻提示展示蓝牙连接状态。',state.failure?'分支':'新增',['进入本页先确认蓝牙授权与可用状态，通过后自动扫描；顶部常驻显示 Model、MAC 和当前连接状态。','连接中统一显示「正在连接」，连接后显示「已连接」并持续保留，不展示内部阶段。','未连接时禁用控制；连接后仅提供刺激、吸乳、混合三模式、左右独立调档及开始／暂停／停止。不提供双控或同步调档。','连接异常、蓝牙关闭或权限未开时，顶部保留对应提示及恢复入口，不跳出当前页面。','Air2 仅提示开机与靠近，不要求重置；重试不要求再次碰 NFC。','搜索超时、连接失败及使用中连接断开统一展示「未连接设备」，点击「重新扫描」后重新查找并连接原目标设备。','底部保留正式 App 下载入口；免登录快控不建立账号绑定。','左右档位分别生效；运行状态使用统一开始／暂停／停止，不增加单侧控制开关。','档位暂沿用素材 Demo 的 0–15；正式范围及停止后档位策略待协议确认。'],'档位范围沿用 Air 2 V2.0 Demo 的 0–15，仅作原型参数，正式范围以协议为准。停止保留模式与档位；重新开始使用当前设置。']:['正式 App 设备页','进入 NFC 指定设备的已有控制页，后续沿用原有流程。','复用',['目标设备已绑定当前登录账号时，直接进入该设备控制页。','复用已有控制页面与后续逻辑，本需求不重复定义。'],'只验证是否进入本次 NFC 指定设备的控制页。'];
 if(state.page==='store')return [state.installStatus==='failed'?'下载正式 App · 下载失败':'下载正式 App · 系统横幅','通过 iOS 系统安装横幅在 Clip 内获取主 App。','新增',['点击横幅中的获取，留在快控页进入系统下载流程，不打开独立商品详情页或跳转 App Store。','名称、图标和副标题由 App Store 元数据提供；此处示意为 Momcozy／开启专属智能体验，正式以实际上架配置为准。','下载进度、获取及安装确认由系统管理，必要时可能出现 Apple 账户确认；不能静默安装。','本地模拟获取 → 圆环进度 → 打开；可取消下载，失败后在横幅内重试。','安装过程中不因下载操作主动重置 Clip 的蓝牙连接；打开正式 App 后仍需注册／登录，再进入配网准备／引导及完整配网。'],'下载不离开快控页；网页中的进度和打开状态为交互示意，以真机系统横幅为准。'];
 if(['login','register'].includes(state.page))return ['正式 App · 注册／登录','登录流程直接复用现有功能。','复用',['交互规则及规范与现有登录页一致，此处不再赘述。',state.origin==='nfc'?'保留本次 NFC 目标。登录成功后，已绑定当前账号的设备进入控制页；未绑定的设备进入对应型号的配网准备页。':'注册／登录成功后，进入已有配网准备页。']];
 if(state.page==='connecting')return ['正式 App · 完整配网','复用「配网专项-全面优化」连接过程。','复用',['沿用连接设备、设备上云、进度与退出确认。','正式 App 注册／登录后完成此流程，成功才建立账号关联。','原专项已覆盖异常，本 Demo 不重复增加其异常分支。'],'未完成连接之前不显示绑定成功。'];
 if(state.page==='success'&&['signed','signed-bound','unsigned','unsigned-bound'].includes(state.scenario))return ['正式 App · 连接成功','本分支演示到连接成功结束。','复用',['复用原连接成功页，Done 结束本次演示。','配网及后续处理沿用已有流程。'],'本需求只定义 NFC 接入路径，配网后续沿用原流程。'];
 if(state.page==='success')return ['正式 App 配网完成','完成完整流程后展示已有成功页。','复用',['复用已确认的产品图、成功文案和 Done 按钮。','Done 进入正式 App 的设备页。','不执行 Clip 体验数据自动清除。'],'绑定来自本次正式配网。'];
 if(state.page==='notification')return ['系统 NFC 通知','手机触碰 NFC 标签时出现系统通知。','新增',[state.installed?'点击通知，进入 Momcozy App。':'点击通知，进入 App Clip 卡片。']];
 if(state.page==='failure'){
 const rules={connection:['提示设备开机并靠近手机。','重试从 Clip 内重新连接，不再碰 NFC。'],bluetooth:['权限未允许时不继续搜索，不误报设备未找到。','展示设置指引，用户返回后主动重试。'],'bluetooth-off':['手机蓝牙关闭时暂停连接。','开启后从原目标重新连接。'],install:['不退出快控，可重新安装或返回。','安装完成后仍需在正式 App 走完整流程。']};
 return [failureInfo()[0],'Clip 异常可点击演示并恢复。','分支',rules[state.failure]||rules.connection,state.failure==='install'?'安装失败不影响原蓝牙连接，可返回快控。':'恢复成功前保持未连接状态，成功后才恢复快控。'];
 }

 return ['稍后继续','正式 App 按已有流程继续。','复用',['注册／登录后进入原配网准备／引导页。'],'不自动接续 Clip 设备。'];
}

function switchPlatform(next){
 if(next===platform)return;
 platformSnapshots[platform]={state:{...state},paused};
 clearTimeout(timer);clearTimeout(installTimer);clearTimeout(clipNoticeTimer);clipNoticeTimer=null;
 platform=next;
 $('screen').innerHTML='';
 if(platformSnapshots[next]){state={...platformSnapshots[next].state};paused=platformSnapshots[next].paused;render();}
 else{paused=false;reset();}
 schedule();
}
function currentFlowSteps(){
 const steps=platform==='android'?androidFlow():flows[state.scenario];
 if(!state.parameterFallback)return steps;
 if(state.scenario==='clip')return [...flows.clip.slice(0,3),['login','正式 App · 注册／登录','沿用正常启动流程','复用'],['normal-entry','App 首页','自行选择设备 · 正常添加','复用']];
 if(state.origin==='nfc')return [steps[0],...(!state.scenario.startsWith('unsigned')?[]:[['login','注册／登录账号','复用已有登录流程','复用']]),...(state.parameterFallback==='mac'?[
  ['guide','设备配网引导','按有效 Model · 不限定 MAC','复用'],['connecting','设备连接过程','同型号正常配网','复用'],['success','连接成功','本分支到此结束','复用']
 ]:[['normal-entry','App 首页','由用户自行选择设备','复用']])];
 return steps;
}
function render(){
  if(typeof closeDownloadStory==='function')closeDownloadStory(false);
  renderPlatformChrome();
  document.querySelectorAll('[data-scenario]').forEach(el=>{el.classList.toggle('active',el.dataset.scenario===state.scenario);el.setAttribute('aria-pressed',String(el.dataset.scenario===state.scenario));});
  document.querySelectorAll('[data-scenario-group]').forEach(el=>{
    const group=el.dataset.scenarioGroup;
    const expanded=state.scenario===group||state.scenario===`${group}-bound`;
    el.setAttribute('aria-expanded',String(expanded));
    el.classList.toggle('active',expanded);
    $(el.getAttribute('aria-controls')).hidden=!expanded;
  });
  document.querySelectorAll('#scenarios > button small').forEach(el=>{el.hidden=!el.closest('button').classList.contains('active');});
  document.querySelector('.scenario-binding-note').hidden=!['signed','signed-bound','unsigned','unsigned-bound'].includes(state.scenario);
  const page=flowPage(), steps=currentFlowSteps(), index=steps.findIndex(s=>s[0]===page);
  const flowItems=steps.map(([key,title,sub,tag],i)=>`<button class="flow-item ${page===key?'active':i<index?'completed':''}" data-step="${key}" ${page===key?'aria-current="step"':''}><span class="step-number">${i<index?'✓':String(i+1).padStart(2,'0')}</span><span class="flow-text"><span class="flow-title">${title}</span><span class="flow-subtitle">${sub}</span></span><span class="tag">${tag}</span></button>`);
  const formalIndex=steps.findIndex(step=>step[0]==='login');
  $('flow').innerHTML=state.scenario==='clip'?flowItems.slice(0,formalIndex).join('')+`<details class="formal-flow" ${state.origin==='app'?'open':''}><summary>正式 App 流程 <span class="tag">复用</span></summary>${flowItems.slice(formalIndex).join('')}</details>`:flowItems.join('');
  const parameterBranches=[['invalid-mac','NFC 参数异常 · MAC 无效'],['invalid-model','NFC 参数异常 · Model 无效']];
  const installedScenario=['signed','signed-bound','unsigned','unsigned-bound'].includes(state.scenario);
  const branches=state.scenario==='legacy'?[]:installedScenario?[...(platform==='android'?[['browser-fallback','链接由浏览器打开']]:[]),...parameterBranches]:state.scenario==='clip'?[['connection','未连接设备'],['bluetooth-off','手机蓝牙关闭'],['bluetooth','蓝牙权限未允许'],['install','正式 App 安装失败'],['invalid-parameters','NFC 参数异常']]:[];
  $('branch-title').textContent=state.scenario==='clip'?'Clip 异常与恢复':'异常与恢复';
  $('branches').innerHTML=branches.length?branches.map(([key,title])=>`<button class="branch ${key==='invalid-parameters'&&state.page==='clip-fallback'||key===`invalid-${state.parameterFallback}`&&state.origin==='nfc'||key==='legacy-web'&&state.page==='legacy-web'||key==='install'&&state.installStatus==='failed'&&state.page!=='clip-fallback'||state.failure===key&&(state.page==='failure'||state.page==='guide'||state.page==='control')&&!state.guideTimeout||key==='login'&&state.loginError?'active':''}" data-branch="${key}">${title}</button>`).join(''):`<p class="tiny">${platform==='android'&&state.scenario==='download'?'下载流程复用现有落地页。':state.scenario==='legacy'?'系统直接打开旧版 App 的情况，见右侧兼容说明。':'正式 App 异常沿用原配网专项。'}</p>`;
  const markup={home:()=>platform==='android'?androidHome():iosHome(),notification:()=>iosHome('notification'),'clip-card':()=>iosHome('card'),'clip-fallback':clipFallbackMarkup,guide:guideMarkup,connecting:connectMarkup,control:controlMarkup,store:storeMarkup,login:loginMarkup,register:loginMarkup,success:successMarkup,failure:failureMarkup,'app-resume':resumeMarkup,'android-notification':()=>androidHome(true),landing:androidLanding,market:androidMarket,'normal-entry':androidNormalEntry,'legacy-web':legacyWebMarkup};
  const reusedView=pairingView(), currentFrame=$('screen').querySelector('.pairing-frame');
  // Keep the iframe mounted while stages, pause state, or the exit sheet change.
  if(!((state.page==='control'&&state.origin!=='clip')&&$('screen').querySelector('.full-app-frame'))&&(!reusedView||currentFrame?.dataset.pairingView!==reusedView)){
    $('screen').innerHTML=markup[state.page]()+(state.dialog&&!reusedView?dialogMarkup():'');
  }
  if(reusedView)updatePairingFrame();
  const fullHost=$('screen').querySelector('.full-app-host');
  document.querySelector('.phone').classList.toggle('is-full-app',!!fullHost);
  if(fullHost){const fit=()=>{const scale=fullHost.clientWidth/402;fullHost.style.setProperty('--full-app-scale',scale);fullHost.style.setProperty('--full-app-height',(fullHost.clientHeight/scale+44)+'px');fullHost.style.setProperty('--full-app-top',(-44*scale)+'px');};fit();if(!fullHost.dataset.observed){fullHost.dataset.observed='1';const observer=new ResizeObserver(()=>{if(fullHost.isConnected)fit();else observer.disconnect();});observer.observe(fullHost);}}
  document.querySelector('.phone').classList.toggle('is-system',['home','notification','clip-card'].includes(state.page));
  document.querySelector('.phone').classList.toggle('is-auth',['login','register'].includes(state.page));
  if(state.dialog&&!reusedView)$('screen').querySelectorAll(':scope > :not(.overlay)').forEach(el=>el.inert=true);
  if(state.dialog&&!reusedView)$('screen').querySelector('[role="dialog"] button')?.focus({preventScroll:true});
  const [title,intro,tag,rules]=getSpec();
  const exceptionRules=rules.length===3&&rules.every((rule,i)=>rule.startsWith(['触发条件：','展示内容：','点击效果：'][i]));
  $('spec').innerHTML=`<h2>${title}</h2>${intro?`<p class="spec-intro">${intro}</p>`:''}<div class="spec-kicker"><span class="tag">${tag}</span>交互规则</div><ul class="${exceptionRules?'exception-rules':''}">${rules.map(rule=>exceptionRules?`<li><strong>${rule.slice(0,4)}</strong><p>${rule.slice(5)}</p></li>`:`<li>${rule}</li>`).join('')}</ul>`;
  const isClipSurface=state.origin==='clip';
  $('container-name').textContent=platform==='android'?(state.page==='landing'?'Android · 浏览器':state.page==='market'?'Android · 应用商店':['home','android-notification'].includes(state.page)?'Android · NFC 入口':'Momcozy App · Android'):['home','notification','clip-card'].includes(state.page)?'iOS · 系统入口':isClipSurface?'App Clip · 免登录':'Momcozy App';
  $('preview-step').textContent=title;
  const values=[
    ['当前设备',state.parameterFallback?(state.connected?'Air2 · 正常配网已连接':state.parameterFallback==='mac'?'Air2 · 未确定具体设备':'未识别型号与设备'):state.fromMarket?'未接续 NFC 目标':state.target?`${DEVICE.name} · 尾号 ${DEVICE.suffix}`:state.origin==='app'?'尚未添加设备':'等待 NFC 触碰'],
    ['主 App',state.scenario==='legacy'?'已安装 · 旧版':state.installed?'已安装':'未安装'],
    ['账号状态',state.scenario==='legacy'?'沿用旧版':state.logged?'已登录':'未登录',state.logged?'good':''],
    ['设备连接',state.scenario==='legacy'?'未进入 NFC 业务':state.fromMarket?'沿用已有功能':state.page==='control'&&state.origin!=='clip'?'沿用已有功能':state.connected?'已连接':isClipConnecting()?(state.stage===0?'扫描中':'连接中'):state.page==='guide'?(state.guideStatus==='found'?'已发现目标':'查找中'):state.page==='connecting'?'连接中':'未连接',state.page==='control'&&state.origin!=='clip'?'':state.connected?'good':''],
    ['账号绑定',state.scenario==='legacy'?'未查询':state.fromMarket?'未查询':state.bound?'已绑定当前账号':state.parameterFallback?'未查询':state.origin==='nfc'&&state.target&&!state.bindingChecked?(state.logged?'待查询':'登录后确认'):'未绑定',state.bound?'good':''],
    ['当前流程',state.scenario==='legacy'?'旧版兼容性核验':state.appManualSelection||state.fromMarket?'正式 App · 正常启动':state.origin==='clip'?(state.parameterFallback?'Clip 参数兜底':'Clip 蓝牙快控'):state.origin==='app'?'正式 App · 配网':'正式 App · NFC 接入'],
  ];
  $('context').innerHTML=values.map(([label,value,cls])=>`<div class="context-row"><span>${label}</span><b class="${cls||''}">${value}</b></div>`).join('');
  $('caption').textContent=['signed','signed-bound','unsigned','unsigned-bound'].includes(state.scenario)&&state.page==='success'?(state.flowComplete?'本次演示已结束。':'连接成功，本分支演示到此结束，后续沿用已有流程。'):state.origin==='clip'?(state.page==='store'?'系统安装横幅交互示意；下载期间保留快控页，进度为本地模拟。':'Clip 只建立蓝牙连接；请先打开设备，并将手机靠近设备。'):state.origin==='nfc'?'NFC 指定 Air2 · 尾号 1909；登录后判断：已绑定进控制页，未绑定进配网引导页。':['store','installing'].includes(state.page)?'安装过程为本地模拟。':'正式 App 流程复用原配网专项；不接续 Clip 的蓝牙连接或设备绑定。';
  if(platform==='android'&&state.page!=='success')$('caption').textContent=state.fromMarket?'应用商店安装后按正常入口打开，不接续本次 NFC 设备信息。':state.page==='landing'?'复用「落地页新增 SN」页面；此处为本地唤起／下载模拟。':`Android ${state.androidVersion} · ${state.androidVersion===17?'点按系统打开链接通知后继续':'已配置对应链接处理时进入 App；否则由浏览器打开'}`;
  if(state.scenario==='legacy'){$('caption').textContent=state.page==='legacy-web'?'下载页后续操作沿用原有逻辑。':'本演示采用网页承接方案；是否先进入网页，需核对旧版本关联配置。';if(state.page==='legacy-web')$('container-name').textContent=platform==='android'?'Android · 浏览器网页':'iOS · 浏览器网页';}
  if(state.parameterFallback&&state.page!=='success')$('caption').textContent=state.origin==='clip'?'NFC 已打开 Clip；设备信息异常时，引导使用正式 App 正常添加设备。':state.origin==='nfc'?(state.parameterFallback==='mac'?'Model 有效：登录后按该型号正常配网，不限定 NFC MAC。':'Model 无效：登录后回到已有首页，由用户自行选择设备。'):'下载后正常启动 App；选择设备与配网沿用已有流程。';
  if(state.origin==='clip'&&state.failure==='bluetooth'&&state.settingsRequested)$('caption').textContent='原型仅示意「去设置」操作；实际跳转与权限入口需真机验证，网页不修改本机权限。';
  scheduleInstallation();
  scheduleClipNotice();
  $('demo-authorize').hidden=!(state.origin==='clip'&&state.failure==='bluetooth'&&state.btAuthorization==='denied'&&!state.dialog);
  $('advance').hidden=!(paused&&(isClipConnecting()||state.installStatus==='downloading')&&!state.dialog);
  $('advance').textContent=state.installStatus==='downloading'?'推进下载':'下一阶段';
  $('motion').textContent=paused?'恢复自动推进':'暂停自动推进';$('motion').setAttribute('aria-pressed',String(paused));
}

function seedClip(){clearTimeout(installTimer);clearTimeout(clipNoticeTimer);clipNoticeTimer=null;Object.assign(state,{clipSuccessVisible:false,installStatus:'idle',installProgress:0,installDone:false,origin:'clip',target:true,targetBound:false,bindingChecked:false,nfcDestination:'',connected:true,clipUsed:true,installed:false,logged:false,bound:false,dialog:null,outcome:'success',loginError:false,reconnecting:false,settingsRequested:false,btAuthorization:'allowedAlways',parameterFallback:'',appManualSelection:false});}
function jump(step){
 if(state.parameterFallback&&state.origin==='nfc'&&['notification','login','guide','connecting','success','normal-entry'].includes(step)){
  if(step==='notification')go(step);
  else if(step==='login')go(step,{logged:false});
  else if(step==='guide'||step==='normal-entry'){state.logged=true;routeNfcTarget();}
  else if(step==='connecting'){state.logged=true;startConnection();}
  else go('success',{logged:true,connected:true,bound:true,bindingChecked:true});
  return;
 }
 if(platform==='android'&&androidJump(step))return;
 if(state.scenario==='clip'&&state.parameterFallback&&['login','normal-entry'].includes(step)){
  if(step==='login')openFullApp();
  else go('normal-entry',{origin:'app',appManualSelection:true,installed:true,logged:true,target:false,connected:false,bound:false,dialog:null,installStatus:'idle',flowComplete:true});
  return;
 }
 clearTimeout(timer);
 const scenario=state.scenario;const androidContext=platform==='android'?{androidVersion:state.androidVersion,region:state.region,browserFallback:state.browserFallback}:null;reset(scenario);if(androidContext)Object.assign(state,androidContext);
 if(scenario==='legacy'){state.target=true;go(step,{legacyOpenRequested:false});return;}
 if(scenario==='clip'){
   if(['notification','clip-card'].includes(step)){state.target=true;go(step);}
   else if(step==='control'){state.target=true;startConnection();}
   else if(step==='store'){seedClip();go(step);}
   else{Object.assign(state,{origin:'app',installed:true,installDone:true,logged:step!=='login',target:['guide','connecting','success','app-control'].includes(step),connected:['success','app-control'].includes(step),bound:['success','app-control'].includes(step)});go(step==='app-control'?'control':step);}
 }else{
   state.target=true;
   if(step==='notification'||step==='login')go(step);
   else{state.logged=true;if(step==='guide'||step==='control'&&state.targetBound)routeNfcTarget();else if(step==='connecting')startConnection();else{state.connected=true;state.bound=true;state.bindingChecked=true;go(step);}}
 }
}
function branch(kind){
 if(platform==='android'&&kind==='browser-fallback'){Object.assign(state,{target:true,origin:'nfc',browserFallback:true,fromMarket:false,dialog:null,parameterFallback:'',appManualSelection:false});go('landing');return;}
 if(['signed','signed-bound','unsigned','unsigned-bound'].includes(state.scenario)&&(kind==='invalid-mac'||kind==='invalid-model')){
  const scenario=state.scenario;reset(scenario);
  Object.assign(state,{parameterFallback:kind==='invalid-mac'?'mac':'model',target:false,origin:'nfc',targetBound:false});routeNfcTarget();return;
 }
 clearTimeout(timer);seedClip();Object.assign(state,{failure:'',guideTimeout:false});
 if(kind==='invalid-parameters'){go('clip-fallback',{parameterFallback:'parameters',target:false,connected:false,clipUsed:false,btAuthorization:'notDetermined'});return;}
 if(kind==='bluetooth')state.btAuthorization='denied';
 if(kind==='install'){go('store',{installStatus:'failed',installDone:false,installProgress:0,failure:''});return;}
 go('control',{connected:false,failure:kind});
}

document.addEventListener('click',event=>{
  const target=event.target.closest('button');if(!target||target.disabled)return;
  if(target.dataset.platform){switchPlatform(target.dataset.platform);return;}
  if(target.dataset.scenarioGroup){
    const group=target.dataset.scenarioGroup;
    if(state.scenario!==group&&state.scenario!==`${group}-bound`){
      const firstOption=$(target.getAttribute('aria-controls')).querySelector('[data-scenario]');
      reset(firstOption.dataset.scenario);
    }
    return;
  }
  if(target.dataset.scenario){reset(target.dataset.scenario);return;}
  if(target.dataset.step){jump(target.dataset.step);return;}
  if(target.dataset.branch){branch(target.dataset.branch);return;}
  runAction(target.dataset.action);
});
function runAction(action){
 if(action?.startsWith('qc-')){quickControlAction(action);return;}
 if(platform==='android'&&androidAction(action))return;
 switch(action){
 case 'open-clip':state.origin='clip';startConnection();break;
 case 'start-connection':startConnection();break;
 case 'show-guide':if(state.origin==='clip')startConnection();else go('guide',{connected:false,failure:state.failure||'not-found',guideTimeout:false});break;
 case 'dismiss-card':go('home');break;
 case 'open-nfc':if(state.installed)routeNfcTarget();else go('clip-card');break;
 case 'show-store':go('store');break;
 case 'close-store':go('control');break;
 case 'install':startInstallation();break;
 case 'cancel-install':go(state.page==='clip-fallback'?'clip-fallback':'store',{installStatus:'idle',installProgress:0});break;
 case 'launch-app':openFullApp();break;
 case 'login':login();break;
 case 'toggle-password':{
   const input=$('password'),button=document.querySelector('.auth-eye');
   const show=input.type==='password';input.type=show?'text':'password';
   button.setAttribute('aria-label',show?'Hide password':'Show password');button.setAttribute('aria-pressed',String(show));break;
 }
 case 'code-login':{
   const input=$('password'),button=document.querySelector('[data-action="code-login"]');
   const code=input.placeholder==='Password';input.type=code?'text':'password';input.value='';
   input.placeholder=code?'Verification code':'Password';input.setAttribute('aria-label',input.placeholder);
   button.textContent=code?'Password Login':'Verification Code Login';
   document.querySelector('.auth-primary').disabled=true;input.focus();break;
 }
 case 'forgot-password':$('auth-feedback').textContent='Enter your email or phone number to recover your account.';$('account').focus();break;
 case 'demo-social':$('account').focus();break;
 case 'toggle-auth':go(state.page==='register'?'login':'register',{loginError:false});break;
 case 'finish-flow':clearTimeout(timer);state.flowComplete=true;render();break;
 case 'enter-control':go('control');break;
 case 'support':state.dialog='support';render();break;
 case 'dismiss-support':state.dialog=null;render();break;
 case 'exit':if(state.page==='failure'&&state.failure==='install'){go('control');break;}clearTimeout(timer);state.dialog='exit';render();break;
 case 'dismiss-exit':state.dialog=null;render();schedule();break;
 case 'confirm-exit':{const was=state.page;state.dialog=null;if(was==='clip-fallback'){reset('clip');break;}if(state.origin==='clip'&&['control','store'].includes(was)){go('home',{connected:false,failure:''});break;}if(was==='connecting')go('guide',{connected:false});else if(['login','register','app-resume'].includes(was))go('app-resume');else if(state.bound)go('control');else if(state.origin==='app')go('home',{connected:false});else go('home',{connected:false});break;}
 case 'advance':if(state.installStatus==='downloading')advanceInstallation();else advance();break;
 case 'retry-connection':state.reconnecting=true;startConnection();break;
 case 'settings':state.settingsRequested=true;render();break;
 case 'bt-allow':state.btAuthorization='allowedAlways';startConnection();break;
 case 'bt-deny':state.btAuthorization='denied';go('control',{dialog:null,failure:'bluetooth',connected:false});break;
 case 'simulate-settings-authorized':state.settingsRequested=false;state.btAuthorization='allowedAlways';state.reconnecting=true;startConnection();break;
 case 'enable-bluetooth':state.reconnecting=true;startConnection();break;
 case 'retry-install':startInstallation();break;
 case 'resume-continue':if(!state.logged)go('login');else if(state.origin==='nfc')routeNfcTarget();else beginSetup();break;
 case 'touch':touch();break;
 }
}

window.addEventListener('message',event=>{
  const frame=$('screen').querySelector('.pairing-frame');
  if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.type!=='pairing-action')return;
  const action=event.data.action;
  if(action==='ready'){updatePairingFrame();return;}
  if(action==='search-state'||action==='guide-reset'){let changed=false;if(action==='search-state'&&state.guideStatus!==(event.data.status||'')){state.guideStatus=event.data.status||'';changed=true;}if(state.guideTimeout&&(event.data.active||action==='guide-reset')){state.guideTimeout=false;changed=true;}if(changed)render();return;}
  if(['exit','confirm-exit','dismiss-exit','start-connection','show-guide'].includes(action))runAction(action);
});
document.addEventListener('input',event=>{
 if(!event.target.closest('#auth-form'))return;
 document.querySelector('.auth-primary').disabled=!($('account').value.trim()&&$('password').value.trim());
});
document.addEventListener('submit',event=>{
 if(event.target.id!=='auth-form')return;
 event.preventDefault();login();
});
$('touch').addEventListener('click',touch);
$('motion').addEventListener('click',()=>{paused=!paused;render();schedule();});
document.addEventListener('keydown',event=>{
  const dialog=$('screen').querySelector('[role="dialog"]');
  if(!dialog)return;
  if(event.key==='Escape'){
    if(state.dialog==='clip-bluetooth-request'){event.preventDefault();return;}
    event.preventDefault();
    if(state.dialog){state.dialog=null;render();schedule();}
    else go('control');
  }
  if(event.key==='Tab'){
    const items=[...dialog.querySelectorAll('button:not(:disabled),a[href],input')];
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
reset();

if(new URLSearchParams(location.search).get('platform')==='android')switchPlatform('android');
