'use strict';

// Proposed web fallback for legacy installs, conditional on the URL reaching the web.
function legacyWebMarkup(){
 if(platform==='android')return androidLanding();
 return `<div class="app-page"><div class="legacy-browser-bar">🔒 qr.momcozy.com</div><iframe class="download-frame" title="旧版 App · 已有下载落地页" src="download-module/index.html?view=landing&region=global&sn="></iframe></div>`;
}
function legacySpec(){
 if(state.page==='legacy-web')return ['已有下载落地页','复用已有下载落地页。','复用',['此处逻辑与原有下载页一致，不再赘述。']];
 if(platform==='android')return androidLegacySpec();
 return ['旧版 App · 落地页兼容方案','按网页承接方案展示已有下载落地页；这是条件路径，不代表所有旧版安装都会先进入网页。','待验证',[
 'Universal Link：App 已安装且域名／路径关联匹配时，系统可以直接打开 App，不必先访问落地页。',
 '本次演示前提是 NFC 链接实际交给网页处理；此时复用原下载落地页，不展示旧版 App 页面占位。',
 'App 未安装时，普通 Universal Link 由网页处理；本项目有 App Clip 的有效调用还需按 Clip 规则分发，不能混为同一条旧版流程。',
 '点击原下载按钮模拟尝试唤起已安装的旧版；关联匹配、浏览器打开策略和原唤起脚本需联调确认。',
 '若旧版已关联 /clip/，入口可能直接交给旧版，网页代码不会先运行；无法仅靠网页更新保证旧版必经落地页。'
 ],'产品展示采用落地页方案；研发需确认旧安装包关联状态、/clip/ 实际响应与原下载页唤起逻辑。'];
}
window.addEventListener('message',event=>{
 if(platform!=='ios'||state.scenario!=='legacy'||state.page!=='legacy-web'||event.origin!==location.origin||event.data?.type!=='android-landing-action'||event.data.action!=='download')return;
 const frame=$('screen').querySelector('.download-frame');
 if(!frame||event.source!==frame.contentWindow)return;
 state.legacyOpenRequested=true;
 render();
});
