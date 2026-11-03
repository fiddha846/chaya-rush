import * as THREE from "three";

/**
 * Shared art kit: palette, smooth flat-colour materials, primitives and
 * canvas texture helpers. Everything stays in the warm cartoon-illustration
 * range from the reference boards — no photographic textures, no outlines.
 */

export const C = {
  skyTop: "#5b6ea8",
  skyMid: "#e58a86",
  skyHorizon: "#ffd7a0",
  sunset: "#ff9a6b",
  sun: "#ffd489",

  cream: "#f5ecd4",
  creamShade: "#e4d8c2",
  plaster: "#efdfc4",
  plasterShade: "#d9c8a8",
  floor: "#e6dcc9",
  floorShade: "#c8b99f",

  roof: "#b5553a",
  roofDark: "#8c3e25",
  roofLight: "#c96a48",
  thatch: "#8b6f4f",

  wood: "#c9914f",
  woodLight: "#d9a96b",
  woodDark: "#8b5a2b",
  woodDeep: "#6f4e2b",

  green: "#4a7c59",
  greenDark: "#2e5a3a",
  greenLight: "#6fa35a",
  greenPale: "#9bbf7c",

  road: "#423a4a",
  roadDark: "#332e3c",
  roadLine: "#e8dcc8",
  sand: "#c9b8a0",
  sandLight: "#e0d2b8",

  white: "#faf6ea",
  ink: "#3a2418",
  inkSoft: "#5c4432",
  shadow: "#8a7b68",

  steel: "#b9c2c6",
  steelDark: "#8c979c",
  brass: "#b98342",
  copper: "#9c5a32",
  glass: "#d8e3e2",
  tea: "#b97836",
  teaDark: "#8a4d20",
  coffee: "#6b3b24",
  boost: "#8a5531",
  chocolate: "#7a2f46",
  wrapper: "#d9b25a",

  amber: "#ffb347",
  amberDeep: "#d97a2c",
  lamp: "#ffd79a",
  red: "#c85a44",
  teal: "#3f7f79",
  blue: "#5a7ca6",
  magenta: "#b75472",
  mustard: "#d9a13f",
  purple: "#8f7aa3",
};

const SKIN_TONES = ["#e2b98a", "#d9a870", "#c98f5e", "#a9764a", "#8f6038", "#f0c9a0", "#b57b4f"];
const SHIRT_COLORS = [
  "#6b8cae",
  "#5c8c6e",
  "#a593a8",
  "#c9815a",
  "#d9a13f",
  "#7a9c8f",
  "#b75472",
  "#f0e6d2",
  "#8a6ea8",
  "#5b7f8c",
];
const MUNDU_COLORS = ["#f8f4ea", "#f2ead6", "#e8e0c8"];
const BORDER_COLORS = ["#5a7ca6", "#6b8ba4", "#3f7f79", "#b98342", "#8c3e25"];

export function pickColor(list, rng = Math.random) {
  return list[Math.floor(rng() * list.length)];
}

export { SKIN_TONES, SHIRT_COLORS, MUNDU_COLORS, BORDER_COLORS };

const matCache = new Map();

/**
 * Smooth flat-colour material. Lambert keeps the illustrated, non-metallic
 * look and plays nicely with the warm hemisphere + sun light.
 */
export function mat(color, opts = {}) {
  const key = `${color}|${opts.emissive ?? ""}|${opts.emissiveIntensity ?? ""}|${
    opts.transparent ? 1 : 0
  }|${opts.opacity ?? 1}|${opts.side ?? 0}|${opts.depthWrite === false ? 0 : 1}`;
  if (matCache.has(key)) return matCache.get(key);

  const m = new THREE.MeshLambertMaterial({
    color,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true,
  });
  if (opts.flat) m.flatShading = true;
  matCache.set(key, m);
  return m;
}

export function standard(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.75,
    metalness: opts.metalness ?? 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    depthWrite: opts.depthWrite ?? true,
    side: opts.side ?? THREE.FrontSide,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
}

export function addBox(parent, w, h, d, material, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof material === "string" ? mat(material) : material);
  mesh.position.set(x, y, z);
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.ry) mesh.rotation.y = opts.ry;
  if (opts.rz) mesh.rotation.z = opts.rz;
  mesh.castShadow = opts.cast ?? true;
  mesh.receiveShadow = opts.receive ?? true;
  parent.add(mesh);
  return mesh;
}

export function addCyl(parent, rt, rb, h, seg, material, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, seg, 1, opts.open ?? false),
    typeof material === "string" ? mat(material) : material
  );
  mesh.position.set(x, y, z);
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.ry) mesh.rotation.y = opts.ry;
  if (opts.rz) mesh.rotation.z = opts.rz;
  mesh.castShadow = opts.cast ?? true;
  mesh.receiveShadow = opts.receive ?? true;
  parent.add(mesh);
  return mesh;
}

