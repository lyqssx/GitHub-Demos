# V3 Pro Stability Assistant interactive H5 demo

Open `index.html` directly as a static page. The demo is implemented with DOM, CSS, and JavaScript and does not require a local server.

## Current V3 Pro scope

1. The product visuals use one centered V3 Pro console, including the Pump Control hero and the Breast Pump home dock.
2. V3 Pro does not expose sensor-led Auto Switch. Manual mode and Milk Boost remain available.
3. Fit Check contains the two V3 Pro checks: `Suction` and `Battery`. Battery status is available immediately; Suction waits for a manual trigger result and does not complete automatically.
4. A slight in-session leak is compensated in the background and is recorded for the session summary.
5. A serious leak during Fit Check or pumping pauses the flow and opens the same three-step guidance immediately: tubing connection, cup assembly, and nipple/channel positioning.
6. V3 Pro cannot locate the leak side or exact leak source, so the guidance always asks the user to review all three causes.
7. Confirming the third guidance page starts `Checking air seal` immediately. A normal result closes the panel, resumes pumping, and shows a confirmation that disappears automatically; `Skip` returns to Pump Control while keeping pumping paused and the serious-leak status visible. The resulting record remains marked abnormal.
8. A failed recheck offers `Review guidance` and `Ignore for now`. Ignore returns to Pump Control while keeping pumping paused and a persistent serious-leak status visible. Pumping resumes only after the user presses the existing resume control.
9. The Logged sheet reuses the same three-step wear guide and images. Users can review tubing connection, cup assembly, and nipple positioning without leaving the session result.

## Event triggers

All detection events are reviewer-triggered. There are no timed leak, let-down, posture, alignment, or battery event sequences.

- `Suction normal` — passes Fit Check or resolves a recheck, depending on the active stage.
- `Suction check failed` — fails Fit Check or returns a failed recheck result.
- `Slight leak` — triggers background compensation during pumping.
- `Serious leak` — pauses pumping and starts the serious-leak flow.

The serious-leak guidance supports previous/next controls beside the guidance image, horizontal swipe, and keyboard arrow keys. Page dots remain at the bottom of the panel.
