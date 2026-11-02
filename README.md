# Chaya Rush 🌴☕

An interactive 3D Kerala **chayakkada** (tea shop) for the web.
**Current build: Stage 2 — customers, Malayalam orders, serving and a 60-second round.**

> ⚠️ **All current 3D geometry, materials and textures are PLACEHOLDER ART.**
> They exist to test layout, scale, camera, mood and game flow — not final
> quality. Art direction is locked to **semi-realistic** (owner decision 1:B),
> but final assets are not imported yet. See `ASSETS_NEEDED.md`.

---

## Why Three.js?

Three.js (r187.0, MIT license) was chosen because it:

- runs in any modern browser with WebGL2, no engine install;
- loads **GLB/glTF** with skeletal animation via the official `GLTFLoader`;
- has mature lighting, shadows, fog and material support for a semi-realistic look;
- works **without Node or a build step** using ES modules + an import map,
  so this project only needs Python's static file server.

Alternatives considered: Babylon.js (heavier for this scope), PlayCanvas
(editor-centric), react-three-fiber (adds React + build tooling).

---

## Requirements

- Windows 10/11
- **Python 3.12+** (already installed on this laptop: `py -3` → 3.13.7)
- A current browser with WebGL2: Edge, Chrome, or Firefox
- **No Node.js / npm required**

---

## Run it (exact commands)

Open **PowerShell** and run:

```powershell
cd "C:\Users\fidha\OneDrive\Documents\Default Project\chaya-rush"
py -3 serve.py
```

Then open this URL in your browser:

```
http://127.0.0.1:5173/
```

Stop the server with `Ctrl+C` in the PowerShell window.

If port 5173 is busy, pass another port (e.g. `py -3 serve.py 5174`) and open
the matching URL.

`serve.py` is the same static server as `python -m http.server`, but it sends
`Cache-Control: no-store` so edited JS/CSS/fonts are never served stale during
development. (Plain `http.server` may answer edited ES modules with `304`, which
is why a normal reload can appear to ignore your changes.)

Fallback without `serve.py` (then use `Ctrl+F5` after every edit):

```powershell
py -3 -m http.server 5173 --bind 127.0.0.1
```

### Why not double-click `index.html`?

Browsers block ES module imports, local font loading and future `.glb` fetches
on the `file://` protocol. The game must be served over `http://`. Double-clicking
the HTML file will show a loading screen that fails.

---

## How to play (Stage 2)

| Action | Input |
| --- | --- |
| Look around | Hold **left mouse** and drag (or drag with one finger) |
| Look with keyboard | **Arrow keys** or **WASD** |
| Select a customer | **Click the customer** or **click their order card** |
| Serve an item | Click the matching item in the bottom **serve dock** |
| Pointer lock (free look) | **Double-click** the canvas |
| Release pointer lock | **Esc** |
| Play again after the round | Click **Play again** (or press **R**) |

### Round rules

- The round lasts **60 seconds**.
- A customer arrives every 5.5–8 seconds, up to **3 seated at once**.
- Each order asks for **1–3 distinct menu items**.
- Orders are shown in **Malayalam script** on cards above each customer.
- Item IDs and prices are validated against `src/config/menu.js` — the only
  source for prices and earnings.
- Serving a correct item pays that item's price and shows an approved Malayalam
  thank-you line. A wrong item is rejected and pays nothing.
- Completing every item in an order finishes it; the customer thanks you and
  leaves, freeing the seat.
- At 0 seconds the round ends with a summary of earnings, orders completed and
  items served.

### Patience caveat (needs an owner decision)

Per-customer patience is currently **60 seconds** (`GAME_RULES.customerPatienceSec`),
separate from the 60-second round. Because both are 60, a customer who arrives
after the round starts cannot run out of patience before the round ends — so in
a normal round the complaint state is not reachable. The code path exists and
was tested by forcing patience to expire. **Ask before lowering this value**
(e.g. 30–40 s) so complaints can happen naturally.

---

## Project structure

