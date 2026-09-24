const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Session } = require('../pdcp-session.js');
const near = (a, b) => assert.ok(Math.abs(a-b)<1e-7, `${a} != ${b}`);
test('a full left bowl stops alone; right volume keeps growing until one shared finish', () => {
  const s = new Session({ capacity: 10 });
  s.advance(10, { l: 60, r: 6 });
  assert.equal(s.sides.l.stopped, true); assert.equal(s.finished, false);
  near(s.sides.l.volume,10); near(s.sides.r.volume,1);
  s.advance(20, { l: 60, r: 6 });
  near(s.sides.l.volume,10); near(s.sides.r.volume,3); near(s.sides.l.seconds,10);
  s.advance(70, { l: 60, r: 6 });
  assert.equal(s.finished,true); near(s.total,20); assert.equal(s.sides.r.stopReason,'full');
});
test('manual finish after a single full side retains the other side actual volume', () => {
  const s = new Session({capacity:10}); s.advance(10,{l:60,r:12}); s.finish();
  near(s.sides.l.volume,10); near(s.sides.r.volume,2); assert.equal(s.sides.l.stopReason,'full');
  assert.equal(s.sides.r.stopReason,'manual');
});
test('manual mode is sticky across device events; explicit Auto restores automatic switching', () => {
  const s = new Session(); s.setMethod('manual','mixed'); s.letdown('l',true);
  assert.equal(s.mode,'mixed'); assert.equal(s.method,'manual');
  s.setMethod('auto'); assert.equal(s.mode,'stimulation');
  s.letdown('l',true); assert.equal(s.mode,'expression');
  s.letdown('l',false); assert.equal(s.finished,false); assert.equal(s.mode,'mixed');
  s.setMethod('preset','mixed'); s.letdown('r',true); assert.equal(s.mode,'mixed');
});
test('per-side counts deduplicate active signals and preserve first/peak times', () => {
  const s = new Session(); s.advance(20,{l:0,r:0}); s.letdown('l',true); s.letdown('l',true);
  assert.equal(s.sides.l.count,1); assert.equal(s.sides.r.count,0); near(s.sides.l.first,20);
  s.advance(10,{l:12,r:4}); near(s.sides.l.peak,12); near(s.sides.l.peakAt,30);
  s.letdown('l',false); s.letdown('l',true); assert.equal(s.sides.l.count,2); near(s.sides.l.first,20);
});
test('pause freezes volume, time and let-down counting', () => {
  const s = new Session(); s.advance(10,{l:6,r:6}); const before=s.snapshot(); s.paused=true;
  s.advance(100,{l:60,r:60}); s.letdown('l',true);
  near(s.total,before.total); near(s.elapsed,before.elapsed); assert.equal(s.sides.l.count,0);
});
test('valid session means detected volume OR duration strictly over five minutes', () => {
  const s = new Session(); s.advance(300,{l:0,r:0}); assert.equal(s.valid,false);
  s.advance(.1,{l:0,r:0}); assert.equal(s.valid,true);
  const short=new Session(); short.advance(1,{l:.01,r:0}); assert.equal(short.valid,true);
});
test('segmented duration and milk reconcile; switching methods does not reset session', () => {
  const s = new Session(); s.advance(60,{l:6,r:3}); s.setMethod('manual','mixed'); s.advance(120,{l:3,r:6}); s.finish();
  near(s.segments.reduce((a,x)=>a+x.duration,0),s.elapsed);
  near(s.segments.reduce((a,x)=>a+x.l+x.r,0),s.total); assert.equal(s.segments.length,2);
});
test('report snapshot stays frozen, editing validates and preserves physiological data', () => {
  const s = new Session(); s.advance(60,{l:6,r:3}); s.finish(); const before=s.snapshot();
  s.advance(60,{l:100,r:100}); assert.deepEqual(s.snapshot(),before);
  assert.equal(s.editVolumes(-1,4),false); assert.equal(s.editVolumes(NaN,4),false);
  assert.equal(s.editVolumes(181,4),false); assert.equal(s.editVolumes(8,4),true);
  near(s.total,12); assert.deepEqual(s.samples,before.samples); assert.deepEqual(s.segments,before.segments);
  assert.equal(s.edited,true); near(before.total,9);
});
test('zero milk has no invented peak or first let-down',()=>{
 const s=new Session();s.advance(5,{l:0,r:0});s.finish();
 assert.equal(s.sides.l.first,null);assert.equal(s.sides.l.peakAt,null);assert.equal(s.total,0);
});
test('last sample clips time at the actual later-side full event',()=>{
 const s=new Session({capacity:1});s.advance(10,{l:120,r:60});
 assert.equal(s.finished,true);near(s.elapsed,1);near(s.sides.l.seconds,.5);near(s.sides.r.seconds,1);
 near(s.segments[0].duration,1);near(s.total,2);
});

test('sketch-based traces contain finite event envelopes, not endlessly repeating peaks', () => {
  const { demoSensor } = require('../pdcp-session.js');
  for (const groups of [1, 2]) {
    const s = new Session({capacity:1000});
    for (let t = 0; t < 1500; t++) {
      const flows = {};
      for (const k of ['l', 'r']) {
        const sample = demoSensor(k, t, groups);
        s.letdown(k, sample.active); flows[k] = sample.flow;
      }
      s.advance(1, flows);
    }
    assert.equal(s.sides.l.count, groups);
    assert.equal(s.sides.r.count, groups);
    assert.equal(s.segments.length, groups * 2 + 1);
    assert.equal(demoSensor('l', 3100, groups).flow, 0);
    assert.equal(s.finished, false);
    assert.ok(s.total > 0 && s.total < 400);
  }
});

