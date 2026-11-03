# ചായക്കട ☕

A small, warm, cartoon **3D Kerala chayakkada** that runs in the browser. You
are the chaiwala behind the counter for one unhurried evening: customers walk in
from the street, order in Malayalam, you make their tea and snacks, carry the
tray over and settle the bill. Rain comes and goes, dogs nap inside, and the
street keeps moving outside.

The repo/folder is still called `chaya-rush` for continuity, but the game itself
is **ചായക്കട**. Every line the player sees is Malayalam script.

> **Art status:** the whole scene is procedural, flat-colour placeholder art
> built from Three.js primitives and canvas textures. It is intentionally
> cartoon-styled (soft shapes, warm dusk palette), not realistic. Final authored
> models are not imported yet — see `ASSETS_NEEDED.md`.

---

## Why Three.js?

Three.js (r187.0, MIT) was chosen because it:

- runs in any modern browser with WebGL2, with no engine install;
- handles lighting, shadows, fog and a stylised low-poly look well;
- can load **GLB/glTF** models with skeletal animation via the vendored
  `GLTFLoader` when final art arrives;
- works **without Node or a build step** using ES modules + an import map, so
  this project only needs Python's static file server.

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

## How to play

| Action | Input |
| --- | --- |
| Look around | Hold **left mouse** and drag (or drag with one finger) |
| Look with keyboard | **Arrow keys** or **WASD** |
| Free look (pointer lock) | **Double-click** the canvas; **Esc** releases |
| Select a customer | **Click the customer**, their speech bubble, or their order card |
| Prepare an item | Click the item line in the **order panel** (right side) |
| Carry the tray | Click **എടുത്ത് കൊണ്ടുപോകൂ** |
| Hand the tray over | Press **Space** or click **കൊടുക്കൂ** |
| Open the menu | Press **M** or click **മെനു** |
| Close a panel / cancel | **Esc** or the **×** button |
| Deselect a customer | **Esc** |

There is no timer, score, or fail state — just a shift that keeps going. The HUD
tracks **വരുമാനം** (earnings) and **സേവിച്ചത്** (items served).

### The serving rhythm

1. A customer walks in and speaks their order in Malayalam.
2. Click them to open the order panel. Each line becomes a button.
3. Click a line to prepare it. Clicking a **×2** line prepares **both** units, so
   a tray is never half-loaded by accident.
4. When something is ready, press **എടുത്ത് കൊണ്ടുപോകൂ**. The camera becomes
   first-person: the chaiwala's hands and tray come into frame and walk to the
   customer.
5. Press **Space** / **കൊടുക്കൂ** to hand it over. The camera walks back to the
   counter automatically.
6. Once every item is served the customer thanks you, then asks for the bill.
   Click **ബിൽ**, then **ബിൽ കൊടുക്കൂ** to settle it.

### Seating and special cases

- **Bench customers** — you carry the tray over, first-person.
- **Counter customers** — handed over instantly, with a quick tray flash.
- **Standing / outside-bench customers** — you carry the tray outside.
- **Kids** — a child asks **“ചേട്ടാ, ഇതിന് എത്രയാ?”**. Pick the correct
  chocolate price (₹5). Right answer: **“ഇത് രണ്ടെണ്ണം!”** and they buy two.
  Wrong answer: they leave without buying.
- **Patience** — a customer complains at **45 s** and gives up at **60 s**.
  After asking for the bill, they wait **24 s** before leaving.
- **Rain** — grey sky, rain streaks, a wet road that dries afterwards. Customers
  comment on the rain; the owner says **“നല്ല മഴ അല്ലേ!”**. Dogs shelter inside
  during the rain and head back out when it stops.
- **Street life** — dogs wander and occasionally fight (the owner shoos them),
  vehicles pass, and neighbours walk by with umbrellas.

---

## The menu

Prices are fictional in-game rupees and live in `src/config/menu.js`.

| Item | Malayalam | Price |
| --- | --- | --- |
| Tea | ചായ | ₹12 |
| Strong tea | കട്ടൻ ചായ | ₹10 |
| Coffee | കാപ്പി | ₹12 |
| Boost | ബൂസ്റ്റ് | ₹15 |
| Samosa | സമോസ | ₹15 |
| Banana fritter | പഴംപൊരി | ₹15 |
| Chicken roll | ചിക്കൻ റോൾ | ₹20 |
| Parippu vada | പരിപ്പുവട | ₹15 |
| Ulli vada | ഉള്ളിവട | ₹12 |
| Egg bajji | മുട്ട ബജി | ₹15 |
| Uzhunnu vada | ഉഴുന്നുവട | ₹12 |
| Bonda | ബോണ്ട | ₹12 |
| Sugiyan | സുഗിയൻ | ₹12 |
| Chocolate (kids) | ചോക്ലേറ്റ് | ₹5 |

`MENU_ITEMS` is the single source for IDs, labels, prices and spoken-order
grammar. The chocolate price is set once in `CHOCOLATE.price` and the kid price
buttons are generated from `CHOCOLATE_PRICE_CHOICES`.

---

## Project structure