```
chaya-rush/
├─ index.html              # canvas, HUD, order cards, results, import map
├─ serve.py                # dev server with no-store caching
├─ styles.css              # HUD, order cards, serve dock, overlays, @font-face
├─ src/
│  ├─ main.js              # boot, render loop, selection raycast, resize
│  ├─ config/
│  │  ├─ menu.js           # SINGLE source for IDs, prices, earnings
│  │  ├─ strings.ml.js     # approved Malayalam labels + dialogue
│  │  └─ game.js           # round duration and per-customer patience
│  ├─ game/
│  │  ├─ customers.js      # seats, placeholder people, patience, leaving
│  │  └─ session.js        # spawning, serving validation, earnings, round end
│  ├─ player/
│  │  └─ lookControls.js   # seated drag/keyboard/pointer-lock look
│  ├─ world/
│  │  ├─ scene.js          # renderer, sky, street, lights
│  │  └─ shop.js           # interior layout (placeholder geometry)
│  └─ ui/
│     ├─ hud.js            # loading / timer / score / toast / results
│     └─ orders.js         # projected order cards + serving dock
├─ assets/
│  ├─ fonts/               # Noto Sans Malayalam + OFL.txt
│  ├─ models/              # empty — GLB assets go here (see ASSETS_NEEDED.md)
│  └─ audio/               # empty — future ambience/SFX
├─ vendor/three/           # vendored Three.js r187.0 + MIT LICENSE
├─ ASSETS_NEEDED.md
├─ DIALOGUE_DRAFTS.md
├─ LICENSES.md
└─ README.md
```

---

## Decisions already locked

- **Art direction:** 1:B — semi-realistic (stylized realism).
- **Timing:** 2:A — 60-second round with a **separate per-customer patience timer**.
- **Currency:** fictional in-game rupees only. Prices live in `src/config/menu.js`.
- **Malayalam:** item spellings and thank-you/complaint lines were approved by the
  owner and are now wired from `src/config/strings.ml.js`.

Still open (do not treat as final):

- Per-customer patience value: currently 60 s, which cannot expire within the round.
- Streak bonus amounts (`GAME_RULES.streakBonus` is `null`).
- Human visual review of the placeholder scene and card layout.

---

## What is intentionally NOT in this stage

- Final semi-realistic art, authored GLB models, rigged characters, final textures
- Sound effects, ambience, music
- Streak bonuses (no amounts approved)
- Walking movement (the player stays seated)
- Saved progress, accounts, backend, or real money

---

## Verification log

Automated checks were run in the in-app Chromium browser (WebGL2, Intel Iris Xe).

### Stage 1 — layout + look-around

- Page serves over HTTP and boots with **0 console errors / 0 warnings**.
- `window.__CHAYA_RUSH__.ready === true`; loading overlay hides, HUD appears.
- Drag/keyboard look works; pitch clamps at 52°; camera stays seated.
- Noto Sans Malayalam loads; Malayalam and `₹` glyph metrics are non-zero.
- Warm render after baking shadows ≈ **8.8 ms/frame** at 1200×789, DPR 1.5.

### Stage 2 — orders + serving

- Boots with **0 console errors / 0 warnings**.
- All **13** menu buttons render with Malayalam labels and prices read from
  `src/config/menu.js` (e.g. ചായ ₹12, ചിക്കൻ റോൾ ₹20).
- Orders render as Malayalam cards anchored above customers; a fresh card is
  created for each arrival and removed after departure.
- Wrong-item serve returns `not-in-order`, adds **₹0** and does not change the order.
- Correct serves add exactly the configured price (test: kaapi + sugiyan =
  **₹24**), show an approved thank-you line, and complete the order.
- Patience expiry switches the card to the complaint state, keeps the order
  visible, and shows an approved Malayalam complaint (tested by forcing patience).
- Round end shows the results overlay with earnings, completed orders and items
  served; **Play again** resets the round, customers, earnings and timer.
- Three order cards were checked at an 800×526 viewport: no card rectangles
  overlap, and none collide with the top score bar or the serve dock.
- 3D raycast selection hits a customer; order cards are also clickable/keyboard
  selectable.
- Draw stats during play: ~200 draw calls, ~10–11k triangles, 60 fps in the
  in-app browser viewport.

**Needs a human visual check** (I cannot judge composition or art quality, and
this model cannot view screenshots):

- Framing/scale of customers at the three seats, and whether they intersect
  tables or benches.
- Whether the order cards point clearly at the right customer when they shift
  to avoid overlap.
- Whether the bottom serve dock is readable and not too tall at your window size.
- Malayalam shaping and `₹` glyph at actual size in the cards, dock and menu board.
- Overall dusk lighting: warm/inviting versus too dark.

## Troubleshooting

- **Blank screen / stuck loading:** check the PowerShell window for 404s and
  confirm you opened `http://127.0.0.1:5173/` (not `file://`).
- **“WebGL2 is not available”:** enable hardware acceleration in the browser.
- **Malayalam shows as boxes:** confirm `assets/fonts/NotoSansMalayalam-Variable.ttf`
  exists and reload with `Ctrl+F5`.
- **Old version cached:** hard refresh with `Ctrl+F5`.
- **Serving does nothing:** select a customer first (click the person or their
  order card); the selected card gets an amber outline.
