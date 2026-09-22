/* Session accounting, not a firmware algorithm. Input is already-recognized
   sensor events plus per-side volume flow. No learning/group inference here. */
(function (scope) {
  'use strict';
  const ML_PER_OZ = 29.5735;
  const CONFIG = Object.freeze({
    // Meeting candidates only; deliberately NOT used to infer sensor events.
    algorithmCandidates: { startGramsPerSecond: 0.05, endGramsPerSecond: 0.03, sustainedSeconds: 10, status: 'unconfirmed' },
    demo: { secondsPerRealSecond: 10, bowlCapacityMl: 180, sampleIntervalSeconds: 5 }
  });
  const side = () => ({ volume: 0, flow: 0, count: 0, first: null, peak: 0, peakAt: null, active: false, stopped: false, stopReason: null, seconds: 0, segments: [], events: [] });
  class Session {
    constructor({ now = Date.now(), method = 'auto', mode = 'stimulation', preset = 'Milk Boost', capacity = CONFIG.demo.bowlCapacityMl } = {}) {
      this.id = 'pdcp-' + now; this.startedAt = now; this.elapsed = 0;
      this.method = method; this.mode = method === 'auto' ? 'stimulation' : mode; this.preset = preset; this.capacity = capacity;
      this.deep = false; this.deepUsed = false; this.deepPeakReached = false; this.noLetdownSince = null; this.sides = { l: side(), r: side() }; this.paused = false; this.finished = false;
      this.samples = [{ t: 0, l: 0, r: 0 }]; this.segments = []; this.edited = false; this.presetElapsed = 0;
    }
    setMethod(method, mode = this.mode, preset = this.preset) {
      if (this.finished || !['auto', 'manual', 'preset'].includes(method)) return;
      this.method = method; this.preset = preset; this.presetElapsed = 0;
      this.mode = method === 'auto' ? 'stimulation' : mode;
      this.deep = false;
    }
    letdown(which, active) {
      if (this.finished || this.paused) return;
      const s = this.sides[which]; if (!s || s.stopped) return;
      if (active && !s.active) { s.count++; s.events.push({start:this.elapsed, peak:0, peakAt:null}); if (s.first === null) s.first = this.elapsed; }
      if (!active && s.active && s.events.length) s.events[s.events.length-1].end=this.elapsed;
      s.active = active;
      if (active && s.count === 1 && this.method === 'auto' && !this.deepUsed) { this.deep=true; this.deepUsed=true; this.deepPeakReached=false; }
      if (Object.values(this.sides).some(x => x.active && !x.stopped)) this.noLetdownSince = null;
      else if (this.noLetdownSince === null && Object.values(this.sides).some(x => x.count > 0)) this.noLetdownSince = this.elapsed;
      if (!Object.values(this.sides).some(x=>x.active && !x.stopped && x.count===1)) this.deep=false;
      // Auto follows incoming device events, never learns or groups them.
      if (this.method === 'auto') this.mode = Object.values(this.sides).some(x => x.active && !x.stopped) ? 'expression' : (Object.values(this.sides).some(s => s.count > 0) ? 'mixed' : 'stimulation');
    }
    segment(list, dt, l, r) {
      let last = list[list.length - 1];
      if (!last || last.mode !== this.mode || last.method !== this.method || last.preset !== this.preset) {
        last = { start: this.elapsed, duration: 0, mode: this.mode, method: this.method, preset: this.preset, l: 0, r: 0 }; list.push(last);
      }
      last.duration += dt; last.l += l; last.r += r;
    }
    advance(dt, flows) {
      if (this.finished || this.paused || !Number.isFinite(dt) || dt <= 0) return;
      const firstActive = Object.entries(this.sides).filter(([k,s])=>s.active && !s.stopped && s.count === 1);
      const currentFlow = Math.max(0,...firstActive.map(([k])=>Number(flows[k])||0));
      if (this.method !== 'auto' || this.mode !== 'expression' || !firstActive.length) this.deep=false;
      else if (this.deep) {
        if (currentFlow >= 30) this.deepPeakReached=true;
        if (this.deepPeakReached && currentFlow <= 15) this.deep=false;
      }
      const added = { l: 0, r: 0 }; const activeTimes = []; const hitFull = [];
      for (const key of ['l', 'r']) {
        const s = this.sides[key]; if (s.stopped) { s.flow = 0; continue; }
        const raw = Number(flows[key]); s.flow = Number.isFinite(raw) ? Math.max(0, raw) : 0;
        const untilFull = s.flow > 0 ? Math.max(0, (this.capacity - s.volume) / s.flow * 60) : dt;
        const activeDt = Math.min(dt, untilFull); activeTimes.push(activeDt);
        added[key] = Math.min(this.capacity - s.volume, s.flow * activeDt / 60);
        s.volume += added[key]; s.seconds += activeDt;
        const event=s.active?s.events[s.events.length-1]:null;
        if(event && s.flow>event.peak){event.peak=s.flow;event.peakAt=this.elapsed+activeDt;}
        if (s.flow > s.peak) { s.peak = s.flow; s.peakAt = this.elapsed + activeDt; }
        this.segment(s.segments, activeDt, key === 'l' ? added[key] : 0, key === 'r' ? added[key] : 0);
        if (s.volume >= this.capacity - 1e-8) hitFull.push(key);
      }
      const sessionDt = Math.max(0, ...activeTimes);
      this.segment(this.segments, sessionDt, added.l, added.r);
      this.elapsed += sessionDt; this.presetElapsed += sessionDt;
      if (this.elapsed - this.samples[this.samples.length - 1].t >= CONFIG.demo.sampleIntervalSeconds) {
        this.samples.push({ t: this.elapsed, l: this.sides.l.flow, r: this.sides.r.flow });
      }
      hitFull.forEach(key => this.stopSide(key, 'full'));
    }
    stopSide(which, reason = 'manual') {
      if (this.finished) return;
      const s = this.sides[which]; if (!s || s.stopped) return;
      s.stopped = true; s.active = false; s.flow = 0; s.stopReason = reason;
      if (this.sides.l.stopped && this.sides.r.stopped) this.finish(reason);
    }
    finish(reason = 'manual') {
      if (this.finished) return;
      for (const s of Object.values(this.sides)) {
        if (!s.stopped) { s.stopReason = reason; s.stopped = true; }
        s.active = false; s.flow = 0;
      }
      this.finished = true; this.paused = false; this.endReason = reason;
      this.endedAt = this.startedAt + this.elapsed * 1000;
      this.samples.push({ t: this.elapsed, l: 0, r: 0 });
    }
    editVolumes(left, right) {
      if (!this.finished || ![left, right].every(n => Number.isFinite(n) && n >= 0 && n <= this.capacity)) return false;
      if (!this.originalVolumes) this.originalVolumes = { l: this.sides.l.volume, r: this.sides.r.volume };
      this.sides.l.volume = left; this.sides.r.volume = right;
      this.edited = left !== this.originalVolumes.l || right !== this.originalVolumes.r || (this.reportedDuration ?? this.elapsed) !== this.elapsed;
      return true;
    }
    editDuration(seconds) {
      if (!this.finished || !Number.isInteger(seconds) || seconds < 1 || seconds > 59999) return false;
      this.reportedDuration = seconds;
      this.edited = seconds !== this.elapsed || !!(this.originalVolumes && (this.sides.l.volume !== this.originalVolumes.l || this.sides.r.volume !== this.originalVolumes.r));
      return true;
    }
    get readyToFinish() { return !this.finished && this.method === 'auto' && this.mode === 'mixed' && this.noLetdownSince !== null && this.elapsed - this.noLetdownSince >= 120; }
    get total() { return this.sides.l.volume + this.sides.r.volume; }
    get valid() { return this.total > 0 || (this.reportedDuration ?? this.elapsed) > 300; }
    snapshot() { return JSON.parse(JSON.stringify({ ...this, total: this.total, valid: this.valid })); }
  }
  // Hand-authored demo fixture following the user's one/two-envelope sketches.
  // Events are predefined device messages, NOT inferred from local flow peaks.
  const TRACE = [[0,0],[40,0],[60,2],[85,20],[110,26],[135,30],[160,24],
    [190,26],[225,22],[265,25],[300,19],[340,17],[380,16],[410,15],
    [445,13],[480,10],[520,8],[560,6],[600,3],[640,1.2],
    [680,2],[710,9],[730,6],[760,3],[790,9],[810,5],[840,15],
    [865,10],[890,5],[920,8],[950,4],[990,2],[1040,1],[1120,.2],[1200,0]];
  function demoSensor(k, t, groups = 2) {
    const x = Math.max(0, t - (k === 'r' ? 5 : 0));
    if (x >= 1200 || (groups === 1 && x >= 700)) return {active:false,flow:0};
    let i = 1; while (i < TRACE.length - 1 && x > TRACE[i][0]) i++;
    const [a,b] = [TRACE[i-1],TRACE[i]], u = Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));
    const v = a[1] + (b[1]-a[1]) * u*u*(3-2*u);
    return {active:(x >= 60 && x < 620) || (groups !== 1 && x >= 680 && x < 1020),
      flow: Math.min(30,Math.max(0,v*(1 + .025*Math.sin(x*.47)*Math.sin(x*.19))*(k === 'r' ? .98 + .008*Math.sin(x/53) : 1)))};
  }
  const api = { Session, CONFIG, ML_PER_OZ, demoSensor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.Air2PDCP = api;
}(typeof window !== 'undefined' ? window : globalThis));
