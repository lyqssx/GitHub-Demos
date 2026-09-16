/* In-place Fit Check shared by Home and Pump Control. */
(function(){
var timers=[];
function rows(s){return[['Suction',s>=3?'done':'checking']];}
function guide(){return'<div class="r50-guide r50-v3-guide" aria-label="V3 Pro pump"><img class="r50-v3-main" src="./assets/v3-pro-main.png" alt="V3 Pro pump"></div>';}
function skipButton(){return'<button class="r50-skip" data-r50="skip" type="button">Skip</button>';}
function panel(place){var raw=+state.fitStage||0,list=rows(raw),starting=raw>=6;if(starting)return'<section class="r50-fit-panel r50-'+place+' is-starting" data-r50-place="'+place+'" role="status" aria-live="polite">'+skipButton()+'<div class="r50-start-ceremony"><i></i><strong>START</strong><span>Pumping begins now</span></div><div class="r50-progress"><i style="--r50-progress:100%"></i></div></section>';var copy=raw>=3?'<strong>Everything looks good</strong><span>Suction check passed</span>':'<strong>Fit Check</strong><span>V3 Pro is checking suction and the air seal</span>';var progress=raw<3?32:raw===3?72:100;return'<section class="r50-fit-panel r50-'+place+'" data-r50-place="'+place+'" role="status" aria-live="polite"><header class="r50-fit-head"><div class="r50-fit-copy">'+copy+'</div>'+skipButton()+'</header><div class="r50-fit-checks">'+list.map(function(x){return'<span class="r50-fit-item is-'+x[1]+'"><i class="r50-check-icon">'+(x[1]==='done'?'✓':'<b></b>')+'</i>'+x[0]+'</span>';}).join('')+'</div>'+guide()+'<div class="r50-progress"><i style="--r50-progress:'+progress+'%"></i></div></section>';}
function paint(){var old=document.querySelector('#demo .r50-fit-panel');if(old)old.outerHTML=panel(old.dataset.r50Place||'control');}
function clear(){timers.forEach(clearTimeout);timers=[];}
window.v4RunFit=function(){clear();state.modal='fit';state.fitAdjust=true;state.fitStage=0;v4View();};
var home=window.v4Home;window.v4Home=function(){var html=home.apply(this,arguments);if(state.modal==='fit')return html.replace(/<section class="v4-home-dock h7-home-dock">[\s\S]*?<\/section>(?=(?:<div class="r2-records"|<\/section>))/,panel('home'));return html.replace('data-quick-start="start"','data-v4="start"');};
var control=window.v4Control;window.v4Control=function(){var html=control.apply(this,arguments);return state.modal==='fit'?html.replace(/<button class="v4-start" data-v4="start">Start Pumping<\/button>/,panel('control')):html;};
window.v4Fit=function(){return'';};if(window.v4View)window.v4View();
document.addEventListener('click',function(event){var button=event.target.closest('[data-r50="skip"]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();clear();state.modal=null;state.fitAdjust=false;state.running=true;state.paused=false;v4View();},true);
})();
