import {React,jsxRuntime as r,ReactDOM,ConnectingProgress,ConnectingFailed,SetupGuide,ExitDialog} from './baseline.js?v=11';
const params=new URLSearchParams(location.search);
let config={view:params.get('view'),stage:Number(params.get('stage')||0),paused:params.get('paused')==='1',clip:params.get('clip')==='1',targetMac:params.get('targetMac')||'',model:params.get('model')||'Air2'};
const post=(action,extra={})=>parent.postMessage({type:'pairing-action',action,...extra},location.origin);
const exit=()=>post('exit');
const next=()=>post('start-connection');
const searchState=(active,status)=>post('search-state',{active,status});
const sourceName='配网专项-全面优化';
function Embed(){
  const [current,setCurrent]=React.useState(config);
  const [support,setSupport]=React.useState(false);
  React.useEffect(()=>{
    if(!support&&!current.dialog)return;
    const modal=document.querySelector('[role="dialog"]');
    modal?.querySelector('button')?.focus();
    const keydown=event=>{
      if(event.key==='Escape'){event.preventDefault();support?setSupport(false):post('dismiss-exit');}
      if(event.key==='Tab'&&modal){const buttons=[...modal.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
    };
    addEventListener('keydown',keydown);return()=>removeEventListener('keydown',keydown);
  },[support,current.dialog]);
  React.useEffect(()=>{
    const receive=event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='pairing-config')return;config=event.data.config;setCurrent(config);};
    addEventListener('message',receive);post('ready');return()=>removeEventListener('message',receive);
  },[]);
  const openSupport=()=>{post('guide-reset');setSupport(true);};
  let page;
  if(current.view==='connecting')page=r.jsx(ConnectingProgress,{paused:true,progress:[34,68,98][current.stage]||34,clip:current.clip,onExit:exit,onPrev:exit,onSupport:openSupport,deviceImage:'air2-pair.png',deviceAlt:'Air2 Breast Pump'});
  else if(current.view==='failure')page=r.jsx(ConnectingFailed,{deviceImage:'air2-pair.png',deviceName:'Air2',onBack:exit,onRetry:()=>post('show-guide'),onContactSupport:openSupport});
  else page=r.jsx(SetupGuide,{quickControl:current.clip,targetMac:current.targetMac,pairingMode:'bluetooth',guideLayout:'single',selectedDeviceName:current.model,reviewPaused:current.paused||!!current.dialog||support,cloudHighlight:current.guideTimeout?'timeout':null,onNext:next,onPrev:exit,onBackToStart:exit,onContactSupport:openSupport,onSearchStateChange:searchState,onSearchTimeoutReset:()=>post('guide-reset')},current.guideToken||0);
  return r.jsxs('div',{style:{height:'100%',position:'relative'},'data-reuse-source':sourceName,children:[r.jsx('div',{style:{height:'100%'},inert:support||!!current.dialog,children:page}),current.dialog==='exit'?r.jsx('div',{role:'dialog','aria-modal':true,'aria-label':current.clip?'退出蓝牙连接':'退出配网流程',children:r.jsx(ExitDialog,{title:current.clip?'暂时退出连接？':'退出配网流程？',description:current.view==='connecting'?'退出后返回设备操作指引，可重新尝试连接。':'退出后结束本次尝试，可再次碰触 NFC 继续。',onConfirm:()=>post('confirm-exit'),onCancel:()=>post('dismiss-exit')})}):null,support?r.jsx('div',{className:'pairing-support',children:r.jsxs('section',{role:'dialog','aria-modal':true,'aria-labelledby':'support-title',children:[r.jsx('h2',{id:'support-title',children:'需要帮助？'}),r.jsx('p',{children:'可前往 App「我的 → 帮助与客服」获取帮助。'}),r.jsx('button',{autoFocus:true,onClick:()=>setSupport(false),children:'返回'})]})}):null]});
}
function fit(){const root=document.getElementById('pairing-root');const scale=innerWidth/375;root.style.height=(innerHeight/scale)+'px';root.style.transform=`scale(${scale})`;}
addEventListener('resize',fit);fit();
ReactDOM.createRoot(document.getElementById('pairing-root')).render(r.jsx(Embed,{}));
