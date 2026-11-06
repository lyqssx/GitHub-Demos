'use strict';
const STORY_KEY='momcozy:air2:completed-uses:v1';
const STORY_LAST_KEY='momcozy:air2:last-feature:v2';
let storyMemory=0,storyLastMemory='',storyLayer=null,storyFrame=null,storyFocus=null,storyFeature=null,storyPaused=false,storyPhase=0,storyReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const STORY_FEATURES=[
 {id:'milk',tag:'实时奶量',title:'连接 App，\n实时查看奶量',copy:'左右奶量实时呈现，吸乳进度一目了然。',benefit:'实时查看左右奶量'},
 {id:'rhythm',tag:'韵律吸乳',title:'选好韵律，\n自动切换解放双手',copy:'选择适合自己的韵律，让模式与档位随阶段变化。',benefit:'探索韵律吸乳'},
 {id:'dual',tag:'更顺手的控制',title:'连接 App，\n双边一滑就调',copy:'滑动快速调节档位，也能同时调整左右两侧。',benefit:'体验完整设备控制'},
 {id:'report',tag:'单次吸乳报告',title:'在 App 中，\n查看完整吸乳报告',copy:'奶量、时长与吸乳过程，结束后汇成一份清晰报告。',benefit:'查看完整吸乳报告'},
 {id:'fit',tag:'佩戴检测',title:'连接 App，\n开启佩戴检测',copy:'跟随佩戴检测指引调整角度，再从容开始吸乳。',benefit:'使用佩戴检测'},
 {id:'trend',tag:'奶量趋势',title:'在 App 中，\n看见奶量变化',copy:'在吸奶子首页查看奶量趋势，回顾每天的积累。',benefit:'查看奶量趋势'},
 {id:'plan',tag:'AI 泌乳计划',title:'下载 App，\n管理你的泌乳计划',copy:'在 App 中管理泌乳计划，通过提醒跟进下一次安排。',benefit:'管理计划与提醒'},
 {id:'insight',tag:'AI Insight',title:'在 App 中，\n读懂吸乳数据',copy:'把最近一次吸乳、趋势与下次安排，放在一起看。',benefit:'查看 AI Insight'}
];
function storyCount(){try{const n=Number(localStorage.getItem(STORY_KEY));return Number.isSafeInteger(n)&&n>=0?n:0;}catch{return storyMemory;}}
function storySetCount(n){storyMemory=n;try{localStorage.setItem(STORY_KEY,String(n));}catch{}storyRefreshCounter();}

