import * as THREE from "three";
import { MENU_ITEMS, CURRENCY_SYMBOL } from "../config/menu.js";
import { MENU_LABELS_ML, UI_LABELS_ML } from "../config/strings.ml.js";

/**
 * CHAYA RUSH — Stage 1 interior.
 *
 * ⚠️ EVERYTHING in this file is PLACEHOLDER ART: primitive geometry and
 * procedural canvas textures used to test layout, scale, camera and mood.
 * It is intentionally NOT final semi-realistic art. Replace with authored
 * GLB assets (see ASSETS_NEEDED.md) without changing game logic.
 */

const ROOM = {
  width: 10,
  depth: 8,
  height: 3.3,
  frontZ: 4,
  backZ: -4,
};

export function buildShop({ scene, renderer }) {
  const group = new THREE.Group();
  group.name = "chayakkada";
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const textures = createTextures(maxAniso);
  const mats = createMaterials(textures);
  const animated = { fans: [], steam: null, dust: null, bulbs: [] };

  const shell = buildShell(mats);
  group.add(shell);

  const tea = buildTeaStation(mats, textures);
  group.add(tea.group);

  const cabinet = buildGlassCabinet(mats, textures);
  group.add(cabinet);

  const tables = buildTables(mats, textures);
  group.add(tables.group);

  const decor = buildDecor(mats, textures);
  group.add(decor.group);

  const lights = buildLighting(mats, animated);
  group.add(lights);

  const atmosphere = buildAtmosphere(textures, tea.steamOrigin, animated);
  group.add(atmosphere);

  scene.add(group);

  const anchors = {
    teaCounter: tea.counterAnchor,
    pot: tea.potAnchor,
    cabinet: new THREE.Vector3(3.0, 1.05, -3.25),
    tables: tables.tableAnchors,
    customerEntry: new THREE.Vector3(0, 0, 4.6),
  };

  function update(dt, elapsed) {
    for (const fan of animated.fans) fan.rotation.y += dt * 1.35;

    // Gentle bulb flicker (atmosphere only).
    for (const { light, base } of animated.bulbs) {
      light.intensity = base * (0.94 + 0.06 * Math.sin(elapsed * 7.3 + base));
    }

    if (animated.steam) updateSteam(animated.steam, dt, elapsed);
    if (animated.dust) updateDust(animated.dust, elapsed);
  }

  return { group, update, anchors, room: ROOM };
}

/* ================================================================== */
/*  Procedural textures (temporary, replaces with authored maps later) */
/* ================================================================== */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"), w, h);
  return canvas;
}

function canvasTexture(canvas, { srgb = true, repeat = [1, 1], aniso = 1 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = aniso;
  return tex;
}

function woodCanvas(seed, base = "#6b482c") {
  return makeCanvas(512, 512, (ctx, w, h) => {
    const rand = mulberry32(seed);
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, base);
    grad.addColorStop(0.5, "#7a5432");
    grad.addColorStop(1, "#5a3a22");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 190; i++) {
      const x = rand() * w;
      const y0 = rand() * h;
      const len = 60 + rand() * 260;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.bezierCurveTo(
        x + 8 + rand() * 14, y0 + len * 0.3,
        x - 8 - rand() * 14, y0 + len * 0.7,
        x + (rand() - 0.5) * 20, y0 + len
      );
      ctx.strokeStyle = `rgba(${30 + rand() * 26}, ${16 + rand() * 14}, 8, ${0.04 + rand() * 0.13})`;
      ctx.lineWidth = 0.6 + rand() * 2.4;
      ctx.stroke();
    }

    // Knots
    for (let i = 0; i < 5; i++) {
      const x = rand() * w;
      const y = rand() * h;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rand() * Math.PI);
      for (let r = 14; r > 2; r -= 3) {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.8, r, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(30, 16, 8, ${0.08 + rand() * 0.1})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      ctx.restore();
    }
  });
}

