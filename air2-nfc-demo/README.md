# Air2 NFC & App Clip Demo

Static interactive prototype for NFC entry, Clip quick controls, and full-app feature promotion.

Run locally: `python3 -m http.server 8769 --bind 127.0.0.1`

NFC, Bluetooth, accounts and app installation are simulated. Each completed session shows one randomly selected feature promotion, excluding the previous promotion.

Pairing UI follows Figma page 203:10854, frames 203:10944, 203:10895, 203:10972, 203:11002. NFC discovery lists only the invoked Air2 target; unrelated nearby devices from the reference are not simulated. Scan -> select target -> Connect -> progress -> success -> Done -> full App.
