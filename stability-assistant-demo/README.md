# Air2 interactive H5 demo

Run locally:

```sh
python3 -m http.server 4173 --directory air2-h5-demo
```

This is a DOM/CSS/JavaScript implementation. It does not use a full-screen Figma export or a click-through image map. The Figma-exported assets used by the current build are under `assets/figma-v2`.

Implemented states follow the Figma nodes:

1. Device (`1:13028`) → Breast Pump home (`1:13118`) → Pump Control (`1:18104`).
2. Start → Fit Check overlay with posture/alignment progression (`1:14443`).
3. Manual Stimulation with mode tabs, Auto Switch, left/right level tracks, Both control, and speed selector.
4. Running control layout (`1:18307`) with live time/volume, Auto Switch to Expression, pause, and hold to finish.
5. Full program list with expanded Milk Boost (`1:16863`) → confirmation (`1:19722`).
6. Log Pumping Amount (`1:13633`) → Logged feedback (`3:5292`).

## Review mode

Open `http://127.0.0.1:4173/?review=1`.

Select **Mark screen**, click the exact target, and write the adjustment. **Export JSON** downloads the notes; attaching that file here lets the next revision target the active screen, overlay state, and exact x/y coordinate.