function makeTileCanvas() {
  return makeCanvas(512, 512, (ctx, w, h) => {
    const rand = mulberry32(42);
    ctx.fillStyle = "#4a2a1d";
    ctx.fillRect(0, 0, w, h);
    const cols = 4;
    const rows = 4;
    const gap = 5;
    const tw = w / cols;
    const th = h / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const shade = 0.82 + rand() * 0.3;
        const r = Math.round(146 * shade);
        const g = Math.round(82 * shade);
        const b = Math.round(58 * shade);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x * tw + gap, y * th + gap, tw - gap * 2, th - gap * 2);

        // Subtle mottling on each tile
        for (let i = 0; i < 26; i++) {
          ctx.fillStyle = `rgba(${40 + rand() * 40}, ${20 + rand() * 20}, 12, ${rand() * 0.09})`;
          const sx = x * tw + gap + rand() * (tw - gap * 2);
          const sy = y * th + gap + rand() * (th - gap * 2);
          ctx.beginPath();
          ctx.arc(sx, sy, 1 + rand() * 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  });
}

function makePlasterCanvas() {
  return makeCanvas(512, 512, (ctx, w, h) => {
    const rand = mulberry32(7);
    ctx.fillStyle = "#d8c2a3";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = rand() * 26;
      const dark = rand() > 0.55;
      ctx.fillStyle = dark
        ? `rgba(120, 92, 62, ${rand() * 0.06})`
        : `rgba(255, 244, 224, ${rand() * 0.08})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // A few damp stains near the bottom (monsoon mood).
    for (let i = 0; i < 14; i++) {
      const x = rand() * w;
      const y = h * 0.72 + rand() * h * 0.28;
      ctx.fillStyle = `rgba(84, 60, 40, ${0.03 + rand() * 0.05})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 18 + rand() * 60, 10 + rand() * 40, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function makeMenuBoardCanvas() {
  return makeCanvas(1024, 640, (ctx, w, h) => {
    ctx.fillStyle = "#12201a";
    ctx.fillRect(0, 0, w, h);

    // Frame
    ctx.strokeStyle = "#c9a25a";
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.strokeStyle = "rgba(201,162,90,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 34, w - 68, h - 68);

    ctx.fillStyle = "#ffd9a0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '700 46px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
    ctx.fillText(UI_LABELS_ML.menuBoardTitle, w / 2, 88);

    ctx.strokeStyle = "rgba(201,162,90,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 126);
    ctx.lineTo(w - 120, 126);
    ctx.stroke();

    const colX = [70, 552];
    const rowStart = 178;
    const rowH = 54;
    const colWidth = 400;

    MENU_ITEMS.forEach((item, index) => {
      const col = index < 7 ? 0 : 1;
      const row = index % 7;
      const x = colX[col];
      const y = rowStart + row * rowH;
      const label = MENU_LABELS_ML[item.id] ?? item.id;

      ctx.textAlign = "left";
      ctx.font = '600 34px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillStyle = "#f3e3c8";
      ctx.fillText(label, x, y);

      ctx.textAlign = "right";
      ctx.font = '600 32px "Noto Sans Malayalam", "Segoe UI Symbol", sans-serif';
      ctx.fillStyle = "#ffc46b";
      ctx.fillText(`${CURRENCY_SYMBOL} ${item.price}`, x + colWidth, y);
    });
  });
}

function makePosterCanvas(title, subtitle) {
  return makeCanvas(512, 768, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#8f2f1e");
    grad.addColorStop(0.55, "#b8482a");
    grad.addColorStop(1, "#6d2417");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255, 220, 170, 0.75)";
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe3b3";
    ctx.font = '700 132px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
    ctx.fillText(title, w / 2, 210);

    // Simple tea-glass illustration
    const gx = w / 2;
    const gy = 400;
    ctx.fillStyle = "rgba(255, 227, 179, 0.16)";
    ctx.beginPath();
    ctx.moveTo(gx - 62, gy - 70);
    ctx.lineTo(gx + 62, gy - 70);
    ctx.lineTo(gx + 44, gy + 110);
    ctx.lineTo(gx - 44, gy + 110);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffe3b3";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "rgba(120, 60, 28, 0.85)";
    ctx.beginPath();
    ctx.moveTo(gx - 55, gy - 24);
    ctx.lineTo(gx + 55, gy - 24);
    ctx.lineTo(gx + 42, gy + 100);
    ctx.lineTo(gx - 42, gy + 100);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffd9a0";
    ctx.font = '600 48px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
    ctx.fillText(subtitle, w / 2, 620);

    ctx.font = '600 30px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
    ctx.fillStyle = "rgba(255, 227, 179, 0.8)";
    ctx.fillText("ചൂടുള്ള ചായ", w / 2, 690);
  });
}

function makeSoftParticleCanvas() {
  return makeCanvas(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(0.35, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function createTextures(aniso) {
  const wood = woodCanvas(11);
  const darkWood = woodCanvas(23, "#4a2f1c");
  const woodBump = makeCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    const rand = mulberry32(99);
    for (let i = 0; i < 160; i++) {
      ctx.strokeStyle = `rgba(${rand() > 0.5 ? 210 : 40}, ${rand() > 0.5 ? 210 : 40}, ${rand() > 0.5 ? 210 : 40}, 0.25)`;
      ctx.lineWidth = 1 + rand() * 3;
      ctx.beginPath();
      const x = rand() * w;
      const y = rand() * h;
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 10, y + 40, x - 10, y + 90, x, y + 140);
      ctx.stroke();
    }
  });

  return {
    wood: canvasTexture(wood, { repeat: [1, 1], aniso }),
    darkWood: canvasTexture(darkWood, { repeat: [1, 1], aniso }),
    woodBump: canvasTexture(woodBump, { srgb: false, repeat: [1, 1], aniso }),
    floor: canvasTexture(makeTileCanvas(), { repeat: [5, 4], aniso }),
    plaster: canvasTexture(makePlasterCanvas(), { repeat: [2, 1], aniso }),
    menuBoard: canvasTexture(makeMenuBoardCanvas(), { aniso }),
    poster: canvasTexture(makePosterCanvas("ചായ", UI_LABELS_ML.shopName), { aniso }),
    particle: canvasTexture(makeSoftParticleCanvas(), { srgb: true }),
  };
}

function createMaterials(t) {
  return {
    plaster: new THREE.MeshStandardMaterial({
      map: t.plaster,
      roughness: 0.96,
      metalness: 0,
    }),
    floor: new THREE.MeshStandardMaterial({
      map: t.floor,
      roughness: 0.78,
      metalness: 0.02,
    }),
    wood: new THREE.MeshStandardMaterial({
      map: t.wood,
      bumpMap: t.woodBump,
      bumpScale: 0.015,
      roughness: 0.68,
      metalness: 0.03,
    }),
    darkWood: new THREE.MeshStandardMaterial({
      map: t.darkWood,
      bumpMap: t.woodBump,
      bumpScale: 0.02,
      roughness: 0.72,
      metalness: 0.03,
    }),
    beam: new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.85 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.55, metalness: 0.65 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8d8a83, roughness: 0.35, metalness: 0.85 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xa8752f, roughness: 0.38, metalness: 0.75 }),
    copper: new THREE.MeshStandardMaterial({ color: 0x8a4a26, roughness: 0.42, metalness: 0.7 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xece1cd, roughness: 0.35 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xbfd8de,
      transparent: true,
      opacity: 0.16,
      roughness: 0.06,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    tea: new THREE.MeshStandardMaterial({ color: 0x3a1d0c, roughness: 0.22 }),
    snack: new THREE.MeshStandardMaterial({ color: 0xc98a3c, roughness: 0.7 }),
    snackDark: new THREE.MeshStandardMaterial({ color: 0x8a5520, roughness: 0.72 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x6d2f22, roughness: 0.95 }),
    menuBoard: new THREE.MeshStandardMaterial({ map: t.menuBoard, roughness: 0.8 }),
    poster: new THREE.MeshStandardMaterial({ map: t.poster, roughness: 0.85 }),
    bulb: new THREE.MeshStandardMaterial({
      color: 0xffe3b0,
      emissive: 0xffb45e,
      emissiveIntensity: 3.2,
      roughness: 0.35,
    }),
    lampShade: new THREE.MeshStandardMaterial({
      color: 0x1f1a16,
      roughness: 0.7,
      metalness: 0.35,
      side: THREE.DoubleSide,
    }),
  };
}

/* ================================================================== */
/*  Geometry helpers                                                   */
/* ================================================================== */

function box(w, h, d, mat, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (opts.ry) mesh.rotation.y = opts.ry;
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.rz) mesh.rotation.z = opts.rz;
  mesh.castShadow = opts.cast ?? true;
  mesh.receiveShadow = opts.receive ?? true;
  return mesh;
}

function cylinder(rt, rb, h, seg, mat, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  mesh.position.set(x, y, z);
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.rz) mesh.rotation.z = opts.rz;
  if (opts.ry) mesh.rotation.y = opts.ry;
  mesh.castShadow = opts.cast ?? true;
  mesh.receiveShadow = opts.receive ?? true;
  return mesh;
}

