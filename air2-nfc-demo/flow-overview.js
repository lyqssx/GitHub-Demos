'use strict';

// A separate reading surface: opening or switching diagrams does not change demo state.
(() => {
 const dialog = document.getElementById('flow-overview');
 const content = document.getElementById('flow-overview-content');
 const trigger = document.getElementById('open-flow-overview');
 let chartPlatform = 'ios';
 const node = (x,y,w,title,detail='',kind='') => `<g class="map-node ${kind}"><rect x="${x}" y="${y}" width="${w}" height="${detail?50:38}" rx="8"/><text x="${x+w/2}" y="${y+(detail?21:24)}" class="map-title">${title}</text>${detail?`<text x="${x+w/2}" y="${y+39}" class="map-detail">${detail}</text>`:''}</g>`;
 const decision = (x,y,title) => `<g class="map-decision"><path d="M${x} ${y-34}L${x+81} ${y}L${x} ${y+34}L${x-81} ${y}Z"/><text x="${x}" y="${y+5}" class="map-title">${title}</text></g>`;
 const line = (d,arrow,label='',x=0,y=0,dashed=false) => `<path class="map-line${dashed?' is-dashed':''}" d="${d}" marker-end="url(#${arrow})"/>${label?`<text class="map-label" x="${x}" y="${y}">${label}</text>`:''}`;
 const svg = (id,label,body,height=668) => `<svg class="overview-map" viewBox="0 0 460 ${height}" role="img" aria-label="${label}"><title>${label}</title><defs><marker id="${id}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L7 4L1 7" fill="none" stroke="#b8a8b0" stroke-width="1.3"/></marker></defs>${body}</svg>`;
 function installed(os) {
  const a=`${os}-installed-arrow`;
  return svg(a,`${os==='ios'?'iOS':'Android'} 已安装 App：NFC 打开 App，未登录先登录，再判断设备是否绑定当前账号`,[
   node(125,0,210,'碰触设备 NFC'),
   line('M230 38V61',a),
   node(65,62,330,os==='ios'?'系统 NFC 通知':'系统分发 NFC 链接',os==='ios'?'点按通知':'Android 17 起先点按「打开链接」'),
   line('M230 112V135',a),node(125,136,210,'进入正式 App'),
   line('M230 174V194',a),decision(230,230,'是否已登录？'),
   line('M149 230H85V329H113',a,'已登录',94,218),
   line('M311 230H368V269',a,'未登录',365,218),
   node(288,270,160,'注册／登录'),line('M368 308V329H347',a),
   node(114,310,232,'查询当前账号的绑定关系'),
   line('M230 348V378',a),decision(230,413,'是否已绑定？'),
   line('M149 413H104V479',a,'已绑定',102,400),
   line('M311 413H357V479',a,'未绑定',358,400),
   node(9,480,190,'对应设备已有控制页','后续沿用原流程','is-result'),
   node(258,480,198,'对应型号配网准备页','按 model 选择，按 MAC 查找'),
   line('M357 530V554',a),node(258,555,198,'复用原配网流程'),
   line('M357 593V617',a),node(258,618,198,'连接成功 → Done → 控制页','','is-result')
  ].join(''));
 }
 function clip() {
  const a='ios-uninstalled-arrow';
  return svg(a,'iOS 未安装 App：NFC 直达 App Clip 卡片、快控页内蓝牙连接与可选下载',[
   node(79,62,232,'碰触设备 NFC','直接展示系统 App Clip 卡片'),line('M195 112V135',a),
   node(79,136,232,'App Clip 卡片','点按「打开」'),line('M195 186V209',a),
   node(79,210,232,'进入快控页 · 免登录'),line('M195 248V271',a),
   node(79,272,232,'快控页顶部提示扫描、连接','请打开设备，并靠近手机'),
   line('M195 322V361',a,'成功',215,347),
   node(79,362,232,'三模式 · 左右调档 · 启停','连接成功提示自动消失','is-result'),
   line('M311 297H377V361',a,'失败',368,286),
   node(323,362,128,'未连接设备','重新扫描'),
   line('M387 362V339H444V257H285V271',a,'重试',424,333,true),
   line('M195 412V447',a,'可选下载',238,436,true),
   node(79,448,232,'在 Clip 内获取正式 App','系统安装横幅'),line('M195 498V521',a),
   node(79,522,232,'安装后打开正式 App'),line('M195 560V583',a),
   node(79,584,232,'注册／登录 → 完整配网','复用已有正式 App 流程','is-result')
  ].join(''));
 }
 function download() {
  const a='android-uninstalled-arrow';
  return svg(a,'Android 未安装 App：NFC 打开下载落地页，经应用商店安装后正常启动，不接续目标设备',[
   node(79,0,302,'碰触设备 NFC'),line('M230 38V69',a),
   node(79,70,302,'系统分发 NFC 链接','Android 17 起先点按「打开链接」'),line('M230 120V151',a),
   node(79,152,302,'浏览器打开已有下载落地页','复用「落地页新增 SN」页面'),line('M230 202V233',a),
   node(79,234,302,'点击原下载入口'),line('M230 272V303',a),
   node(79,304,302,'应用商店下载、安装','沿用原有地区渠道'),line('M230 354V385',a),
   node(79,386,302,'正常打开正式 App','不接续本次 NFC 设备参数'),line('M230 436V467',a),
   node(79,468,302,'按原流程注册／登录'),line('M230 506V537',a),
   node(79,538,302,'进入 App 原有常规流程','不自动进入目标配网或控制页','is-result')
  ].join(''));
 }
 function legacyOverview(os){
  const ios=os==='ios',a=`${os}-legacy-arrow`;
  const diagram=svg(a,'已安装旧版 App：系统分发给 App 时按旧代码处理，分发给网页时才进入网页兜底',[
   node(5,105,140,'碰触 NFC'),line('M145 124H185',a),decision(267,124,'链接由谁处理？'),
   line('M348 124H398V54H459',a,'App 接管',412,42),
   node(460,35,230,ios?'旧版 App 接收 /clip/':'旧版 App 接收链接'),line('M690 54H739',a),
   node(740,35,230,'按旧代码兜底','实际页面待验证','is-result'),
   line('M348 124H398V204H459',a,'网页处理',413,192),
   node(460,185,230,'浏览器打开 /clip/ 网页'),line('M690 204H739',a),
   node(740,185,230,'已有下载落地页','点击原按钮尝试唤起','is-result')
  ].join(''),260).replace('class="overview-map" viewBox="0 0 460 260"','class="overview-legacy-map" viewBox="0 0 980 260"');
  return `<section class="overview-legacy"><h3>已安装旧版 App · 落地页兼容方案</h3><p>本 Demo 展示下方网页承接路径；前提是链接实际进入网页。上方 App 直达仍可能发生，${ios?'安装状态与域名关联':'旧包链接声明、验证与默认打开设置'}需要同时核对。</p><div class="overview-legacy-scroll">${diagram}</div><p>${ios?'Universal Link 关联匹配时可直接打开 App，不必先经过网页。':'系统可能将链接直接交给已匹配的旧版 App；旧版不支持 NFC 参数时，不保证自动回到下载网页。'}网页按钮的唤起方式需兼容旧版，不能把请求发出视为成功进入设备业务。</p><a href="${ios?'ios-legacy-compatibility.md':'android-nfc-spec.md#旧版-app-兼容'}" target="_blank" rel="noreferrer">查看核验依据与待确认项 ↗</a></section>`;
 }
 function renderOverview() {
  const ios=chartPlatform==='ios';
  dialog.querySelectorAll('[data-chart-platform]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.chartPlatform===chartPlatform)));
  content.innerHTML=`<section class="overview-lane" aria-labelledby="uninstalled-flow-title"><header><span>01</span><div><h3 id="uninstalled-flow-title">未安装 App</h3><p>${ios?'App Clip 免登录快控':'下载落地页 → 应用商店'}</p></div></header>${ios?clip():download()}<p class="overview-lane-note">${ios?'蓝牙授权与可用状态通过后开始扫描；未连接时不可控制，重试留在快控页。Clip 不建立账号绑定。参数异常时进入下载兜底页，安装后正常启动 App，由用户选择设备并添加。':'本期不实现安装后参数恢复。商店安装后正常打开与登录；再次碰 NFC，才重新获得目标设备信息。'}</p></section><section class="overview-lane" aria-labelledby="installed-flow-title"><header><span>02</span><div><h3 id="installed-flow-title">已安装 App · 支持 NFC 路由</h3><p>判断登录状态及当前账号的绑定关系</p></div></header>${installed(chartPlatform)}<p class="overview-lane-note">${ios?'配网准备页及后续完整复用。参数异常：未登录先登录；Model 有效、MAC 无效时按型号正常配网，Model 无效时回首页自行选择设备。':'直达 App 以链接配置正常为前提。参数异常同 iOS：未登录先登录；Model 有效、MAC 无效时按型号配网，Model 无效时回首页自行选择。由浏览器处理时沿用原下载页。'}</p></section>${legacyOverview(chartPlatform)}<footer class="overview-footnote">${ios?'入口说明：未安装 App 时，NFC 直达系统 App Clip 卡片，点击「打开」启动。需配置匹配的 App Clip 体验，真机验收；已安装 App 按对应分支处理。':'版本说明：Android 16 起网址标签按 ACTION_VIEW 分发；Android 17 起先显示打开链接通知。旧版本需兼容 NFC Intent，具体表现按目标机型验证。'}</footer>`;
 }
 function openOverview(){chartPlatform=platform;renderOverview();dialog.showModal();dialog.scrollTop=0;}
 trigger.addEventListener('click',openOverview);
 document.getElementById('close-flow-overview').addEventListener('click',()=>dialog.close());
 // Let the native modal manage Escape and focus, independently of phone dialogs.
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 dialog.addEventListener('click',event=>{
  const tab=event.target.closest('[data-chart-platform]');
  if(tab){chartPlatform=tab.dataset.chartPlatform;renderOverview();dialog.scrollTop=0;}
  if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}
 });
 // Keep the automatic introduction once per tab session, including reloads.
 // A fresh tab gets its own session; the header trigger always stays available.
 const overviewSeenKey='momcozy:nfc-flow-overview-seen';
 let overviewSeen=false;
 try{overviewSeen=sessionStorage.getItem(overviewSeenKey)==='1';}catch{}
 if(!overviewSeen){
  openOverview();
  try{sessionStorage.setItem(overviewSeenKey,'1');}catch{}
 }
})();
