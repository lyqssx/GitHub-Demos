const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'../pdcp-v2.js'),'utf8');
const start = source.slice(source.indexOf('  function startFit()'),source.indexOf('  function beginPumping()'));
const confirm = source.slice(source.indexOf('  function confirmWearing()'),source.indexOf('  // Demo reading allowance'));
function harness(confirmed=false, precheck=true) {
  const context=vm.createContext({assert});
  vm.runInContext(`let session=null,state={page:'control'},report=null,sheet=null,fit=null,notice='',wearConfirmation=null,wearingConfirmed=${confirmed},prePumpingCheck=${precheck},angleDemo=null,angleAnimation=null,reverseWearPrompt=false,fitTimer=null,reminderTimer=null;let started=0,renders=0,writes=[],jobs=[];const wearingConfirmedKey='air2-wearing-confirmed:DAC1101FDF49:v1';const localStorage={setItem:(k,v)=>writes.push([k,v])};function render(){renders++}function clearWearingWait(){}function clearTimeout(){}function cancelAnimationFrame(){}function setTimeout(fn){jobs.push(fn);return jobs.length}function showWearingAdjustmentPrompt(){}function beginPumping(){started++;fit=null}${start}${confirm}`,context);
  return expression=>vm.runInContext(expression,context);
}
test('first-use confirmation precedes checks and is remembered only within the current page',()=>{
 const run=harness();run(`startFit();assert.equal(wearConfirmation,'first');assert.equal(jobs.length,0);assert.equal(started,0);assert.equal(writes.length,0);wearConfirmation=null;startFit();assert.equal(wearConfirmation,'first');confirmWearing();assert.equal(wearConfirmation,null);assert.equal(fit,'checking');assert.equal(writes.length,0);assert.equal(wearingConfirmed,true);assert.equal(started,0);jobs[0]();assert.equal(fit,'angle');`);
});
test('previous confirmation bypasses onboarding and disabled precheck still requires first confirmation',()=>{
 harness(true)(`startFit();assert.equal(wearConfirmation,null);assert.equal(fit,'checking');assert.equal(writes.length,0);`);
 harness(false,false)(`startFit();assert.equal(wearConfirmation,'first');assert.equal(started,0);confirmWearing();assert.equal(started,1);`);
});
test('rechecking wearing does not resume pumping or reset measured angles',()=>{
 harness(true)(`session={finished:false,paused:true};state.leakAdjusting=true;angleDemo={l:0,r:69};wearConfirmation='recheck';confirmWearing();assert.equal(wearConfirmation,null);assert.equal(session.paused,true);assert.equal(state.leakAdjusting,true);assert.equal(angleDemo.r,69);assert.equal(started,0);assert.equal(writes.length,0);`);
});

test('refresh resets confirmation even when old browser storage says confirmed',()=>{
 const initializer = source.match(/let wearingConfirmed = [^;]+;/)[0];
 const state = vm.createContext({localStorage:{getItem:()=> 'true'}});
 vm.runInContext(initializer,state);
 assert.equal(vm.runInContext('wearingConfirmed',state),false);
 vm.runInContext('wearingConfirmed=true',state);
 const refreshed = vm.createContext({localStorage:{getItem:()=> 'true'}});
 vm.runInContext(initializer,refreshed);
 assert.equal(vm.runInContext('wearingConfirmed',refreshed),false);
});

const adjustment = source.slice(source.indexOf('  function playWearAdjustmentMock('), source.indexOf('  function metricsSheet()'));
for (const guidedSide of ['r','l']) {
  test(`opposite direction and wrong-side adjustments stay distinct (${guidedSide} guided)`,()=>{
    for (const wrongSide of [false,true]) {
      const context=vm.createContext({assert});
      vm.runInContext(`let state={leakAdjusting:true,leakSide:'${guidedSide}'},fit=null,wearConfirmation=null,angleDemo=${guidedSide==='r'?'{l:0,r:45}':'{l:-45,r:0}'},angleAnimation=null,reverseWearPrompt=false,fitTimer=null,reminderTimer=null,callback;let resumes=0;const root={querySelector:()=>({}),querySelectorAll:()=>[]};const performance={now:()=>0};const reverseWearMock={samples:[[0,-18],[3000,-26],[5000,-34],[7000,-42],[13700,-42]],promptAt:7200};function canAdjustWearing(){return !wearConfirmation}function clearWearingWait(){}function clearTimeout(){}function cancelAnimationFrame(){}function syncLegacy(){}function fitPanel(){return ''}function render(){}function requestAnimationFrame(fn){callback=fn;return 1}function fitOk(){resumes++}function trigger(){resumes++}${adjustment}
      playWearAdjustmentMock(false,${wrongSide});callback(7000);
      assert.equal(angleDemo['${guidedSide}'],${guidedSide==='r'?(wrongSide?45:69):(wrongSide?-45:-69)});
      assert.equal(angleDemo['${guidedSide==='r'?'l':'r'}'],${wrongSide?(guidedSide==='r'?-24:24):0});
      callback(7200);assert.equal(wearConfirmation,'recheck');assert.equal(resumes,0);assert.equal(angleAnimation,null);
      wearConfirmation=null;playWearAdjustmentMock(true);callback(4800);assert.equal(resumes,1);assert.equal(Math.abs(angleDemo.l),0);assert.equal(Math.abs(angleDemo.r),0);`,context);
    }
  });
}