/* ================================================================== */
/*  Shell: floor, walls, ceiling, open shop front                      */
/* ================================================================== */

function buildShell(mats) {
  const g = new THREE.Group();
  g.name = "shell";

  // Interior floor
  const floor = box(ROOM.width + 0.4, 0.12, ROOM.depth + 0.4, mats.floor, 0, -0.06, 0, {
    cast: false,
    receive: true,
  });
  g.add(floor);

  // Threshold step at the open front
  g.add(box(ROOM.width, 0.16, 0.5, mats.darkWood, 0, 0.02, ROOM.frontZ + 0.2, { cast: false }));

  // Back wall
  g.add(box(ROOM.width + 0.3, ROOM.height, 0.18, mats.plaster, 0, ROOM.height / 2, ROOM.backZ - 0.09));

  // Side walls
  g.add(box(0.18, ROOM.height, ROOM.depth, mats.plaster, -ROOM.width / 2 - 0.09, ROOM.height / 2, 0));
  g.add(box(0.18, ROOM.height, ROOM.depth, mats.plaster, ROOM.width / 2 + 0.09, ROOM.height / 2, 0));

  // Skirting boards
  const skirtMat = mats.darkWood;
  g.add(box(ROOM.width, 0.18, 0.06, skirtMat, 0, 0.09, ROOM.backZ + 0.005, { cast: false }));
  g.add(box(0.06, 0.18, ROOM.depth, skirtMat, -ROOM.width / 2 + 0.005, 0.09, 0, { cast: false }));
  g.add(box(0.06, 0.18, ROOM.depth, skirtMat, ROOM.width / 2 - 0.005, 0.09, 0, { cast: false }));

  // Ceiling slab
  g.add(box(ROOM.width + 0.3, 0.14, ROOM.depth + 0.3, mats.beam, 0, ROOM.height + 0.07, 0, {
    cast: false,
    receive: true,
  }));

  // Ceiling beams
  for (const z of [-2.6, -0.4, 1.8, 3.7]) {
    g.add(box(ROOM.width + 0.1, 0.16, 0.18, mats.beam, 0, ROOM.height - 0.08, z));
  }

  // Open shop front: top beam + two posts
  g.add(box(ROOM.width + 0.2, 0.34, 0.24, mats.darkWood, 0, ROOM.height - 0.18, ROOM.frontZ));
  g.add(box(0.18, ROOM.height - 0.3, 0.18, mats.darkWood, -ROOM.width / 2 + 0.08, (ROOM.height - 0.3) / 2, ROOM.frontZ));
  g.add(box(0.18, ROOM.height - 0.3, 0.18, mats.darkWood, ROOM.width / 2 - 0.08, (ROOM.height - 0.3) / 2, ROOM.frontZ));

  // Rolled-up bamboo blind above the opening
  const blind = cylinder(0.13, 0.13, ROOM.width - 0.5, 12, mats.darkWood, 0, ROOM.height - 0.48, ROOM.frontZ + 0.02, {
    rz: Math.PI / 2,
  });
  g.add(blind);

  // Roof overhang outside
  g.add(box(ROOM.width + 1.2, 0.16, 1.9, mats.beam, 0, ROOM.height + 0.02, ROOM.frontZ + 0.95));

  // Left-wall window frame (decorative, placeholder)
  const frameMat = mats.darkWood;
  const wx = -ROOM.width / 2 + 0.03;
  g.add(box(0.1, 1.55, 0.1, frameMat, wx, 1.95, -1.9));
  g.add(box(0.1, 1.55, 0.1, frameMat, wx, 1.95, -0.3));
  g.add(box(0.1, 0.1, 1.7, frameMat, wx, 2.72, -1.1));
  g.add(box(0.1, 0.1, 1.7, frameMat, wx, 1.18, -1.1));
  for (let i = 0; i < 4; i++) {
    g.add(box(0.06, 1.5, 0.05, frameMat, wx + 0.02, 1.95, -1.85 + i * 0.5, { cast: false }));
  }

  return g;
}

