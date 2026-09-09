(function () {
  var assetRoot = "./assets/figma-r49/";
  function getState() { return typeof state !== "undefined" ? state : {}; }
  function clock(seconds) { seconds = Math.max(0, Number(seconds) || 0); return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(Math.floor(seconds % 60)).padStart(2, "0"); }
  function programTotal(s) { return s.programTotal || "20:00"; }
  function boostTime(s) { return s.running ? clock(s.timer) + " / " + programTotal(s) : programTotal(s); }
  function phaseKind(mode) {
    if (mode === "stimulation" || mode === "expression" || mode === "rest" || mode === "mixed") return mode;
    return "rest";
  }
  function programTimeline(s) {
    var sequence = Array.isArray(s.rhythmSequence) && s.rhythmSequence.length
      ? s.rhythmSequence : ["stimulation", "expression", "stimulation", "expression"];
    var durations = Array.isArray(s.rhythmDurations) && s.rhythmDurations.length === sequence.length
      ? s.rhythmDurations : (sequence.length === 4 ? [2, 8, 2, 8] : sequence.map(function () { return 1; }));
    var activeIndex = Math.max(0, Math.min(sequence.length - 1, Number(s.rhythmIndex) || 0));
    var segments = sequence.map(function (mode, index) {
      var weight = Math.max(.01, Number(durations[index]) || 1);
      return "<i class=\"r49-program-segment is-" + phaseKind(mode) + (index === activeIndex ? " is-current" : "") + "\" style=\"--phase-weight:" + weight + "\" data-phase-index=\"" + index + "\"></i>";
    }).join("");
    return "<div class=\"r49-boost__program\" role=\"img\" aria-label=\"Program timeline, phase " + (activeIndex + 1) + " of " + sequence.length + "\">" + segments + "</div>";
  }
  function card() {
    var s = getState();
    var autoControl = typeof v4Switch === "function" ? v4Switch() : "";
    var layout = s.selectedProgram ? "program" : "manual";
    var head = "<div class=\"r49-boost__header\"><span class=\"r49-boost__title\">" + (s.selectedProgram || "Milk Boost") + "</span><em class=\"r49-boost__timer\">" + boostTime(s) + "</em></div><button class=\"r49-boost__arrow\" data-v4=\"list\" aria-label=\"Open list\"><img src=\"./assets/figma-r106-arrow.svg\" alt=\"\"></button>";
    var switcher = "<div class=\"r49-boost__switch\"><span>Auto Switch</span>" + autoControl + "</div>";
    var body = programTimeline(s);
    return "<section class=\"r49-boost-card\" data-r49-boost-state=\"" + layout + "\">" + head + body + switcher + "</section>";
  }
  // v4AutoCard calls this hook at render time. Do not monkey-patch the base
  // renderer: late overrides were allowing multiple card layouts to coexist.
  window.h7MilkBoostCard = card;
  window.h7Battery = function (side, value) {
    var level = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    return "<span class=\"h7-battery r49-battery\"><b>" + side + "</b><i style=\"--battery-level:" + level + "\"><span class=\"r49-battery-track\"><span class=\"r49-battery-fill\"></span></span><img class=\"r49-battery-shell\" src=\"" + assetRoot + "battery-shell.svg\" alt=\"\"><strong class=\"r49-battery-label\">" + level + "</strong></i></span>";
  };
  function repaintFrozenReview() {
    var s = getState(), host = document.getElementById("demo");
    if (!s.reviewFrozen || !host) return;
    var screen = host.firstElementChild;
    if ((screen && screen.classList.contains("v4-home")) || (s.reviewScreenId && s.reviewScreenId.indexOf("home") !== -1)) { if (typeof window.v4Home === "function") host.innerHTML = window.v4Home(); }
    else if ((screen && screen.classList.contains("v4-control")) || (s.reviewScreenId && s.reviewScreenId.indexOf("control") !== -1)) { if (typeof window.v4Control === "function") host.innerHTML = window.v4Control(); }
  }
  repaintFrozenReview();
  if (typeof window.v4View === "function" && !getState().reviewFrozen) window.v4View();
}());
/* Load the consolidated 2026-08-13 review corrections after every legacy
   renderer has registered, so this layer remains the final authority. */
(function(){
  var script=document.createElement('script');
  script.src='./review-notes-813.js?v=r113';
  script.onload=function(){
    var decouple=document.createElement('script');
    decouple.src='./auto-switch-decoupled.js?v=20260909-1';
    decouple.onload=function(){
      var recording=document.createElement('script');
      recording.src='./rhythm-recording-demo.js?v=10';
      document.body.appendChild(recording);
    };
    document.body.appendChild(decouple);
  };
  document.body.appendChild(script);
}());
