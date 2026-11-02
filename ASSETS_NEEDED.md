# ASSETS NEEDED — Chaya Rush

Status: **planning / placeholders only.** Nothing in this list has been
downloaded yet except Three.js and the Malayalam font. No accounts created,
no money spent, no unverified asset used.

Art direction: **semi-realistic** (stylized realism). Prioritise cohesive PBR-ish
models with believable scale over photoreal scans.

Scale convention: **1 unit = 1 metre**. Standing customer eye height ≈ 1.6–1.7 m.
Self-check: this shop interior is 10 × 8 m with a 3.3 m ceiling.

Preferred format: **`.glb`** (binary glTF), with embedded textures where possible.
Animation must be embedded as glTF animation clips (not separate video).

---

## 1. Furniture & shop fittings

| Asset | Needed for | Format | Notes |
| --- | --- | --- | --- |
| Wooden table (×3 variants) | Seating | GLB | ~1.2 × 0.8 m, 0.76 m top |
| Bench (×2 variants) | Seating | GLB | ~1.2 m long |
| Stool | Tea counter | GLB | 0.5 m seat |
| Service counter | Tea station | GLB | ~4 m long, 1.0 m high |
| Glass snack cabinet | Snacks | GLB | ~1.9 × 2.05 × 0.6 m |
| Wall shelf + jars | Decor | GLB | 2 shelves |
| Ceiling fan | Atmosphere | GLB | Slow idle rotation |
| Hanging bulb + shade | Lighting | GLB | Emissive bulb |
| Rolled bamboo blind | Shop front | GLB | Optional |
| Wall clock | Decor | GLB | Optional |
| Cash box | Counter | GLB | Optional |

## 2. Tea-making props

| Asset | Needed for | Format | Notes |
| --- | --- | --- | --- |
| Large uruli / tea pot | Hero prop | GLB | Bronze/brass, ~1.5 m diameter |
| Stove | Under pot | GLB | Metal |
| Ladle | Serving | GLB | Steel |
| Kettle | Counter | GLB | Steel |
| Tea glasses (×6) | Serving | GLB | Thin glass, ~100 ml |
| Plates / tray | Serving | GLB | Ceramic + steel |
| Snack tongs | Serving | GLB | Optional |

## 3. Food items

One small scan/model per item, or a shared “snack” set reskinned:

- samoosa, pazhampori, chickenroll, paripuvada, ullivada, mutta baji,
  uzhnnvada, bonda, sugiyan.

Format: GLB, low-poly, PBR. Small props (5–12 cm). Can be approximate; they are
behind glass or on plates.

## 4. Characters (hardest to source)

| Asset | Needed for | Format | Animation clips |
| --- | --- | --- | --- |
| Tea-maker | Behind counter | Rigged GLB | idle, pour, hand-over |
| Customer A/B/C (variants) | Seated orders | Rigged GLB | seated idle, sip, nod, complain |
| Standing customer | Front counter | Rigged GLB | idle, order, pay |

Requirements:
- Humanoid rig, ~1.6–1.75 m tall.
- Embedded or retargetable animation.
- Clothing should read as South Indian / Kerala casual.
- Variants should be visually distinguishable at a glance (different shirts,
  skin tones, hair) so orders are easy to attribute.

> I **cannot** hand-model, texture, rig or animate believable humans. These must
> be sourced or commissioned. Until then, customers are clearly marked
> placeholder primitive figures with DOM order cards.

## 5. Animation list (if bought/sourced separately)

- `idle_standing`, `idle_seated`
- `pour_tea` (teapot → glass)
- `serve_item` (hand over plate/glass)
- `sip_tea`
- `nod_yes`
- `complain_wait`
- `count_cash` (optional)
- `fan_idle` (could be code-driven)

## 6. Environment / exterior

- Street ground + footpath (can stay procedural for now)
- Palm / coconut tree silhouettes
- Utility poles + wires
- Distant buildings
- Shop signage board (Malayalam; can be a canvas texture initially)
- Dusk sky (procedural for now)
- Rain / puddle variants (optional, later)

## 7. Audio

- Street ambience (birds, distant traffic, occasional horn)
- Tea pour + glass clink
- Crowd murmur
- Snack cabinet open/close
- Coin/cash sound (fictional rupees)
- Optional light background music (license must allow commercial/game use)

---

## Candidate sources (to verify per asset — not yet used)

| Source | Typical license | Account? | Notes |
| --- | --- | --- | --- |
| Quaternius | CC0 | No | Low-poly props/characters, good starting point |
| Kenney | CC0 | No | Props, UI, audio |
| Poly Pizza | CC0 / CC-BY | No | Aggregator; check each model |
| Sketchfab | varies (CC0/CC-BY/etc.) | Sometimes | Must check license per model |
| Khronos glTF-Sample-Assets | varies | No | Reference models, not always game-ready |
| Mixamo | Adobe terms | **Yes** | Do NOT use without owner approval |

Rules we will follow:
1. Verify the license **on the asset page** and record it in `LICENSES.md`.
2. Keep attribution text where required.
3. No spending, account creation or unverified downloads without approval.
4. Prefer `.glb`; convert `.fbx`/`.obj` only if the license allows it.

---

## How to import assets (when approved)

1. Drop files in `assets/models/` using lowercase names, e.g.
   `table_wood_01.glb`, `teapot_uruli.glb`, `customer_a.glb`.
2. Add a loader module (next stage) using the already-vendored loader:
   ```js
   import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
   ```
3. Load once, then **clone** instances:
   - static props → `mesh.clone()`
   - skinned characters → `SkeletonUtils.clone()` (already vendored).
4. Create one `THREE.AnimationMixer` per animated instance and play clips by name.
5. Place using the anchors returned by `buildShop().anchors`:
   - `teaCounter`, `pot`, `cabinet`, `tables[]`, `customerEntry`.
6. Keep the placeholder badging in the HUD until each category is replaced.

If a model needs Draco compression, we must vendor `DRACOLoader` + the decoder
first (not included yet). Avoid Draco for now.