/* ================================================================== */
/*  Tea station                                                        */
/* ================================================================== */

function buildTeaStation(mats) {
  const g = new THREE.Group();
  g.name = "tea-station";

  const cx = -2.2;
  const cz = -3.35;
  const counterH = 1.0;
  const counterW = 4.2;
  const counterD = 0.8;

  // Counter body
  g.add(box(counterW, counterH, counterD, mats.darkWood, cx, counterH / 2, cz));
  // Counter top
  g.add(box(counterW + 0.16, 0.08, counterD + 0.16, mats.wood, cx, counterH + 0.04, cz));
  // Front slats for texture break-up
  for (let i = 0; i < 9; i++) {
    g.add(
      box(0.06, counterH - 0.12, 0.04, mats.beam, cx - counterW / 2 + 0.25 + i * 0.44, counterH / 2, cz + counterD / 2 + 0.02, {
        cast: false,
      })
    );
  }

  // Back shelf
  const shelfZ = ROOM.backZ + 0.16;
  g.add(box(3.6, 0.07, 0.34, mats.wood, cx, 1.62, shelfZ));
  g.add(box(3.6, 0.07, 0.34, mats.wood, cx, 2.12, shelfZ));
  g.add(box(0.07, 1.0, 0.34, mats.darkWood, cx - 1.78, 1.9, shelfZ));
  g.add(box(0.07, 1.0, 0.34, mats.darkWood, cx + 1.78, 1.9, shelfZ));

  // Jars + glasses on shelves (placeholder props)
  const jarSpots = [-1.45, -0.95, -0.45, 1.0, 1.5];
  jarSpots.forEach((offset, i) => {
    const jar = cylinder(0.11, 0.13, 0.26, 12, i % 2 ? mats.glass : mats.ceramic, cx + offset, 1.78, shelfZ);
    g.add(jar);
    g.add(cylinder(0.12, 0.12, 0.03, 12, mats.darkWood, cx + offset, 1.92, shelfZ));
  });
  for (let i = 0; i < 5; i++) {
    g.add(cylinder(0.055, 0.045, 0.16, 10, mats.glass, cx + 0.55 + i * 0.12, 2.24, shelfZ, { cast: false }));
  }

  // Stove block on the counter
  g.add(box(0.95, 0.14, 0.7, mats.metal, cx - 0.35, counterH + 0.15, cz));
  g.add(cylinder(0.24, 0.28, 0.08, 16, mats.metal, cx - 0.35, counterH + 0.26, cz));

  // Large uruli (tea pot) — lathe profile
  const profile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.3, 0.0),
    new THREE.Vector2(0.52, 0.05),
    new THREE.Vector2(0.7, 0.16),
    new THREE.Vector2(0.76, 0.3),
    new THREE.Vector2(0.74, 0.36),
    new THREE.Vector2(0.7, 0.37),
  ];
  const pot = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), mats.brass);
  pot.material = mats.brass.clone();
  pot.material.side = THREE.DoubleSide;
  pot.position.set(cx - 0.35, counterH + 0.3, cz);
  pot.castShadow = true;
  pot.receiveShadow = true;
  g.add(pot);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 10, 40), mats.brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(cx - 0.35, counterH + 0.67, cz);
  rim.castShadow = true;
  g.add(rim);

  // Tea surface
  const teaSurface = new THREE.Mesh(new THREE.CircleGeometry(0.67, 40), mats.tea);
  teaSurface.rotation.x = -Math.PI / 2;
  teaSurface.position.set(cx - 0.35, counterH + 0.62, cz);
  g.add(teaSurface);

  // Handles
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 20, Math.PI), mats.brass);
    handle.rotation.z = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    handle.rotation.x = Math.PI / 2;
    handle.position.set(cx - 0.35 + side * 0.78, counterH + 0.55, cz);
    handle.castShadow = true;
    g.add(handle);
  }

  // Ladle
  const ladleHandle = cylinder(0.018, 0.018, 0.62, 8, mats.steel, cx + 0.02, counterH + 0.95, cz + 0.05, {
    rz: Math.PI / 2.6,
  });
  g.add(ladleHandle);
  g.add(cylinder(0.09, 0.07, 0.06, 12, mats.steel, cx + 0.3, counterH + 0.72, cz + 0.05));

  // Small kettle + cups
  g.add(box(0.24, 0.2, 0.2, mats.steel, cx + 1.25, counterH + 0.18, cz));
  g.add(cylinder(0.05, 0.05, 0.14, 10, mats.steel, cx + 1.25, counterH + 0.35, cz));
  for (let i = 0; i < 3; i++) {
    g.add(cylinder(0.045, 0.038, 0.11, 10, mats.glass, cx + 0.95 + i * 0.12, counterH + 0.13, cz + 0.22, { cast: false }));
  }

  // Cash box
  g.add(box(0.34, 0.18, 0.28, mats.darkWood, cx + 1.7, counterH + 0.18, cz + 0.1));

  return {
    group: g,
    counterAnchor: new THREE.Vector3(cx, counterH, cz),
    potAnchor: new THREE.Vector3(cx - 0.35, counterH + 0.45, cz),
    steamOrigin: new THREE.Vector3(cx - 0.35, counterH + 0.7, cz),
  };
}

