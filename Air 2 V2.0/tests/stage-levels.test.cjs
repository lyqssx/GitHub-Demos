const {test}=require('node:test'),assert=require('node:assert/strict');
const {Session,buildRhythm,rhythmAt,commonStageLevels,validRhythm,finalStageLevels}=require('../pdcp-session.js');
function recorded(){const s=new Session({method:'manual',levels:{l:7,r:6}});s.advance(60,{l:2,r:2});s.setLevels(5,4);s.advance(60,{l:2,r:2});s.setMethod('manual','expression');s.advance(60,{l:2,r:2});s.setMethod('manual','stimulation');s.setLevels(3,2);s.advance(60,{l:2,r:2});s.finish();return s;}
test('each stage stores only its final levels; repeated modes remain independent',()=>{
 const s=recorded(),r=s.snapshot();assert.equal(r.segments.length,3);assert.deepEqual(r.segments[0].finalLevels,{l:5,r:4});assert.deepEqual(r.segments[2].finalLevels,{l:3,r:2});assert.equal(r.segments[0].levelChanges,undefined);const before=JSON.stringify(r);s.levels.l=15;assert.equal(JSON.stringify(r),before);
});
test('pause does not overwrite previously used stage levels; stopped side retains last used level',()=>{
 const s=new Session({method:'manual'});s.advance(10,{l:2,r:2});s.paused=true;s.setLevels(8,9);s.advance(100,{l:2,r:2});assert.deepEqual(s.segments[0].finalLevels,{l:2,r:4});s.paused=false;s.stopSide('l');s.advance(10,{l:2,r:2});assert.deepEqual(s.segments[0].finalLevels,{l:2,r:9});
});
test('replay uses the final setting from the start of a stage, not its historical adjustments',()=>{
 const r=JSON.parse(JSON.stringify(buildRhythm(recorded().snapshot(),'Example')));assert.equal(validRhythm(r),true);assert.equal(rhythmAt(r,0).l,5);assert.equal(rhythmAt(r,59).l,5);assert.equal(rhythmAt(r,60).l,5);assert.equal(rhythmAt(r,180).l,3);assert.equal(rhythmAt(r,240),null);const bad=JSON.parse(JSON.stringify(r));bad.stages[0].finalLevels.l=99;assert.equal(validRhythm(bad),false);
});
test('stage preferences use the latest final setting by occurrence, never time-weighted levels',()=>{
 const r=buildRhythm(recorded().snapshot(),'Example'),next=JSON.parse(JSON.stringify(r));next.stages[0].finalLevels={l:1,r:2};assert.deepEqual(commonStageLevels([r,next],'stimulation',0),{l:1,r:2,sessions:2});assert.deepEqual(commonStageLevels([r,next],'stimulation',1),{l:3,r:2,sessions:2});
});
test('old recordings migrate to final non-null levels per side without retaining timelines',()=>{
 const old={levelChanges:[{at:0,l:2,r:4},{at:15,l:9,r:0},{at:30,l:null,r:7}]};assert.deepEqual(finalStageLevels(old),{l:9,r:7});
});
test('final adjustment just before ending is captured without creating extra stages',()=>{
 const s=new Session({method:'manual'});s.advance(30,{l:2,r:2});s.setLevels(10,7);s.finish();assert.deepEqual(s.segments[0].finalLevels,{l:10,r:7});assert.equal(s.segments.length,1);
});