```
chaya-rush/
├─ index.html              # canvas, start screen, HUD, bill/kid/menu modals
├─ styles.css              # HUD, bubbles, panels, modals, @font-face
├─ serve.py                # dev server with no-store caching
├─ src/
│  ├─ main.js              # boot, intro, input, frame loop, debug handle
│  ├─ config/
│  │  ├─ layout.js         # shop/spot/service/camera/street coordinates
│  │  ├─ menu.js           # items, prices, spoken-order grammar
│  │  └─ strings.ml.js     # ALL player-facing Malayalam text
│  ├─ game/
│  │  ├─ customers.js      # customer lifecycle, orders, patience, paths
│  │  └─ session.js        # shift loop, prep/carry/give/bill/kid logic
│  ├─ player/
│  │  └─ camera.js         # seat look, intro flight, carry + tray
│  ├─ world/
│  │  ├─ art.js            # palette, materials, primitives, textures
│  │  ├─ people.js         # people, dogs, food meshes, poses
│  │  ├─ scene.js          # renderer, sky, lights, street, weather, traffic
│  │  └─ shop.js           # chayakkada geometry, signage, seats
│  └─ ui/
│     └─ hud.js            # DOM HUD, bubbles, order panel, modals
├─ assets/
│  ├─ fonts/               # Noto Sans Malayalam + OFL.txt
│  ├─ models/              # empty — final GLB assets go here
│  └─ audio/               # empty — future ambience/SFX
├─ vendor/three/           # vendored Three.js r187.0 + MIT LICENSE
├─ ASSETS_NEEDED.md
├─ DIALOGUE_DRAFTS.md
├─ LICENSES.md
└─ README.md
```

### Key conventions

- **Axes:** the shop opens toward **−z**; **+z** is the back wall. People face
  **+z** at yaw `0`.
- **Scale:** 1 unit = 1 metre. Standing eye height ≈ 1.6–1.7 m.
- **Coordinates:** shop front `z = -4.2`, back `z = 4.2`, width `9.6`. Owner eye
  is `(0.35, 1.52, 3.42)`, looking down the shop.
- **Text:** never add player-visible Manglish. Put new copy in
  `src/config/strings.ml.js` and new prices/labels in `src/config/menu.js`.

---

## Verification log

Automated checks were run in the in-app Chromium browser (WebGL2, Intel Iris Xe)
with **0 console errors / 0 warnings** unless noted.

### Layout, camera and look

- Page serves over HTTP, boots, hides the loading overlay and shows the start
  screen.
- Noto Sans Malayalam loads; Malayalam and `₹` glyph metrics are non-zero.
- Drag/keyboard look works; pitch clamps; camera stays in the owner's seat.
- The exterior dusk establishing shot and the 7.4 s intro flight into the seat
  complete without camera errors.
- Carry camera paths were exercised for bench, counter and outside spots; the
  defensive `sampleCurve()` fallback prevents Catmull-Rom endpoint crashes.

### Serving and money

- A **1×ചായ + 2×ബോണ്ട** order was prepared, carried and given: **3 items**
  delivered, **₹36** earned, order completed, bill total **₹36**.
- Partial delivery pays only for what actually left the counter; a second trip
  for the missing unit cannot double-charge.
- Counter customers are served instantly; seated/outside customers use the
  first-person tray walk and Space/button hand-over.
- Bill request opens the bill modal, and **ബിൽ കൊടുക്കൂ** settles it and shows
  the owner's thank-you.

### Kids and rain

- Kid flow: correct ₹5 answer → “ഇത് രണ്ടെണ്ണം!” → 2 chocolates served →
  **₹10** earned, no bill requested.
- Wrong price → kid leaves without buying.
- `forceRain(true)` shows the rain chip/owner line and wet road; `forceRain(false)`
  dries the road and shows the “rain stopped” toast.
- Dog-fight / dog-shoo world events surface the correct Malayalam lines.

### Long-run simulation

A scripted bot played a **240-second shift**:

- **21 spawns**, **20 completed orders**, **40 items served**, **₹463** earned;
- **0 complaints**, **0 give-ups**, **0 console errors or warnings**;
- 13 menu items plus chocolate all resolve to a valid label and price.

**Needs a human visual check** (this model cannot judge composition, and
screenshots cannot be relied on in this environment):

- Framing/scale of customers at the bench, counter and outside spots.
- Whether the carry camera and tray read naturally at the player's window size.
- Malayalam shaping and the `₹` glyph at actual size in the order panel, menu
  board and modals.
- Overall dusk lighting: warm and inviting versus too dark.
- Performance on the target laptop (≈20 fps was observed with an unfocused tab;
  foreground performance should be verified).

---

## Troubleshooting

- **Blank screen / stuck loading:** check the PowerShell window for 404s and
  confirm you opened `http://127.0.0.1:5173/` (not `file://`).
- **“WebGL2 is not available”:** enable hardware acceleration in the browser.
- **Malayalam shows as boxes:** confirm `assets/fonts/NotoSansMalayalam-Variable.ttf`
  exists and reload with `Ctrl+F5`.
- **Old version cached:** hard refresh with `Ctrl+F5`.
- **Cannot prepare an item:** select a customer first; the order panel only
  enables lines while that customer is ordering or complaining.
- **Cannot give the tray:** the **കൊടുക്കൂ** button and Space only work after the
  camera reaches the customer.
- **Bill button missing:** the customer must have received every item and asked
  for the bill.

---

## Not in this build yet

- Final authored art, rigged character models and final textures
- Sound effects, ambience or music
- Saved progress, accounts, backend or real money
- Expanded street storylines beyond the current ambient events