/* ================================================================== */
/*  Glass snack cabinet                                                */
/* ================================================================== */

function buildGlassCabinet(mats) {
  const g = new THREE.Group();
  g.name = "snack-cabinet";

  const cx = 3.0;
  const cz = ROOM.backZ + 0.42;
  const w = 1.9;
  const h = 2.05;
  const d = 0.62;

  // Back + frame
  g.add(box(w, h, 0.05, mats.darkWood, cx, h / 2, cz - d / 2 + 0.025));
  g.add(box(w + 0.08, 0.09, d, mats.darkWood, cx, h + 0.02, cz));
  g.add(box(w + 0.08, 0.09, d, mats.darkWood, cx, 0.06, cz));
  g.add(box(0.07, h, d, mats.darkWood, cx - w / 2, h / 2, cz));
  g.add(box(0.07, h, d, mats.darkWood, cx + w / 2, h / 2, cz));

  // Glass front + sides
  g.add(box(w - 0.1, h - 0.14, 0.015, mats.glass, cx, h / 2, cz + d / 2 - 0.01, { cast: false }));
  g.add(box(0.015, h - 0.14, d - 0.05, mats.glass, cx - w / 2 + 0.04, h / 2, cz, { cast: false }));
  g.add(box(0.015, h - 0.14, d - 0.05, mats.glass, cx + w / 2 - 0.04, h / 2, cz, { cast: false }));

  // Shelves
  for (const y of [0.52, 0.98, 1.44]) {
    g.add(box(w - 0.14, 0.04, d - 0.1, mats.wood, cx, y, cz));
  }

  // Snack placeholders on shelves (different shapes/sizes)
  const rand = mulberry32(5);
  for (const y of [0.58, 1.04, 1.5]) {
    for (let i = 0; i < 6; i++) {
      const x = cx - w / 2 + 0.22 + i * 0.28;
      const kind = Math.floor(rand() * 3);
      const mat = kind === 0 ? mats.snack : mats.snackDark;
      if (kind === 0) {
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), mat).translateX(x).translateY(y + 0.075).translateZ(cz));
      } else if (kind === 1) {
        g.add(cylinder(0.085, 0.075, 0.06, 12, mat, x, y + 0.05, cz));
      } else {
        g.add(box(0.14, 0.06, 0.11, mat, x, y + 0.045, cz, { cast: false }));
      }
    }
  }

  // Small price card taped to the glass
  const cardCanvas = makeCanvas(256, 180, (ctx, w2, h2) => {
    ctx.fillStyle = "#f4e4c6";
    ctx.fillRect(0, 0, w2, h2);
    ctx.strokeStyle = "#8a3a22";
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w2 - 12, h2 - 12);
    ctx.fillStyle = "#5a2417";
    ctx.textAlign = "center";
    ctx.font = '700 52px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
    ctx.fillText("പലഹാരം", w2 / 2, 78);
    ctx.font = '600 40px "Noto Sans Malayalam", "Segoe UI Symbol", sans-serif';
    ctx.fillText(`${CURRENCY_SYMBOL} 12`, w2 / 2, 140);
  });
  const cardTex = new THREE.CanvasTexture(cardCanvas);
  cardTex.colorSpace = THREE.SRGBColorSpace;

  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.24),
    new THREE.MeshStandardMaterial({
      map: cardTex,
      roughness: 0.9,
      side: THREE.DoubleSide,
    })
  );
  card.position.set(cx - 0.35, 1.25, cz + d / 2 + 0.01);
  g.add(card);

  return g;
}

