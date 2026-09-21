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
  const side = () => ({ volume: 0, flow: 0, count: 0, first: null, peak: 0, peakAt: null, active: false, stopped: false, stopReason: null, seconds: 0, segments: [] });
  class Session {
    constructor({ now = Date.now(), method = 'auto', mode = 'stimulation', preset = 'Milk Boost', capacity = CONFIG.demo.bowlCapacityMl } = {}) {
      this.id = 'pdcp-' + now; this.startedAt = now; this.elapsed = 0;
      this.method = method; this.mode = method === 'auto' ? 'stimulation' : mode; this.preset = preset; this.capacity = capacity;
      this.noLetdownSince = null; this.sides = { l: side(), r: side() }; this.paused = false; this.finished = false;
      this.samples = [{ t: 0, l: 0, r: 0 }]; this.segments = []; this.edited = false; this.presetElapsed = 0;
    }
    setMethod(method, mode = this.mode, preset = this.preset) {
      if (this.finished || !['auto', 'manual', 'preset'].includes(method)) return;
      this.method = method; this.preset = preset; this.presetElapsed = 0;
      this.mode = method === 'auto' ? 'stimulation' : mode;
    }
    letdown(which, active) {
      if (this.finished || this.paused) return;
      const s = this.sides[which]; if (!s || s.stopped) return;
      if (active && !s.active) { s.count++; if (s.first === null) s.first = this.elapsed; }
      s.active = active;
      if (Object.values(this.sides).some(x => x.active && !x.stopped)) this.noLetdownSince = null;
      else if (this.noLetdownSince === null && Object.values(this.sides).some(x => x.count > 0)) this.noLetdownSince = this.elapsed;
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
      const added = { l: 0, r: 0 }; const activeTimes = []; const hitFull = [];
      for (const key of ['l', 'r']) {
        const s = this.sides[key]; if (s.stopped) { s.flow = 0; continue; }
        const raw = Number(flows[key]); s.flow = Number.isFinite(raw) ? Math.max(0, raw) : 0;
        const untilFull = s.flow > 0 ? Math.max(0, (this.capacity - s.volume) / s.flow * 60) : dt;
        const activeDt = Math.min(dt, untilFull); activeTimes.push(activeDt);
        added[key] = Math.min(this.capacity - s.volume, s.flow * activeDt / 60);
        s.volume += added[key]; s.seconds += activeDt;
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
      this.edited = left !== this.originalVolumes.l || right !== this.originalVolumes.r;
      return true;
    }
    get readyToFinish() { return !this.finished && this.method === 'auto' && this.mode === 'mixed' && this.noLetdownSince !== null && this.elapsed - this.noLetdownSince >= 120; }
    get total() { return this.sides.l.volume + this.sides.r.volume; }
    get valid() { return this.total > 0 || this.elapsed > 300; }
    snapshot() { return JSON.parse(JSON.stringify({ ...this, total: this.total, valid: this.valid })); }
  }
  // Hand-authored demo fixture following the user's one/two-envelope sketches.
  // Events are predefined device messages, NOT inferred from local flow peaks.
  const TRACE = [[0,0],[40,.2],[80,.6],[115,.3],[150,.8],[180,1.2],
    [210,4.8],[235,3.4],[265,8.5],[282,7.2],[320,14],[348,12.4],
    [362,9],[395,11],[421,8.8],[453,9.6],[470,5.7],[493,6.7],
    [525,2.5],[565,.7],[620,.3],[700,.25],[735,.5],
    [760,5.4],[780,4.4],[807,6.8],[830,5.1],[860,9.8],[883,8.9],
    [902,5.3],[935,7.4],[958,8.8],[980,4.5],[1005,5.8],
    [1025,2.4],[1060,2],[1100,.7],[1160,.2],[1200,0]];
  function demoSensor(k, t, groups = 2) {
    const x = Math.max(0, t - (k === 'r' ? 9 : 0));
    if (x >= 1200 || (groups === 1 && x >= 700)) return {active:false,flow:0};
    let i = 1; while (i < TRACE.length - 1 && x > TRACE[i][0]) i++;
    const [a,b] = [TRACE[i-1],TRACE[i]], u = Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));
    const v = a[1] + (b[1]-a[1]) * u*u*(3-2*u);
    return {active:(x >= 180 && x < 580) || (groups !== 1 && x >= 740 && x < 1120),
      flow: Math.max(0,v*(k === 'r' ? .86 + .035*Math.sin(x/53) : 1))};
  }
  const api = { Session, CONFIG, ML_PER_OZ, demoSensor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.Air2PDCP = api;
}(typeof window !== 'undefined' ? window : globalThis));