test('Auto starts with Stimulation, alternates Expression/Mixed, and suggests finish after 120 unpaused seconds', () => {
  const s = new Session();
  assert.equal(s.mode,'stimulation');
  s.letdown('l',true); s.letdown('r',true); assert.equal(s.mode,'expression');
  s.letdown('l',false); assert.equal(s.mode,'expression');
  s.letdown('r',false); assert.equal(s.mode,'mixed');
  s.advance(119,{l:0,r:0}); assert.equal(s.readyToFinish,false);
  s.paused=true; s.advance(60,{l:0,r:0}); assert.equal(s.readyToFinish,false);
  s.paused=false; s.advance(1,{l:0,r:0}); assert.equal(s.readyToFinish,true); assert.equal(s.finished,false);
  s.letdown('l',true); assert.equal(s.mode,'expression'); assert.equal(s.readyToFinish,false);
  s.letdown('l',false); assert.equal(s.mode,'mixed'); s.advance(119,{l:0,r:0}); assert.equal(s.readyToFinish,false);
  s.setMethod('manual','mixed'); s.advance(20,{l:0,r:0}); assert.equal(s.readyToFinish,false);
});

test('Auto initial mode never inherits a manual selection', () => {
  for (const mode of ['stimulation', 'expression', 'mixed']) {
    const fresh = new Session({ method: 'auto', mode });
    assert.equal(fresh.mode, 'stimulation');
    const switched = new Session({ method: 'manual', mode });
    switched.setMethod('auto', mode);
    assert.equal(switched.mode, 'stimulation');
    switched.letdown('l', false);
    assert.equal(switched.mode, 'stimulation');
    switched.letdown('l', true);
    assert.equal(switched.mode, 'expression');
  }
});

test('Deep expression is Auto-only, first-event-only and releases at half peak', () => {
 const s=new Session();s.letdown('l',true);assert.equal(s.deep,true);s.advance(1,{l:2,r:0});assert.equal(s.deep,true);s.advance(1,{l:14,r:0});assert.equal(s.deep,true);s.advance(1,{l:30,r:0});assert.equal(s.deep,true);assert.equal(s.mode,'expression');
 s.advance(1,{l:16,r:0});assert.equal(s.deep,true);
 s.advance(1,{l:15,r:0});assert.equal(s.deep,false);assert.equal(s.mode,'expression');
 s.advance(1,{l:30,r:0});assert.equal(s.deep,false);
 s.letdown('l',false);assert.equal(s.mode,'mixed');s.letdown('l',true);s.advance(1,{l:30,r:0});assert.equal(s.deep,false);
 const manual=new Session({method:'manual',mode:'expression'});manual.letdown('l',true);manual.advance(1,{l:30,r:0});assert.equal(manual.deep,false);
});
test('Each let-down stores its own main peak, not only the global maximum', () => {
 const s=new Session();s.letdown('l',true);s.advance(5,{l:30,r:0});s.advance(5,{l:15,r:0});s.letdown('l',false);
 s.letdown('l',true);s.advance(5,{l:12,r:0});
 assert.equal(s.sides.l.events.length,2);assert.equal(s.sides.l.events[0].peak,30);assert.equal(s.sides.l.events[1].peak,12);
});

test('shorter demo keeps left/right milk and end timing close without forcing full bowls', () => {
  const { demoSensor } = require('../pdcp-session.js');
  const volumes={l:0,r:0}, ended={};
  for(let t=0;t<1400;t++) for(const k of ['l','r']) {
    const sample=demoSensor(k,t);volumes[k]+=sample.flow/60;
    if(sample.active)ended[k]=t;
  }
  assert.ok(volumes.l>0 && volumes.r>0);
  assert.ok(Math.abs(volumes.l-volumes.r)/Math.max(volumes.l,volumes.r)<.05);
  assert.ok(Math.abs(ended.l-ended.r)<=10);
});

test('default Auto fixture has about three minutes deep and five minutes regular Expression', () => {
  const { demoSensor } = require('../pdcp-session.js');
  const s=new Session();let deepStart,deepEnd,mixedAt;
  for(let t=0;t<590;t++) {
    const flows={};for(const k of ['l','r']){const sample=demoSensor(k,t);s.letdown(k,sample.active);flows[k]=sample.flow;}
    s.advance(1,flows);
    if(s.deep && deepStart===undefined)deepStart=t;
    if(deepStart!==undefined && !s.deep && deepEnd===undefined)deepEnd=t;
    if(s.mode==='mixed' && mixedAt===undefined)mixedAt=t;
  }
  assert.ok(Math.abs(deepEnd-deepStart-180)<=10);
  assert.ok(Math.abs(mixedAt-deepEnd-300)<=10);
  assert.equal(s.finished,false);
});

test('duration corrections update the record without retiming sensor evidence', () => {
  const s = new Session();
  s.advance(120,{l:10,r:10}); s.finish();
  const samples=JSON.stringify(s.samples), stages=JSON.stringify(s.segments);
  assert.equal(s.editDuration(90),true);
  assert.equal(s.snapshot().reportedDuration,90);
  assert.equal(s.elapsed,120);
  assert.equal(JSON.stringify(s.samples),samples);
  assert.equal(JSON.stringify(s.segments),stages);
  s.editVolumes(s.sides.l.volume,s.sides.r.volume);
  assert.equal(s.edited,true);
  assert.equal(s.editDuration(0),false);
  assert.equal(s.editDuration(1.5),false);
  assert.equal(s.reportedDuration,90);
  assert.equal(s.editDuration(120),true);
  assert.equal(s.edited,false);
});