/* ================================================================== */
/*  Tables, benches, props                                             */
/* ================================================================== */

function makeTable(mats, x, z, opts = {}) {
  const g = new THREE.Group();
  const topW = opts.topW ?? 1.2;
  const topD = opts.topD ?? 0.82;
  const topH = 0.76;

  g.add(box(topW, 0.08, topD, mats.wood, 0, topH, 0));
  const legInset = 0.13;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(
        box(0.07, topH - 0.08, 0.07, mats.darkWood, sx * (topW / 2 - legInset), (topH - 0.08) / 2, sz * (topD / 2 - legInset))
      );
    }
  }
  // Stretcher
  g.add(box(topW - 0.3, 0.05, 0.05, mats.darkWood, 0, 0.24, 0, { cast: false }));

  // A tea glass + plate on the table
  g.add(cylinder(0.14, 0.14, 0.02, 16, mats.ceramic, -0.15, topH + 0.05, 0.08));
  g.add(cylinder(0.045, 0.038, 0.12, 12, mats.glass, -0.15, topH + 0.11, 0.08, { cast: false }));
  g.add(cylinder(0.035, 0.03, 0.05, 10, mats.tea, -0.15, topH + 0.13, 0.08, { cast: false }));

  g.position.set(x, 0, z);
  if (opts.ry) g.rotation.y = opts.ry;
  return g;
}

function makeBench(mats, x, z, length = 1.2, ry = 0) {
  const g = new THREE.Group();
  g.add(box(length, 0.07, 0.3, mats.wood, 0, 0.45, 0));
  for (const s of [-1, 1]) {
    g.add(box(0.06, 0.42, 0.28, mats.darkWood, s * (length / 2 - 0.12), 0.21, 0));
  }
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
}