export function addSphere(parent, r, material, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, opts.widthSeg ?? 18, opts.heightSeg ?? 14),
    typeof material === "string" ? mat(material) : material
  );
  mesh.position.set(x, y, z);
  if (opts.sx || opts.sy || opts.sz) mesh.scale.set(opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1);
  mesh.castShadow = opts.cast ?? true;
  mesh.receiveShadow = opts.receive ?? true;
  parent.add(mesh);
  return mesh;
}

export function addCapsule(parent, radius, length, material, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, opts.capSeg ?? 6, opts.radialSeg ?? 12),
    typeof material === "string" ? mat(material) : material
  );
  mesh.position.set(x, y, z);
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.ry) mesh.rotation.y = opts.ry;
  if (opts.rz) mesh.rotation.z = opts.rz;
  mesh.castShadow = opts.cast ?? true;
  mesh.receiveShadow = opts.receive ?? true;
  parent.add(mesh);
  return mesh;
}

export function addPlane(parent, w, h, material, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), typeof material === "string" ? mat(material) : material);
  mesh.position.set(x, y, z);
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.ry) mesh.rotation.y = opts.ry;
  if (opts.rz) mesh.rotation.z = opts.rz;
  mesh.castShadow = opts.cast ?? false;
  mesh.receiveShadow = opts.receive ?? false;
  parent.add(mesh);
  return mesh;
}

export function addTorus(parent, r, tube, material, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(r, tube, opts.radialSeg ?? 8, opts.tubularSeg ?? 24, opts.arc ?? Math.PI * 2),
    typeof material === "string" ? mat(material) : material
  );
  mesh.position.set(x, y, z);
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.ry) mesh.rotation.y = opts.ry;
  if (opts.rz) mesh.rotation.z = opts.rz;
  mesh.castShadow = opts.cast ?? true;
  mesh.receiveShadow = opts.receive ?? true;
  parent.add(mesh);
  return mesh;
}

/** Rounded-rectangle path for canvas signs. */
export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function makeCanvas(w, h, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  draw(ctx, w, h);
  return canvas;
}

export function canvasTexture(canvas, { srgb = true, repeat = null, aniso = 4 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  tex.anisotropy = aniso;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** Soft radial blob texture, used for steam, dust, clouds and lamp glow. */
export function makeSoftTexture(size = 128, inner = "rgba(255,255,255,0.95)", outer = "rgba(255,255,255,0)") {
  return canvasTexture(
    makeCanvas(size, size, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, inner);
      g.addColorStop(0.45, inner.replace(/[\d.]+\)$/, "0.45)"));
      g.addColorStop(1, outer);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    })
  );
}

export function softSprite(texture, color, size, opacity = 0.7) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  return sprite;
}

/** Subtle warm concrete floor, not a photographic texture. */
export function makeFloorTexture(aniso = 4) {
  const canvas = makeCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = C.floor;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(190,170,140,0.10)";
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.ellipse(x, y, 8 + Math.random() * 56, 6 + Math.random() * 30, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(160,140,110,0.16)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i / 8) * h);
      ctx.lineTo(w, (i / 8) * h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((i / 8) * w, 0);
      ctx.lineTo((i / 8) * w, h);
      ctx.stroke();
    }
  });
  return canvasTexture(canvas, { repeat: [2.4, 2.2], aniso });
}

/** Very light wood grain, mostly flat honey colour. */
export function makeWoodTexture(aniso = 4, base = C.wood) {
  const canvas = makeCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const y = Math.random() * h;
      ctx.strokeStyle = `rgba(110,72,38,${0.02 + Math.random() * 0.05})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + 6, w * 0.7, y - 6, w, y + 2);
      ctx.stroke();
    }
  });
  return canvasTexture(canvas, { repeat: [1, 1], aniso });
}

/** Terracotta tile roof texture, used sparingly on broad roof planes. */
export function makeRoofTexture(aniso = 4) {
  const canvas = makeCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = C.roof;
    ctx.fillRect(0, 0, w, h);
    const rows = 10;
    const rowH = h / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const shade = 0.9 + Math.random() * 0.16;
      ctx.fillStyle = `rgba(${Math.round(181 * shade)},${Math.round(85 * shade)},${Math.round(58 * shade)},0.55)`;
      ctx.fillRect(0, y + 2, w, rowH - 4);
      ctx.fillStyle = "rgba(112,48,28,0.30)";
      ctx.fillRect(0, y + rowH - 3, w, 2.5);
      const cols = 8;
      const colW = w / cols;
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = `rgba(140,62,37,${0.05 + Math.random() * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(c * colW + colW / 2, y + rowH / 2, colW * 0.42, rowH * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  return canvasTexture(canvas, { repeat: [2, 2], aniso });
}

export function disposeObject(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose?.();
    if (obj.material) {
      const list = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of list) {
        if (m.map?.dispose) m.map.dispose();
        m.dispose?.();
      }
    }
  });
}
