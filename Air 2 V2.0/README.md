# Air 2 V2.0

Local mirror of `air2-h5-demo-mirror-20260814-copy-V4-mirror-20260825`, updated against the reviewed 2026-09-21 scope. All changes are local to this mirror.

Run from this directory:

```sh
python3 -m http.server 4184 --bind 127.0.0.1
```

Open `http://127.0.0.1:4184/` → Air 2 → Pump Control.

- Auto is the default. **Change** opens Auto / Manual / Preset and Speed.
- Suction adjustments retain the current method. Manual stays Manual until Auto is explicitly selected.
- Start checks only wearing angle and battery. Select **My pumps are aligned** to continue.
- Left and right have independent milk volume, flow per minute, let-down count and peak flow.
- One full bowl stops alone. The other continues until it also finishes, or the user ends the session.
- Hold **Hold to finish** to end; keyboard Enter opens a finish confirmation.
- The report is recorded automatically, supports correcting milk amounts, and exports a PNG image.
- **Triggers** retains wearing, let-down and battery events. There are no leak events.

## Demo boundaries

Sensor traces and preset timings are illustrative; the simulation runs at 10×. Times, stage durations and volume integration use the same clock, excluding pauses. No firmware learning, group inference or cross-session quality comparisons are implemented. Candidate algorithm thresholds are metadata only and are not used for event detection.

A valid record has detected milk greater than zero OR active duration strictly greater than five minutes. A zero-volume session of five minutes or less is not counted as a pumping record.

Report data remains in memory until reload. No new persistence/history feature or cloud storage is included. Corrected milk totals do not rewrite the original sensor curve or mode-stage data. Average flow is intentionally omitted pending review.

## Locked design

See `DESIGN_BASELINE.md`. Control reuses the original `v4Control` renderer, hardware/vessel assets, vertical 0–15 level controls, Both, Speed and action bar. Only the plan slot is extended. The report inherits the original log-page style and canvas.

## Implementation / checks

- `pdcp-session.js`: per-side accounting and immutable report snapshots.
- `pdcp-v2.js`, `pdcp-v2.css`: control, secondary method selector, fit check, report and export.
- The original Device/Home renderers are retained. Legacy session clocks are gated by `state.pdcpV2`.
- New flow boots after the legacy dynamic renderer chain; no parallel session timer owns the V2 data.

```sh
node --test tests/pdcp-session.test.cjs
```