function buildTables(mats) {
  const g = new THREE.Group();
  g.name = "tables";

  const layouts = [
    { x: 1.55, z: 2.0, ry: 0.12 },
    { x: -1.85, z: 0.75, ry: -0.18 },
    { x: 2.55, z: -1.55, ry: 0.1 },
  ];

  const tableAnchors = [];
  for (const l of layouts) {
    g.add(makeTable(mats, l.x, l.z, { ry: l.ry }));
    // Benches on both long sides
    g.add(makeBench(mats, l.x, l.z + 0.72, 1.2, l.ry));
    g.add(makeBench(mats, l.x, l.z - 0.72, 1.2, l.ry + Math.PI));
    tableAnchors.push(new THREE.Vector3(l.x, 0.76, l.z));
  }

  // A stool near the counter
  const stool = new THREE.Group();
  stool.add(cylinder(0.2, 0.2, 0.06, 16, mats.wood, 0, 0.5, 0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    stool.add(cylinder(0.025, 0.03, 0.5, 8, mats.darkWood, Math.cos(a) * 0.13, 0.25, Math.sin(a) * 0.13));
  }
  stool.position.set(-0.2, 0, -2.3);
  g.add(stool);

  // Wall shelf with jars on the left wall
  const shelf = new THREE.Group();
  shelf.add(box(0.3, 0.06, 1.9, mats.wood, 0, 1.75, 0));
  shelf.add(box(0.3, 0.06, 1.9, mats.wood, 0, 2.2, 0));
  for (let i = 0; i < 5; i++) {
    shelf.add(cylinder(0.09, 0.11, 0.24, 12, i % 2 ? mats.ceramic : mats.glass, 0, 1.9, -0.8 + i * 0.4));
  }
  shelf.position.set(-ROOM.width / 2 + 0.2, 0, 2.0);
  g.add(shelf);

  return { group: g, tableAnchors };
}

/* ================================================================== */
/*  Decor: menu board, poster, clock                                   */
/* ================================================================== */

function buildDecor(mats, textures) {
  const g = new THREE.Group();
  g.name = "decor";

  // Menu board on the back wall
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.19), mats.menuBoard);
  board.position.set(-1.0, 2.35, ROOM.backZ + 0.03);
  board.receiveShadow = true;
  g.add(board);
  g.add(box(3.62, 2.31, 0.05, mats.darkWood, -1.0, 2.35, ROOM.backZ + 0.005));

  // Poster on the left wall
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), mats.poster);
  poster.rotation.y = Math.PI / 2;
  poster.position.set(-ROOM.width / 2 + 0.1, 2.0, -0.6);
  g.add(poster);
  g.add(box(0.05, 1.56, 1.06, mats.darkWood, -ROOM.width / 2 + 0.07, 2.0, -0.6));

  // Small wall clock (placeholder)
  const clock = new THREE.Group();
  const face = cylinder(0.2, 0.2, 0.04, 24, mats.ceramic, 0, 0, 0, { rx: Math.PI / 2 });
  clock.add(face);
  clock.add(new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.02, 8, 28), mats.metal));
  const hand1 = box(0.015, 0.16, 0.01, mats.metal, 0, 0.08, 0.03);
  const hand2 = box(0.11, 0.015, 0.01, mats.metal, 0.045, 0, 0.03);
  clock.add(hand1, hand2);
  clock.position.set(1.2, 2.5, ROOM.backZ + 0.03);
  g.add(clock);

  return { group: g };
}

/* ================================================================== */
/*  Lighting: hanging bulbs + fan                                      */
/* ================================================================== */

