// Android shares the formal App login, binding routes and accepted pairing module.
// All NFC, browser, market and install actions here are local simulations.
function renderPlatformChrome(){
 const isAndroid=platform==='android';
 document.body.dataset.platform=platform;
 $('ios-workspace').setAttribute('aria-label',isAndroid?'Android 流程':'iOS 流程');
 document.querySelector('.phone').classList.toggle('is-android',isAndroid);
 document.querySelector('.phone').classList.toggle('is-android-home',isAndroid&&['home','android-notification'].includes(state.page));
 document.querySelector('.local-note').textContent=isAndroid?'本地模拟 · Android NFC、唤起与下载':'本地模拟 · NFC、蓝牙、安装与正式配网';
 document.querySelectorAll('.platform-switch [data-platform]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.platform===platform)));
 const first=$('uninstalled-scenario');
 first.dataset.scenario=isAndroid?'download':'clip';
 first.querySelector('small').textContent=isAndroid?'进入已有下载落地页':'Clip 蓝牙快控';
 $('android-options').hidden=!isAndroid;
 $('legacy-scenario').hidden=false;
 if(isAndroid){$('android-version').value=String(state.androidVersion||16);$('android-region').value=state.region||'global';}
 document.querySelector('.scope-note p').innerHTML=isAndroid?'已安装：登录与绑定分流复用 iOS 的业务逻辑。<br>未安装：复用原下载落地页。<br>配网、控制及下载后续均沿用已有流程。':iosScopeMarkup;
 document.querySelector('.technical-note p').innerHTML=isAndroid?'NFC 使用包含设备信息的 HTTPS URI。已安装且链接处理正常时进入 App；否则由浏览器打开已有落地页，不能仅凭网页可靠判断是否安装。Android 16 起网址标签按 ACTION_VIEW 分发，需 App Links；更早版本还需兼容 NFC Intent。Android 17 起先显示打开链接通知。域名关联、用户默认打开设置与厂商差异需实机验收。本方案不接入安装参数恢复，应用商店安装后普通启动不带本次 model／MAC／SN。Google Play 有 Install Referrer 能力，但不属于本期方案。':iosTechnicalMarkup;
 document.querySelector('.entry-sources').innerHTML=isAndroid?'<a href="https://developer.android.com/develop/connectivity/nfc/nfc" target="_blank" rel="noreferrer">Android · NFC 与版本差异 ↗</a><a href="https://developer.android.com/training/app-links" target="_blank" rel="noreferrer">Android · App Links ↗</a><a href="https://developer.android.com/training/app-links/verify-applinks" target="_blank" rel="noreferrer">Android · 链接验证与默认打开 ↗</a><a href="android-nfc-spec.md" target="_blank" rel="noreferrer">Android · 接入范围与安装后边界 ↗</a>':iosSourcesMarkup;
 if(state.scenario==='legacy'){
  document.querySelector('.scope-note p').innerHTML='旧版 App 的网页承接方案。<br>复用已有下载落地页。<br>系统分发与二次唤起需分别验收。';
  document.querySelector('.technical-note p').textContent=isAndroid?'Android 的链接分发与旧版 App 内设备路由是两件事。需核对旧安装包的 Intent Filter、App Links 验证和默认打开设置，以及收到 URL 后的处理代码；旧版接收链接后不会因为不支持 NFC 就由系统自动回到网页。Android 15 及更早版本还需核对 NFC Intent／AAR。实际落点待真机验证。':'AASA 匹配规则不等于旧版已实现 /clip/ 设备路由。原技术文档记录入口默认按 .apps 处理；旧版未知路径的真实落点尚未提供。需核对版本、签名关联、冷／热启动回调及网页响应。';
 }
}
function androidFlow(){
 const first=['android-entry',state.androidVersion===17?'NFC 打开链接通知':'NFC 识别链接',state.androidVersion===17?'点按系统通知继续':'系统分发 HTTPS 链接','新增'];
 if(state.scenario==='legacy')return [first,...flows.legacy.slice(1)];
 if(state.scenario==='download')return [first,['landing','下载落地页','复用落地页新增 SN 页面','复用'],['market','应用商店下载','沿用现有地区分发策略','复用'],['normal-launch','正常打开 App','注册／登录 · 不接续 NFC 目标','复用']];
 const steps=[first,...flows[state.scenario].slice(1)];
 if(state.browserFallback)steps.splice(1,0,['landing','浏览器落地页','点击原按钮尝试打开 App','复用']);
 return steps;
}
function androidTouch(){
 clearTimeout(timer);
 Object.assign(state,{target:true,origin:'nfc',dialog:null,failure:'',connected:false,bound:false,bindingChecked:false,nfcDestination:'',fromMarket:false,flowComplete:false,browserFallback:false,legacyOpenRequested:false,parameterFallback:'',appManualSelection:false});
 // A fresh NFC touch after installation carries the target again.
 if(state.installed&&state.scenario!=='legacy')state.scenario=(state.logged?'signed':'unsigned')+(state.targetBound?'-bound':'');
 if(state.androidVersion===17)go('android-notification');else androidOpenLink();
}
function androidOpenLink(){
 if(state.installed)routeNfcTarget();else go('landing');
}
function androidHomeIcon(name,label){
 const art={
  store:'<path d="M13 19h30l-2 26H15z" fill="white"/><path d="M21 20v-4a7 7 0 0 1 14 0v4" fill="none" stroke="white" stroke-width="3"/><path d="m23 28-4 5 4 5m10-10 4 5-4 5m-4-12-3 17" fill="none" stroke="#e95a91" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  gallery:'<g fill="white"><ellipse cx="28" cy="18" rx="5" ry="10"/><ellipse cx="28" cy="38" rx="5" ry="10"/><ellipse cx="18" cy="28" rx="10" ry="5"/><ellipse cx="38" cy="28" rx="10" ry="5"/><ellipse cx="28" cy="18" rx="5" ry="10" transform="rotate(45 28 28)"/><ellipse cx="28" cy="38" rx="5" ry="10" transform="rotate(45 28 28)"/><ellipse cx="18" cy="28" rx="10" ry="5" transform="rotate(45 28 28)"/><ellipse cx="38" cy="28" rx="10" ry="5" transform="rotate(45 28 28)"/></g><circle cx="28" cy="28" r="4" fill="#fa7d90"/>',
  play:'<path d="M16 11v34l18-17z" fill="#35c671"/><path d="m16 11 23 13-5 4z" fill="#4fbded"/><path d="m16 45 23-13-5-4z" fill="#f7cc45"/><path d="m34 28 5-4 7 4-7 4z" fill="#f46062"/>',
  google:'<g fill="#fff9"><rect x="9" y="9" width="38" height="38" rx="10"/></g><circle cx="20" cy="21" r="5" fill="#4285f4"/><path d="m31 16 9 5-9 5z" fill="#34a853"/><circle cx="20" cy="36" r="5" fill="#ea4335"/><circle cx="36" cy="36" r="5" fill="#fbbc04"/>',
  phone:'<path d="M18 12c-3 0-7 5-6 9 3 12 12 21 24 23 4 1 9-4 9-7l-10-6-5 5c-5-2-9-6-11-11l5-4-6-9z" fill="white"/>',
  messages:'<path d="M11 15a5 5 0 0 1 5-5h24a5 5 0 0 1 5 5v21a5 5 0 0 1-5 5H23l-11 7V36z" fill="white"/><path d="M19 21h18M19 28h18M19 35h11" stroke="#368df4" stroke-width="2.5" stroke-linecap="round"/>',
  internet:'<circle cx="28" cy="28" r="15" fill="#fff"/><ellipse cx="28" cy="28" rx="24" ry="7" transform="rotate(-31 28 28)" fill="none" stroke="#d4b9ff" stroke-width="4"/><path d="M16 21a15 15 0 0 1 24 15" fill="none" stroke="white" stroke-width="2"/>',
  camera:'<rect x="9" y="16" width="38" height="28" rx="7" fill="white"/><path d="m19 16 3-5h12l3 5" fill="white"/><circle cx="28" cy="30" r="10" fill="#dc536e"/><circle cx="28" cy="30" r="7" fill="#482f49"/><circle cx="28" cy="30" r="3.5" fill="#7583a6"/><circle cx="40" cy="22" r="2" fill="#ef9bae"/>'
 };
 return `<div class="android-app"><span class="android-app-icon icon-${name}">${name==='momcozy'?'<img src="assets/mark.svg" alt="">':`<svg viewBox="0 0 56 56" aria-hidden="true">${art[name]}</svg>`}</span>${label?`<small>${label}</small>`:''}</div>`;
}
function androidHome(notification=false){
 return `<div class="android-home" aria-label="三星 One UI 风格主屏"><section class="android-weather" aria-label="天气组件"><div class="android-weather-main"><svg viewBox="0 0 72 64" aria-hidden="true"><g stroke="#ffe4a2" stroke-width="3" stroke-linecap="round"><path d="M29 5v5M29 45v5M7 28h5M47 28h5M13 12l4 4M42 41l4 4M13 44l4-4M42 15l4-4"/></g><circle cx="29" cy="28" r="13" fill="#ffdb83"/><path d="M29 51h27a11 11 0 0 0 0-22 15 15 0 0 0-28 6 8 8 0 0 0 1 16" fill="#fff"/></svg><span>23°</span></div><div class="android-weather-location">北京 <svg viewBox="0 0 12 14" aria-hidden="true"><path d="M6 13s5-5 5-8A5 5 0 0 0 1 5c0 3 5 8 5 8" fill="currentColor"/><circle cx="6" cy="5" r="1.7" fill="#8aa9cc"/></svg></div><p>晴　24° / 16°</p><small>11月5日 周四</small></section><div class="android-launcher-bottom"><div class="android-search" aria-label="Google 搜索栏示意"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.2c0-.6-.1-1.3-.2-1.9H12v3.6h5a4.3 4.3 0 0 1-1.9 2.8v2.4h3.1c1.8-1.6 2.8-4 2.8-6.9" fill="#4285f4"/><path d="M12 21c2.5 0 4.7-.8 6.2-2.3l-3.1-2.4c-.8.5-1.8.8-3.1.8-2.4 0-4.5-1.6-5.2-3.8H3.6v2.5A9.4 9.4 0 0 0 12 21" fill="#34a853"/><path d="M6.8 13.3a5.7 5.7 0 0 1 0-3.5V7.4H3.6a9.4 9.4 0 0 0 0 8.4z" fill="#fbbc05"/><path d="M12 5.8c1.4 0 2.6.5 3.5 1.4l2.7-2.7A9.1 9.1 0 0 0 12 2a9.4 9.4 0 0 0-8.4 5.4l3.2 2.4C7.5 7.5 9.6 5.8 12 5.8" fill="#ea4335"/></svg><span></span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" fill="#4285f4"/><path d="M6 10a6 6 0 0 0 12 0" fill="none" stroke="#34a853" stroke-width="2"/><path d="M12 17v5" stroke="#4285f4" stroke-width="2"/><path d="M6 10a6 6 0 0 0 2 4.5" fill="none" stroke="#fbbc05" stroke-width="2"/></svg><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H5a2 2 0 0 0-2 2v3M16 4h3a2 2 0 0 1 2 2v3M3 15v3a2 2 0 0 0 2 2h3M16 20h3a2 2 0 0 0 2-2v-3" fill="none" stroke="#4285f4" stroke-width="2.5"/><circle cx="12" cy="12" r="4" fill="#34a853"/><circle cx="19" cy="19" r="2" fill="#ea4335"/></svg></div><div class="android-app-grid">${androidHomeIcon('store','应用商店')}${androidHomeIcon('gallery','相册')}${androidHomeIcon('play','Play 商店')}${state.installed?androidHomeIcon('momcozy','Momcozy'):androidHomeIcon('google','Google')}</div><div class="android-page-dots" aria-hidden="true"><svg viewBox="0 0 10 10"><path d="m1 5 4-4 4 4v4H6V6H4v3H1z" fill="currentColor"/></svg><i></i><i></i></div><div class="android-dock">${androidHomeIcon('phone')}${androidHomeIcon('messages')}${androidHomeIcon('internet')}${androidHomeIcon('camera')}</div></div>${notification?`<button class="android-link-notification" data-action="android-open-link"><span>打开链接</span><strong>qr.momcozy.com</strong><small>点按以打开</small></button>`:''}</div>`;
}
function androidLanding(){
 const params=new URLSearchParams({view:'landing',region:state.region||'global',sn:'',model:DEVICE.name,mac:DEVICE.mac});
 return `<div class="app-page android-browser"><div class="android-browser-bar"><span>⌂</span><span>🔒 qr.momcozy.com</span><span>⋮</span></div><iframe class="download-frame" title="${state.scenario==='legacy'?'旧版 App · 已有下载落地页':'落地页新增 SN'} · ${state.region==='cn'?'中国区':'非中国区'}" src="download-module/index.html?${params}"></iframe></div>`;
}
function androidLegacySpec(){
 return ['Android · 旧版 App 兼容','旧版也可能接收 NFC 链接，但不一定具备对应的设备路由。','待验证',[
 '需分别判断：系统是否把链接交给旧版，以及旧版是否能解析 NFC 的 model／MAC。仅已安装不足以确认两者。',
 '链接交给浏览器：复用已有下载落地页，点击原按钮尝试唤起／下载；当前演示这条条件路径。',
 '链接交给旧版：按旧版已有代码处理，实际落点待验证；系统不会因旧版不认识 NFC 参数就自动回到下载网页。',
 '02／03 的登录和绑定分流只适用于已支持 NFC 设备路由的版本，不能直接套用到旧版。',
 `当前系统为 Android ${state.androidVersion}，这是手机系统版本，区别于 App 版本。需核对旧包的 Intent Filter、App Links 验证、默认打开及冷／热启动 URL 处理。`
 ],'先用旧版安装包验证实际分发和页面；不能仅靠网站关联更新为旧包补上设备路由。'];
}
function androidMarket(){
 const installed=state.installDone;
 return `<div class="app-page android-market">${nav(state.region==='cn'?'应用市场':'Google Play','android-back-landing')}<div class="market-content"><div class="market-app"><img src="assets/auth-logo.svg" alt="Momcozy"><div><h1>Momcozy</h1><p>Momcozy</p></div></div><p class="market-description">${installed?'已安装':'在应用商店获取 Momcozy App'}</p>${button(installed?'打开':'安装',installed?'android-launch':'android-install')}<div class="market-preview"><img src="download-module/assets/hero-global.png" alt="Momcozy 品牌展示"></div></div></div>`;
}
function androidNormalEntry(){
 return `<div class="app-page">${nav('Momcozy',null)}<div class="normal-entry-placeholder"><img src="assets/auth-logo.svg" alt="Momcozy"><h2>App 首页</h2><p>复用已有首页与后续流程</p></div></div>`;
}
function androidSpec(){
 if(['home','android-notification'].includes(state.page))return ['Android · NFC 入口','使用同一设备 HTTPS 链接，根据系统链接处理结果进入 App 或网页。','新增',[
 '已安装且链接处理正常：进入 App，未登录先登录，再查询该设备是否已绑定当前账号。',
 '已绑定进对应控制页；未绑定按 NFC 的 model 进入原配网准备页，并按 MAC 查找指定设备。',
 '未安装或链接由浏览器处理：打开已有下载落地页，不提供 App Clip。',
 state.androidVersion===17?'Android 17：读到网址标签后显示「打开链接」通知，点按后继续。通知外观由系统决定，预览仅为示意。':'当前演示 Android 16：网址标签按 ACTION_VIEW 分发；直达 App 需要正确配置 App Links 与默认打开。'
 ],'系统通知、选择器与直接打开的表现取决于 Android 版本和设备配置，不能照搬 iOS 的固定入口样式。'];
 if(state.page==='landing')return ['Android · 已有下载落地页','复用「落地页新增 SN」的中国区／非中国区页面。','复用',[
 '完整保留原头图、品牌、按钮及地区信息；有 SN 时展示并可复制。本次 NFC 仅有 model／MAC，无 SN 时沿用原规则隐藏。',
 state.installed?'此分支为已安装但链接由浏览器打开：点击原下载按钮尝试唤起 App，携带本次 NFC 目标并执行登录与绑定分流。':'未安装 App：点击原下载按钮进入现有下载流程，按原地区策略打开对应应用商店。',
 '本地点击只模拟唤起与下载，不检查真实安装状态，也不执行真实安装。'
 ],'未安装经应用商店下载后，正常打开与登录，不自动进入本次 NFC 设备的配网或控制页。'];
 if(state.page==='market')return ['Android · 应用商店下载','复用现有应用商店分发流程；当前为交互占位。','复用',[
 '非中国区示意 Google Play，中国区示意现有应用市场；具体市场选择沿用现有策略。',
 '应用商店负责下载和安装；本地点击「安装」仅切换为已安装状态。',
 '普通商店安装不会自动把原链接设备参数交给首次启动；本方案不实现安装后参数恢复。',
 '点击「打开」按正常入口启动 App，注册／登录后走常规流程，不自动打开目标配网页或控制页。'
 ],'安装后打开时清空本次 NFC 目标，不自动绑定设备。'];
 if(state.fromMarket)return ['Android · 正常打开 App','应用商店安装后按正常入口进入，后续复用已有 App 流程。','复用',[
 '未登录先完成原有注册／登录。',
 '当前没有本次 NFC 的 model／MAC／SN，登录后不自动进入指定设备的配网或控制页。',
 '演示登录后仅展示已有首页占位，本需求不重新定义首页及后续添加设备流程。'
 ],'本期不做安装后参数恢复；这属于方案边界，不代表 Android 技术上永远无法实现。'];
 if(['login','register'].includes(state.page))return ['Android · 注册／登录','登录流程直接复用现有功能。','复用',[
 '交互规则及规范与现有登录页一致，此处不再赘述。',
 '保留本次 NFC 目标。登录成功后，已绑定当前账号的设备进入控制页；未绑定的设备进入对应型号的配网准备页。'
 ]];
 return null;
}
function androidJump(step){
 if(!['android-entry','landing','market','normal-launch'].includes(step))return false;
 const scenario=state.scenario,androidVersion=state.androidVersion,region=state.region,browserFallback=state.browserFallback;
 reset(scenario);Object.assign(state,{androidVersion,region,browserFallback,target:step!=='android-entry'});
 if(step==='android-entry')go('home');
 if(step==='landing')go('landing');
 if(step==='market')go('market');
 if(step==='normal-launch')androidAction('android-launch');
 return true;
}
function androidAction(action){
 switch(action){
 case 'android-open-link':androidOpenLink();return true;
 case 'android-download':if(state.scenario==='legacy'){state.legacyOpenRequested=true;render();}else if(state.installed)routeNfcTarget();else go('market');return true;
 case 'android-back-landing':go('landing');return true;
 case 'android-install':state.installed=true;state.installDone=true;render();return true;
 case 'android-launch':go('login',{origin:'app',installed:true,installDone:true,logged:false,fromMarket:true,target:false,targetBound:false,bound:false,bindingChecked:false,nfcDestination:'',connected:false});return true;
 default:return false;
 }
}
document.addEventListener('change',event=>{
 if(platform!=='android')return;
 if(event.target.id==='android-version'){state.androidVersion=Number(event.target.value);go('home',{dialog:null,legacyOpenRequested:false});}
 if(event.target.id==='android-region'){state.region=event.target.value;render();}
});
window.addEventListener('message',event=>{
 if(platform!=='android'||event.origin!==location.origin||event.data?.type!=='android-landing-action')return;
 const frame=$('screen').querySelector('.download-frame');
 if(!frame||event.source!==frame.contentWindow)return;
 if(event.data.action==='download')androidAction('android-download');
});