function storyLast(){try{return localStorage.getItem(STORY_LAST_KEY)||storyLastMemory;}catch{return storyLastMemory;}}
function pickStoryFeature(previous,random=Math.random){const pool=STORY_FEATURES.filter(f=>f.id!==previous);return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];}
function storyCompletedUse(){const n=storyCount()+1;storySetCount(n);openDownloadStory(n);}
function storyRefreshCounter(){const node=document.getElementById('story-count');if(node)node.textContent=String(storyCount());}
function storySvg(body,view='0 0 280 220'){return `<svg viewBox="${view}" fill="none" aria-hidden="true">${body}</svg>`;}
function originalStoryArt(i){
 if(i===0)return `<div class="source-milk"><div class="story-art-top"><span>Air 2</span><span>实时奶量</span></div><div class="source-milk-pumps">${['L','R'].map((side,j)=>`<div><span class="source-pump-crop ${j?'right':''}"><img src="assets/story-figma/control-pumps.png" alt="${side} Air2"></span><label>${side}</label><strong><span data-milk-number="${j}">${j?'1.6':'1.8'}</span><small> oz</small></strong></div>`).join('')}</div></div>`;
 if(i===1)return `<div class="source-plan-viewport"><div class="source-plan-list" role="region" aria-label="韵律方案选择列表"><h3>官方韵律</h3>${[['Cozy Flow','21:30'],['Milk Boost','20:00'],['Power Pumping','45:00']].map(([name,time])=>`<div class="v4-list-card ${name==='Milk Boost'?'expanded':''}"><div class="row"><span class="copy"><b>${name}</b><small>${time}</small></span><span class="play"><img src="assets/quick-control/pdcp-manual-play.svg" alt=""></span></div>${name==='Milk Boost'?'<p>Most suitable for daily use after successful lactation</p><span class="v4-program-bar"><i></i></span><span class="v4-legend"><span>Stimulate</span><span>Expression</span></span>':''}</div>`).join('')}<section class="pdcp-saved-library"><h3>个性化韵律</h3>${[['My rhythm 1','4 stages · 20:00'],['My rhythm 2','5 stages · 24:00'],['My rhythm 3','3 stages · 18:00']].map(([name,detail])=>`<div class="pdcp-saved-rhythm"><span><b>${name}</b><small>${detail}</small></span><span aria-hidden="true">›</span></div>`).join('')}</section></div><span class="plan-swipe-cue" aria-hidden="true"><img src="assets/quick-control/pdcp-level-knob.svg" alt=""></span></div>`;
 if(i===2)return `<div class="story-records"><div class="story-art-top"><span>奶量记录</span><span>今日</span></div><div class="story-record-total"><strong>12.4 <small>oz</small></strong><span>每次积累，都有迹可循</span></div><div class="story-bars">${[42,68,53,92,72,106,86].map((h,j)=>`<div><i style="--bar:${h}px;--delay:${j*90}ms"></i><span>${j+1}</span></div>`).join('')}</div><div class="story-reminder">${storySvg('<path d="M7 15V10a5 5 0 0 1 10 0v5l2 3H5l2-3ZM10 21h4M12 3V2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>','0 0 24 24')}<div><strong>吸奶提醒</strong><span>下一次 · 14:30</span></div><span class="story-switch"></span></div></div>`;
 return `<div class="story-dual"><div class="story-art-top"><span>档位调节</span><span>双边同步</span></div><div class="story-dual-tracks">${['L','Both','R'].map((side,j)=>`<div><label>${side}</label><div class="story-demo-track ${j===1?'both':''}"><span>${'<i></i>'.repeat(12)}</span><b class="story-demo-knob" data-dual-number>${j===1?'↕':'4'}</b></div></div>`).join('')}</div><div class="story-gesture">${storySvg('<path d="M12 21V4M7 9l5-5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>','0 0 24 24')}一次滑动，左右一起调整</div></div>`;
}
function storyArt(feature){
 if(feature==='milk')return originalStoryArt(0);
 if(feature==='rhythm')return originalStoryArt(1);
 if(feature==='dual')return originalStoryArt(3);
 if(feature==='report')return `<div class="promo-report"><div class="promo-mini-date">Nov 6 · 10:30 AM <span>↗</span></div><div class="promo-total"><span>Total milk</span><strong>4.6 <small>oz</small></strong><div class="promo-duration">Session duration <b>20:00</b></div><div class="promo-split"><i></i></div><div class="promo-left-right"><span>L <b>2.4 oz</b></span><span>R <b>2.2 oz</b></span></div></div><div class="promo-chart-heading">Pumping pattern <small>● L　<span>● R</span></small></div>${storySvg('<path d="M0 25H270M0 50H270M0 75H270" stroke="#eee5e9"/><path class="promo-draw" d="M0 76C12 76 17 73 23 54S32 40 39 56S52 72 60 38S72 22 80 43S90 69 103 68S116 74 128 59S140 35 148 52S160 73 170 42S180 28 193 51S205 74 220 74H270" stroke="#a75776" stroke-width="2"/><path class="promo-draw second" d="M0 79C15 79 20 78 30 65S43 49 50 67S60 77 74 46S84 40 93 62S100 77 120 77S145 74 157 62S170 43 181 65S195 76 210 77H270" stroke="#d5a681" stroke-width="2"/>','0 0 270 90')}<div class="promo-chart-axis"><span>0 min</span><span>10</span><span>20</span></div></div>`;
 if(feature==='fit')return sourceFitMarkup();
 if(feature==='trend')return `<div class="promo-trend-viewport"><div class="promo-trend-native" data-node-id="200:9288"><header><span><img src="assets/story-figma/trend-icon.svg" alt="">Pumping Trend</span><img class="promo-chevron" src="assets/story-figma/trend-chevron.svg" alt=""></header><div class="promo-trend-chart"><img class="grid-a" src="assets/story-figma/trend-grid-a.svg" alt=""><img class="grid-b" src="assets/story-figma/trend-grid-b.svg" alt=""><img class="curve" src="assets/story-figma/trend-curve.svg" alt="一周奶量趋势"><div class="promo-y"><span>30oz</span><span>20</span><span>10</span><span>0</span></div><div class="promo-value-guide"><img src="assets/story-figma/trend-guide.svg" alt=""><b>24.00</b></div></div><div class="promo-trend-dates">${['S','M','T','W','T','F','S'].map((n,i)=>`<span>${n}<small>6/${19+i}</small></span>`).join('')}</div></div></div>`;
 if(feature==='plan')return `<div class="promo-lock"><div class="promo-lock-date">Friday, November 6</div><div class="promo-lock-time">10:51</div><div class="promo-notification"><img src="assets/auth-logo.svg" alt="Momcozy"><div><header>Momcozy <small>now</small></header><strong>吸奶提醒</strong><p>下一次计划时间快到了<br>打开 App，查看今日安排</p></div></div></div>`;

 return `<div class="promo-insight" data-node-id="200:7696"><header><img src="assets/story-figma/insight-star.svg" alt="">AI Insight</header><div class="promo-insight-row"><img src="assets/story-figma/insight-arrow.svg" alt=""><p>Last pump: 1 hr 45 min ago,<br>total 4.6 oz.</p></div><div class="promo-insight-row"><img src="assets/story-figma/insight-arrow.svg" alt=""><p>回顾近期奶量趋势与吸乳节奏，<br>更清晰地了解自己的记录。</p></div><div class="promo-insight-row"><img src="assets/story-figma/insight-arrow.svg" alt=""><p>Next pump time: 12:30 PM<br><span>查看你的下一次安排</span></p></div></div>`;
}
function openDownloadStory(n,preview=false,forcedId=null){
 closeDownloadStory(false);storyPaused=storyReduced;storyPhase=0;storyFocus=document.activeElement;
 storyFeature=STORY_FEATURES.find(f=>f.id===forcedId)||pickStoryFeature(storyLast());
 if(!preview){storyLastMemory=storyFeature.id;try{localStorage.setItem(STORY_LAST_KEY,storyFeature.id);}catch{}}
 const f=storyFeature;
 storyLayer=document.createElement('section');storyLayer.className='download-story single-feature';storyLayer.dataset.feature=f.id;storyLayer.setAttribute('role','dialog');storyLayer.setAttribute('aria-modal','true');storyLayer.setAttribute('aria-label','探索 Momcozy 正式 App');
 storyLayer.innerHTML=`<div class="story-top"><span>Momcozy</span><button data-story="close" aria-label="关闭功能介绍">×</button></div><div id="story-slide"><div class="story-copy"><h2>${f.title.replace('\n','<br>')}</h2></div><div class="story-art">${storyArt(f.id)}</div></div><div class="story-bottom"><button class="story-get" data-story="get">获取 Momcozy App <span>↗</span></button></div>`;
 document.querySelector('.phone').append(storyLayer);document.getElementById('screen').inert=true;
 storyLayer.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;switch(b.dataset.story){case'close':closeDownloadStory();break;case'get':closeDownloadStory(false);startInstallation();break;}});
 storyLayer.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();closeDownloadStory();}if(event.key==='Tab'){const list=[...storyLayer.querySelectorAll('button:not(:disabled)')],first=list[0],last=list.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
 storyMotion();storyLayer.querySelector('[data-story="close"]').focus({preventScroll:true});
}
function storyMotion(){
 cancelAnimationFrame(storyFrame);if(!storyLayer)return;
 storyLayer.classList.toggle('is-paused',storyPaused);storyLayer.classList.toggle('reduced-motion',storyReduced);

 if(storyPaused)return;
 let previous=performance.now();
 const animate=now=>{if(!storyLayer||storyPaused)return;storyPhase+=(now-previous);previous=now;const t=(storyPhase%6000)/6000;
  if(storyFeature.id==='fit'){
   const angle=Math.round(45*(1-Math.min(t/.65,1))),host=storyLayer.querySelector('#source-fit-angle'),aligned=angle===0;
   if(host.dataset.aligned!==String(aligned)){host.dataset.aligned=String(aligned);host.innerHTML=sourceAngleGuide({l:0,r:aligned?0:45});}
   if(!aligned){const side=host.querySelectorAll('.pdcp-angle-side')[1],svg=side.querySelector('svg');side.querySelector('header span').textContent=angle+'°';svg.querySelector('g').setAttribute('transform',`rotate(${angle} 75 83)`);svg.setAttribute('aria-label',`Right pump ${angle} degrees. Rotate left`);const arc=svg.querySelector(':scope > path');if(arc)arc.setAttribute('d',`M75 55 A28 28 0 0 1 ${75+28*Math.sin(angle*Math.PI/180)} ${83-28*Math.cos(angle*Math.PI/180)}`);}
   storyLayer.querySelector('.r50-progress i').style.width=(20+(1-angle/45)*80)+'%';
  }
  if(storyFeature.id==='milk')storyLayer.querySelectorAll('[data-milk-number]').forEach((el,j)=>el.textContent=((j?1.6:1.8)+t*.4).toFixed(1));

  if(storyFeature.id==='rhythm'){
   const list=storyLayer.querySelector('.source-plan-list'),cue=storyLayer.querySelector('.plan-swipe-cue');
   const cycle=(storyPhase%12000)/12000;
   let travel=cycle<.18?0:cycle<.43?(cycle-.18)/.25:cycle<.62?1:cycle<.87?1-(cycle-.62)/.25:0;
   travel=travel*travel*(3-2*travel);
   list.scrollTop=(list.scrollHeight-list.clientHeight)*travel;
   if(cue){cue.style.top=(75-48*travel)+'%';cue.style.opacity=(cycle>.18&&cycle<.43||cycle>.62&&cycle<.87)?'1':'0';}
  }
  if(storyFeature.id==='dual'){const travel=(1-Math.cos(t*2*Math.PI))/2,level=4+Math.round(travel*4);storyLayer.querySelectorAll('[data-dual-number]').forEach((el,j)=>{el.style.bottom=(18+travel*52)+'%';if(j!==1)el.textContent=level;});}
  storyFrame=requestAnimationFrame(animate);
 };storyFrame=requestAnimationFrame(animate);
}
function closeDownloadStory(restore=true){cancelAnimationFrame(storyFrame);storyLayer?.remove();storyLayer=null;const screen=document.getElementById('screen');if(screen)screen.inert=false;if(restore&&storyFocus?.isConnected)storyFocus.focus({preventScroll:true});}
document.addEventListener('visibilitychange',()=>{if(storyLayer){storyPaused=document.hidden||storyReduced;storyMotion();}});
const storyReview=document.createElement('section');storyReview.className='story-review';storyReview.innerHTML=`<div class="panel-label">下载引导演示</div><p>已完成 <b id="story-count">0</b> 次使用 · 每次停止后随机展示一项，连续不重复。</p><label for="story-feature-select">指定功能预览</label><select id="story-feature-select"><option value="random">随机一个功能</option>${STORY_FEATURES.map(f=>`<option value="${f.id}">${f.tag}</option>`).join('')}</select><button id="story-preview">预览功能介绍</button><button id="story-reset">重置本地次数</button>`;
document.querySelector('.flow-panel').append(storyReview);storyRefreshCounter();
document.getElementById('story-preview').addEventListener('click',()=>{if(platform!=='ios')switchPlatform('ios');reset('clip');seedClip();go('control');openDownloadStory(storyCount(),true,document.getElementById('story-feature-select').value);});
document.getElementById('story-reset').addEventListener('click',()=>{storySetCount(0);storyLastMemory='';try{localStorage.removeItem(STORY_LAST_KEY);}catch{}});