function buildLighting(mats, animated) {
  const g = new THREE.Group();
  g.name = "interior-lights";

  const bulbPositions = [
    [-2.9, 1.9],
    [0.2, 0.6],
    [2.9, -1.6],
  ];

  for (const [x, z] of bulbPositions) {
    const wire = cylinder(0.012, 0.012, 0.62, 6, mats.metal, x, ROOM.height - 0.42, z, { cast: false });
    g.add(wire);

    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.2, 16, 1, true), mats.lampShade);
    shade.position.set(x, ROOM.height - 0.73, z);
    g.add(shade);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), mats.bulb);
    bulb.position.set(x, ROOM.height - 0.8, z);
    g.add(bulb);

    const light = new THREE.PointLight(0xffa95c, 10, 9, 2);
    light.position.set(x, ROOM.height - 0.82, z);
    light.castShadow = false;
    g.add(light);
    animated.bulbs.push({ light, base: light.intensity });
  }

  // Ceiling fan (slow, ambient motion)
  const fan = new THREE.Group();
  fan.add(cylinder(0.03, 0.03, 0.35, 8, mats.metal, 0, ROOM.height - 0.2, 0));
  const blades = new THREE.Group();
  const hub = cylinder(0.13, 0.13, 0.1, 16, mats.metal, 0, 0, 0);
  blades.add(hub);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const blade = box(0.95, 0.02, 0.2, mats.darkWood, 0, 0, 0, { cast: false });
    // Long axis is +X; rotate it outward along the spoke direction.
    blade.rotation.y = -angle;
    blade.position.set(Math.cos(angle) * 0.52, 0, Math.sin(angle) * 0.52);
    blades.add(blade);
  }
  blades.position.set(0, ROOM.height - 0.38, 0);
  fan.add(blades);
  fan.position.set(0.4, 0, 0.6);
  g.add(fan);
  animated.fans.push(blades);

  return g;
}

/* ================================================================== */
/*  Atmosphere: steam + dust motes                                     */
/* ================================================================== */

function buildAtmosphere(textures, steamOrigin, animated) {
  const g = new THREE.Group();
  g.name = "atmosphere";

  // Steam over the pot
  const steamCount = 70;
  const steamPositions = new Float32Array(steamCount * 3);
  const steamState = [];
  for (let i = 0; i < steamCount; i++) {
    const life = Math.random();
    const spread = Math.random() * 0.34;
    const angle = Math.random() * Math.PI * 2;
    steamState.push({
      life,
      speed: 0.18 + Math.random() * 0.24,
      x: Math.cos(angle) * spread,
      z: Math.sin(angle) * spread,
      drift: (Math.random() - 0.5) * 0.12,
    });
    steamPositions[i * 3 + 0] = steamOrigin.x + steamState[i].x;
    steamPositions[i * 3 + 1] = steamOrigin.y + life * 0.9;
    steamPositions[i * 3 + 2] = steamOrigin.z + steamState[i].z;
  }
  const steamGeo = new THREE.BufferGeometry();
  steamGeo.setAttribute("position", new THREE.BufferAttribute(steamPositions, 3));
  const steamMat = new THREE.PointsMaterial({
    map: textures.particle,
    color: 0xffe6c8,
    size: 0.26,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const steam = new THREE.Points(steamGeo, steamMat);
  steam.frustumCulled = false;
  g.add(steam);
  animated.steam = { points: steam, state: steamState, origin: steamOrigin };

  // Dust motes in the sunbeam
  const dustCount = 180;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustSeed = [];
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3 + 0] = -4.2 + Math.random() * 8.4;
    dustPositions[i * 3 + 1] = 0.4 + Math.random() * 2.6;
    dustPositions[i * 3 + 2] = -3.6 + Math.random() * 7.2;
    dustSeed.push({
      phase: Math.random() * Math.PI * 2,
      amp: 0.05 + Math.random() * 0.16,
      speed: 0.15 + Math.random() * 0.3,
      baseY: dustPositions[i * 3 + 1],
    });
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    map: textures.particle,
    color: 0xffd9a8,
    size: 0.045,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  g.add(dust);
  animated.dust = { points: dust, seed: dustSeed };

  return g;
}

function updateSteam(steam, dt, elapsed) {
  const attr = steam.points.geometry.getAttribute("position");
  const arr = attr.array;
  const { origin } = steam;
  for (let i = 0; i < steam.state.length; i++) {
    const s = steam.state[i];
    s.life += dt * s.speed;
    if (s.life > 1) s.life -= 1;
    const t = s.life;
    arr[i * 3 + 0] = origin.x + s.x + Math.sin(elapsed * 0.8 + i) * 0.05 + t * s.drift;
    arr[i * 3 + 1] = origin.y + t * 0.95;
    arr[i * 3 + 2] = origin.z + s.z + Math.cos(elapsed * 0.6 + i) * 0.05;
  }
  attr.needsUpdate = true;
}

function updateDust(dust, elapsed) {
  const attr = dust.points.geometry.getAttribute("position");
  const arr = attr.array;
  for (let i = 0; i < dust.seed.length; i++) {
    const s = dust.seed[i];
    arr[i * 3 + 0] += Math.sin(elapsed * s.speed + s.phase) * 0.0006;
    arr[i * 3 + 1] = s.baseY + Math.sin(elapsed * s.speed + s.phase) * s.amp;
  }
  attr.needsUpdate = true;
}
