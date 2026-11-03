import * as THREE from "three";
import {
  C,
  mat,
  addBox,
  addCyl,
  addSphere,
  addPlane,
  addCapsule,
  addTorus,
  makeSoftTexture,
  softSprite,
  pickColor,
} from "./art.js";
import { createPerson, createDog } from "./people.js";
import { STREET, DOG_SHELTER } from "../config/layout.js";

/**
 * Renderer, dusk sky, street, village, weather, traffic, dogs and small
 * ambient life. Everything is flat-coloured low-poly, lit warm from the street
 * side, with soft long shadows.
 */

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

export function createWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xd9a07a, 0.0075);

  const camera = new THREE.PerspectiveCamera(
    56,
    window.innerWidth / window.innerHeight,
    0.08,
    220
  );
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const soft = makeSoftTexture(128, "rgba(255,255,255,0.95)", "rgba(255,255,255,0)");
  const sky = createSky(scene);
  const lights = createLights(scene);
  const street = createStreet(scene, soft);
  const village = createVillage(scene, soft);
  const weather = createWeather(scene, sky, lights, street);
  const traffic = createTraffic(scene, soft);
  const dogs = createDogPack(scene);
  const ambient = createAmbientLife(scene);
  const events = { onEvent: null };

  function update(dt, elapsed) {
    weather.update(dt, elapsed);
    traffic.update(dt, elapsed, weather);
    dogs.update(dt, elapsed, weather, events);
    ambient.update(dt, elapsed, weather);
    sky.update(dt, elapsed);
    street.update?.(dt, elapsed, weather);
  }

  return { scene, camera, lights, sky, street, village, weather, traffic, dogs, ambient, events, update };
}

/* ================================================================== */
/*  Sky                                                                */
/* ================================================================== */

function createSky(scene) {
  const uniforms = {
    topColor: { value: new THREE.Color("#4d5f96") },
    midColor: { value: new THREE.Color("#e08a86") },
    bottomColor: { value: new THREE.Color("#ffd39a") },
    offset: { value: 0.06 },
    exponent: { value: 0.82 },
  };
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos + vec3(0.0, offset, 0.0)).y;
        float up = pow(clamp(h, 0.0, 1.0), exponent);
        float down = pow(clamp(-h, 0.0, 1.0), 0.6);
        vec3 col = mix(bottomColor, midColor, smoothstep(0.0, 0.42, h));
        col = mix(col, topColor, up);
        col = mix(col, bottomColor * 0.4, down);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 20), material);
  sphere.name = "sky";
  sphere.frustumCulled = false;
  scene.add(sphere);

  // Sun low over the street, mostly hidden behind palms.
  const glowTex = makeSoftTexture(192, "rgba(255,235,190,1)", "rgba(255,180,110,0)");
  const sun = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffd9a0,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  sun.position.set(-26, 10, -78);
  sun.scale.set(24, 24, 1);
  scene.add(sun);

  // A few soft dusk clouds.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffc8b4, transparent: true, opacity: 0.55, fog: false });
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const n = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 4, 12, 8), cloudMat);
      m.position.set(j * 5 - n * 2, Math.random() * 2, Math.random() * 3);
      m.scale.y = 0.5;
      g.add(m);
    }
    g.position.set(-70 + i * 24, 24 + Math.random() * 12, -75 - Math.random() * 25);
    scene.add(g);
    clouds.push(g);
  }

  const state = {
    material,
    uniforms,
    sun,
    clouds,
    rainDark: 0,
    update(dt) {
      const t = state.rainDark;
      uniforms.topColor.value.lerpColors(new THREE.Color("#4d5f96"), new THREE.Color("#5c6472"), t);
      uniforms.midColor.value.lerpColors(new THREE.Color("#e08a86"), new THREE.Color("#9b9aa0"), t);
      uniforms.bottomColor.value.lerpColors(new THREE.Color("#ffd39a"), new THREE.Color("#b9b3ad"), t);
      sun.material.opacity = 0.95 - t * 0.85;
      cloudMat.opacity = 0.5 + t * 0.3;
      cloudMat.color.lerpColors(new THREE.Color("#ffc8b4"), new THREE.Color("#8b8d97"), t);
    },
  };
  return state;
}

/* ================================================================== */
/*  Lights                                                             */
/* ================================================================== */

function createLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffd7ae, 0x4a3730, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffac6a, 2.7);
  sun.position.set(-17, 13, -26);
  sun.target.position.set(0, 1.2, -1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  const fill = new THREE.DirectionalLight(0x8ba4d8, 0.5);
  fill.position.set(8, 9, 16);
  fill.target.position.set(0, 1, 0);
  scene.add(fill, fill.target);

  return { hemi, sun, fill };
}

/* ================================================================== */
/*  Ground, road, footpaths, little street furniture                  */
/* ================================================================== */

function createStreet(scene, soft) {
  const group = new THREE.Group();
  group.name = "street";
  scene.add(group);

  const earth = new THREE.MeshLambertMaterial({ color: 0x8d6f4f });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(230, 160), earth);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.04, -20);
  ground.receiveShadow = true;
  group.add(ground);

  // Road surface
  const roadMat = new THREE.MeshLambertMaterial({ color: C.road });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(120, STREET.width), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.012, STREET.z);
  road.receiveShadow = true;
  group.add(road);

  // Road edge lines
  for (const z of [STREET.z - STREET.width / 2 + 0.25, STREET.z + STREET.width / 2 - 0.25]) {
    addBox(group, 120, 0.01, 0.08, mat(C.roadLine), 0, 0.02, z, { cast: false, receive: false });
  }

  // Near footpath (red-earth / pale concrete mix)
  const nearPathMat = new THREE.MeshLambertMaterial({ color: 0xb69a78 });
  const nearPath = new THREE.Mesh(new THREE.PlaneGeometry(120, 1.7), nearPathMat);
  nearPath.rotation.x = -Math.PI / 2;
  nearPath.position.set(0, 0.02, -6.55);
  nearPath.receiveShadow = true;
  group.add(nearPath);

  addBox(group, 120, 0.16, 0.14, mat("#a1815f"), 0, 0.06, -5.72, { cast: false, receive: true });

  // Far footpath in front of the village houses
  const farPath = new THREE.Mesh(new THREE.PlaneGeometry(120, 2.0), mat("#c0a47f"));
  farPath.rotation.x = -Math.PI / 2;
  farPath.position.set(0, 0.02, -12.5);
  farPath.receiveShadow = true;
  group.add(farPath);

  // Puddles (hidden when dry)
  const puddleMat = new THREE.MeshLambertMaterial({
    color: 0x73808c,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const puddles = [];
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 1.3, 18), puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.scale.y = 0.42 + Math.random() * 0.4;
    p.position.set(-24 + Math.random() * 48, 0.03, STREET.z - 2 + Math.random() * 4.2);
    p.receiveShadow = false;
    group.add(p);
    puddles.push(p);
  }

  // Street lamp on the near footpath
  const lamp = buildStreetLamp(soft);
  lamp.position.set(-6.2, 0, -6.5);
  group.add(lamp);

  // A second lamp far down the road
  const lamp2 = buildStreetLamp(soft);
  lamp2.position.set(17, 0, -7.0);
  lamp2.scale.setScalar(0.9);
  group.add(lamp2);

  // Stones and grass tufts
  for (let i = 0; i < 40; i++) {
    const x = -35 + Math.random() * 70;
    const z = -13.5 - Math.random() * 8;
    if (Math.random() < 0.5) {
      addSphere(group, 0.07 + Math.random() * 0.14, mat(pickColor(["#8a7a63", "#9c896d"])), x, 0.03, z, {
        sx: 1.4,
        sy: 0.5,
        sz: 1,
        cast: false,
      });
    } else {
      for (let j = 0; j < 3; j++) {
        addCyl(group, 0.008, 0.014, 0.22 + Math.random() * 0.16, 4, mat(C.greenPale), x + j * 0.05, 0.1, z, {
          rz: (Math.random() - 0.5) * 0.5,
          cast: false,
        });
      }
    }
  }

  const dryRoad = new THREE.Color(C.road);
  const wetRoad = new THREE.Color("#2c3340");
  const dryFog = new THREE.Color("#d9a07a");
  const wetFog = new THREE.Color("#9099a1");

  return {
    group,
    roadMat,
    puddleMat,
    update(dt, elapsed, weather) {
      const w = weather.wetness;
      roadMat.color.lerpColors(dryRoad, wetRoad, w * 0.85);
      puddleMat.opacity = w * 0.55;
      nearPathMat.color.set(w > 0.2 ? "#9d8468" : "#b69a78");
      if (scene.fog) {
        scene.fog.color.lerpColors(dryFog, wetFog, Math.max(w * 0.7, weather.rainAmount * 0.7));
        scene.fog.density = 0.0075 + weather.rainAmount * 0.0055;
      }
      scene.background = null;
    },
  };
}

function buildStreetLamp(soft) {
  const g = new THREE.Group();
  addCyl(g, 0.07, 0.11, 4.6, 10, mat("#3b3733"), 0, 2.3, 0);
  addBox(g, 1.0, 0.07, 0.07, mat("#3b3733"), 0.45, 4.54, 0);
  addCyl(g, 0.16, 0.1, 0.2, 10, mat("#3b3733"), 0.9, 4.48, 0, { cast: false });
  addSphere(g, 0.15, mat(C.lamp, { emissive: C.amber, emissiveIntensity: 1.2 }), 0.9, 4.34, 0, {
    cast: false,
  });
  const glow = softSprite(soft, "#ffb35c", 1.6, 0.45);
  glow.position.set(0.9, 4.34, 0);
  g.add(glow);
  const light = new THREE.PointLight(0xffae62, 16, 13, 2);
  light.position.set(0.9, 4.2, 0);
  g.add(light);
  return g;
}

/* ================================================================== */
/*  Village backdrop                                                  */
/* ================================================================== */

function createVillage(scene, soft) {
  const group = new THREE.Group();
  group.name = "village";
  scene.add(group);

  const houseColours = ["#efe0c2", "#e7cfa9", "#d9c2b0", "#c9d6c4", "#e2b98f", "#d8c3a5"];
  const roofColours = ["#a64f35", "#9b4a31", "#b25a3d", "#8f4229"];

  for (let i = 0; i < 9; i++) {
    const x = -38 + i * 9.6 + (Math.random() - 0.5) * 2.2;
    const z = -17.5 - Math.random() * 5.5;
    const w = 4.5 + Math.random() * 2.6;
    const d = 4 + Math.random() * 1.8;
    const h = 2.5 + Math.random() * 0.9;
    const house = new THREE.Group();
    house.position.set(x, 0, z);
    house.rotation.y = (Math.random() - 0.5) * 0.12;

    addBox(house, w, h, d, mat(pickColor(houseColours)), 0, h / 2, 0);
    addBox(house, w + 0.2, 0.18, d + 0.2, mat("#b8a184"), 0, 0.09, 0, { cast: false });

    // Pitched roof
    const roofMat = mat(pickColor(roofColours));
    const roofA = addBox(house, w + 1.1, 0.14, d * 0.62, roofMat, 0, h + 0.55, -d * 0.25, {
      rx: -0.34,
    });
    addBox(house, w + 1.1, 0.14, d * 0.62, roofMat, 0, h + 0.55, d * 0.25, { rx: 0.34 });
    addCyl(house, 0.07, 0.07, w + 1.2, 6, mat("#7e3826"), 0, h + 0.86, 0, { rz: Math.PI / 2, cast: false });

    // Door and windows
    addBox(house, 0.9, 1.65, 0.08, mat("#6f4a30"), 0, 0.83, d / 2 + 0.02, { cast: false });
    for (const wx of [-w * 0.28, w * 0.28]) {
      addBox(house, 0.72, 0.66, 0.06, mat("#7d93a0"), wx, h * 0.62, d / 2 + 0.02, { cast: false });
      addBox(house, 0.84, 0.78, 0.05, mat("#f3e7cf"), wx, h * 0.62, d / 2 + 0.005, { cast: false });
      addBox(house, 0.62, 0.56, 0.04, mat("#7d93a0"), wx, h * 0.62, d / 2 + 0.035, { cast: false });
    }

    // Warm window glow for a couple of houses
    if (i % 3 === 0) {
      addSphere(house, 0.22, mat(C.lamp, { emissive: C.amber, emissiveIntensity: 0.8 }), 0, h * 0.6, d / 2 + 0.06, {
        sx: 1.4,
        sy: 1,
        sz: 0.5,
        cast: false,
      });
    }

    // Compound wall
    addBox(house, w + 1.6, 0.55, 0.16, mat("#b09a7c"), 0, 0.28, d / 2 + 1.6, { cast: false });
    group.add(house);

    // Palms between houses
    if (i % 2 === 0) {
      const palm = buildPalm(1 + Math.random() * 0.5);
      palm.position.set(x + w / 2 + 1.4, 0, z - 1.6);
      group.add(palm);
    }
  }

  // Palms on the near side, flanking the shop
  for (const [x, z, s] of [
    [-14, -6.5, 1.25],
    [15.5, -6.8, 1.1],
    [-22, -9.5, 1.4],
    [24, -10.5, 1.3],
  ]) {
    const palm = buildPalm(s);
    palm.position.set(x, 0, z);
    group.add(palm);
  }

  // Banana plants near the shop
  for (const [x, z, s] of [
    [-8.5, -5.0, 1.0],
    [8.6, -5.2, 0.9],
  ]) {
    const banana = buildBananaPlant(s);
    banana.position.set(x, 0, z);
    group.add(banana);
  }

  // A little tea stall / shed across the road
  const shed = new THREE.Group();
  shed.position.set(10.5, 0, -14.5);
  addBox(shed, 2.6, 1.9, 2.0, mat("#d9c3a1"), 0, 0.95, 0);
  addBox(shed, 3.0, 0.12, 2.4, mat("#8f4229"), 0, 1.95, 0, { rx: 0.12 });
  addBox(shed, 1.0, 1.3, 0.06, mat("#6f4a30"), 0, 0.66, -1.02, { cast: false });
  group.add(shed);

  return { group };
}

function buildPalm(scale = 1) {
  const g = new THREE.Group();
  g.scale.setScalar(scale);
  const trunkMat = mat("#8a6747");
  let x = 0;
  let z = 0;
  for (let i = 0; i < 7; i++) {
    const seg = addCyl(g, 0.13 - i * 0.006, 0.16 - i * 0.006, 0.72, 7, trunkMat, x, 0.36 + i * 0.65, z, {
      rz: (i - 3) * 0.014,
      cast: true,
    });
    x += Math.sin(i * 0.55) * 0.08;
    z += Math.cos(i * 0.35) * 0.05;
  }
  const topX = x;
  const topZ = z;
  const topY = 5.1;

  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const leaf = new THREE.Group();
    leaf.position.set(topX, topY, topZ);
    leaf.rotation.y = a;
    leaf.rotation.z = -0.5 - Math.random() * 0.2;
    addCapsule(leaf, 0.09, 1.45, mat(i % 2 ? C.green : C.greenLight), 0, -0.05, 0.55, {
      rx: Math.PI / 2,
      sx: 1,
      cast: true,
    });
    addSphere(leaf, 0.13, mat(C.greenDark), 0, -0.02, 0.1, { sx: 1.1, sy: 0.7, sz: 1.2, cast: false });
    g.add(leaf);
  }
  for (let i = 0; i < 3; i++) {
    addSphere(g, 0.09, mat("#8a6747"), topX + Math.sin(i * 2) * 0.13, topY - 0.1, topZ + Math.cos(i * 2) * 0.13, {
      cast: false,
    });
  }
  return g;
}

function buildBananaPlant(scale = 1) {
  const g = new THREE.Group();
  g.scale.setScalar(scale);
  addCyl(g, 0.09, 0.13, 1.55, 8, mat("#7a9c5a"), 0, 0.78, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const leaf = addCapsule(g, 0.2, 1.1, mat(i % 2 ? "#6fa35a" : "#5c8c4a"), Math.cos(a) * 0.35, 1.7 + Math.sin(i) * 0.1, Math.sin(a) * 0.35, {
      rx: Math.PI / 2.3,
      rz: a,
      sx: 1.5,
      sy: 0.9,
      sz: 0.3,
      cast: true,
    });
    leaf.rotation.y = a;
  }
  return g;
}

/* ================================================================== */
/*  Weather                                                           */
/* ================================================================== */

function createWeather(scene, sky, lights, street) {
  const group = new THREE.Group();
  scene.add(group);

  const COUNT = 1800;
  const positions = new Float32Array(COUNT * 6);
  const drops = [];
  const wind = 1.4;
  for (let i = 0; i < COUNT; i++) {
    drops.push({
      x: -28 + Math.random() * 56,
      y: Math.random() * 20,
      z: -34 + Math.random() * 40,
      speed: 15 + Math.random() * 7,
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: 0xcdd8df,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const rain = new THREE.LineSegments(geo, rainMat);
  rain.frustumCulled = false;
  rain.visible = false;
  group.add(rain);

  const dryLights = {
    hemi: 0.9,
    sun: 2.7,
    sunColor: new THREE.Color(0xffac6a),
    hemiSky: new THREE.Color(0xffd7ae),
  };
  const rainLights = {
    hemi: 0.62,
    sun: 0.7,
    sunColor: new THREE.Color(0xa9b4c4),
    hemiSky: new THREE.Color(0xc7d0d8),
  };

  const state = {
    raining: false,
    rainAmount: 0,
    wetness: 0,
    dryTimer: 48 + Math.random() * 30,
    rainTimer: 0,
    rainDuration: 0,
    onChange: null,
    forceRain(on) {
      if (on && !state.raining) state._start();
      else if (!on && state.raining) state._stop();
    },
    _start() {
      state.raining = true;
      state.rainTimer = 22 + Math.random() * 14;
      state.rainDuration = state.rainTimer;
      state.onChange?.("rain", state);
    },
    _stop() {
      state.raining = false;
      state.dryTimer = 75 + Math.random() * 50;
      state.onChange?.("dry", state);
    },
    update(dt) {
      if (state.raining) {
        state.rainTimer -= dt;
        if (state.rainTimer <= 0) state._stop();
      } else {
        state.dryTimer -= dt;
        if (state.dryTimer <= 0) state._start();
      }

      state.rainAmount = damp(state.rainAmount, state.raining ? 1 : 0, state.raining ? 2.2 : 0.9, dt);
      state.wetness = state.raining
        ? Math.min(1, state.wetness + dt * 0.22)
        : Math.max(0, state.wetness - dt * 0.032);

      sky.rainDark = damp(sky.rainDark, state.raining ? 1 : 0, 1.4, dt);
      rainMat.opacity = state.rainAmount * 0.62;
      rain.visible = state.rainAmount > 0.015;

      lights.sun.intensity = damp(lights.sun.intensity, state.raining ? rainLights.sun : dryLights.sun, 1.4, dt);
      lights.hemi.intensity = damp(lights.hemi.intensity, state.raining ? rainLights.hemi : dryLights.hemi, 1.4, dt);
      lights.sun.color.lerpColors(dryLights.sunColor, rainLights.sunColor, sky.rainDark);
      lights.hemi.color.lerpColors(dryLights.hemiSky, rainLights.hemiSky, sky.rainDark);

      if (rain.visible) {
        const attr = geo.getAttribute("position");
        const arr = attr.array;
        for (let i = 0; i < COUNT; i++) {
          const d = drops[i];
          d.y -= d.speed * dt;
          d.x -= wind * dt;
          if (d.y < 0) {
            d.y = 18 + Math.random() * 4;
            d.x = -28 + Math.random() * 56;
            d.z = -34 + Math.random() * 40;
          }
          if (d.x < -30) d.x += 58;
          const j = i * 6;
          arr[j] = d.x;
          arr[j + 1] = d.y;
          arr[j + 2] = d.z;
          arr[j + 3] = d.x + 0.04;
          arr[j + 4] = d.y + 0.55;
          arr[j + 5] = d.z;
        }
        attr.needsUpdate = true;
      }
    },
  };

  // A soft rain hiss is out of scope (no audio), but a cool blue rim on the
  // shop front sells the wet evening.
  return state;
}

/* ================================================================== */
/*  Traffic                                                           */
/* ================================================================== */

function createTraffic(scene, soft) {
  const group = new THREE.Group();
  scene.add(group);
  const vehicles = [];
  let timer = 3 + Math.random() * 5;

  const glowTex = soft;
  const headlightMat = mat(C.lamp, { emissive: C.amber, emissiveIntensity: 1.5 });

  function makeAuto() {
    const g = new THREE.Group();
    addBox(g, 2.3, 0.9, 1.25, mat("#d9a13f"), 0, 0.55, 0);
    addBox(g, 1.2, 0.85, 1.18, mat("#2f3a3a"), 0.15, 1.22, 0, { cast: false });
    addBox(g, 1.0, 0.5, 1.24, mat("#33454a"), 0.2, 1.45, 0, { cast: false });
    addBox(g, 2.2, 0.08, 1.3, mat("#2b2b2b"), 0, 1.0, 0, { cast: false });
    for (const [x, z] of [[-0.75, 0.6], [-0.75, -0.6], [0.8, 0.6], [0.8, -0.6]]) {
      addCyl(g, 0.26, 0.26, 0.15, 12, mat("#2b2b2b"), x, 0.28, z, { rz: Math.PI / 2 });
    }
    addSphere(g, 0.12, headlightMat, 1.18, 0.62, 0.42, { cast: false });
    addSphere(g, 0.12, headlightMat, 1.18, 0.62, -0.42, { cast: false });
    addSphere(g, 0.07, mat("#c8453a", { emissive: "#8a2018", emissiveIntensity: 0.7 }), -1.18, 0.62, 0.4, { cast: false });
    addSphere(g, 0.07, mat("#c8453a", { emissive: "#8a2018", emissiveIntensity: 0.7 }), -1.18, 0.62, -0.4, { cast: false });
    for (const s of [1, -1]) {
      const glow = softSprite(soft, "#ffcf8a", 1.1, 0.4);
      glow.position.set(1.3, 0.62, s * 0.42);
      g.add(glow);
    }
    return g;
  }

  function makeCar(colour) {
    const g = new THREE.Group();
    addBox(g, 3.5, 0.75, 1.65, mat(colour), 0, 0.55, 0);
    addBox(g, 1.9, 0.72, 1.5, mat("#4b6a7a"), -0.1, 1.22, 0, { cast: false });
    addBox(g, 1.85, 0.1, 1.55, mat(colour), -0.1, 1.6, 0, { cast: false });
    for (const [x, z] of [[-1.15, 0.8], [-1.15, -0.8], [1.15, 0.8], [1.15, -0.8]]) {
      addCyl(g, 0.32, 0.32, 0.18, 12, mat("#26262a"), x, 0.3, z, { rz: Math.PI / 2 });
    }
    addSphere(g, 0.12, headlightMat, 1.78, 0.55, 0.52, { cast: false });
    addSphere(g, 0.12, headlightMat, 1.78, 0.55, -0.52, { cast: false });
    addSphere(g, 0.08, mat("#c8453a", { emissive: "#8a2018", emissiveIntensity: 0.7 }), -1.78, 0.55, 0.55, { cast: false });
    addSphere(g, 0.08, mat("#c8453a", { emissive: "#8a2018", emissiveIntensity: 0.7 }), -1.78, 0.55, -0.55, { cast: false });
    return g;
  }

  function makeBus() {
    const g = new THREE.Group();
    addBox(g, 7.2, 2.25, 2.05, mat("#4f8b9a"), 0, 1.35, 0);
    addBox(g, 7.0, 0.7, 2.1, mat("#f2ead6"), 0, 2.1, 0, { cast: false });
    addBox(g, 7.0, 0.1, 2.12, mat("#c85a44"), 0, 1.72, 0, { cast: false });
    for (let i = 0; i < 5; i++) {
      addBox(g, 1.05, 0.6, 0.04, mat("#8fb1bd"), -2.5 + i * 1.25, 1.5, 1.03, { cast: false });
      addBox(g, 1.05, 0.6, 0.04, mat("#8fb1bd"), -2.5 + i * 1.25, 1.5, -1.03, { cast: false });
    }
    for (const [x, z] of [[-2.6, 1.0], [-2.6, -1.0], [2.5, 1.0], [2.5, -1.0]]) {
      addCyl(g, 0.48, 0.48, 0.26, 12, mat("#26262a"), x, 0.45, z, { rz: Math.PI / 2 });
    }
    addSphere(g, 0.2, headlightMat, 3.65, 0.7, 0.7, { cast: false });
    addSphere(g, 0.2, headlightMat, 3.65, 0.7, -0.7, { cast: false });
    return g;
  }

  function spawn() {
    const roll = Math.random();
    const mesh = roll < 0.45 ? makeAuto() : roll < 0.82 ? makeCar(pickColor(["#b5553a", "#5a7ca6", "#f0e6d2", "#4a7c59", "#8f7aa3"])) : makeBus();
    const dir = Math.random() < 0.5 ? 1 : -1;
    const lane = dir > 0 ? 1.45 : -1.45;
    mesh.position.set(dir > 0 ? -58 : 58, 0, STREET.z + lane);
    mesh.rotation.y = dir > 0 ? 0 : Math.PI;
    group.add(mesh);
    vehicles.push({ mesh, dir, speed: 8 + Math.random() * 6 });
  }

  return {
    group,
    vehicles,
    spawn,
    update(dt, elapsed, weather) {
      const rainy = weather.raining;
      timer -= dt;
      if (timer <= 0) {
        spawn();
        timer = (rainy ? 14 : 8) + Math.random() * 10;
      }
      for (const v of vehicles) {
        v.mesh.position.x += v.dir * v.speed * dt;
      }
      for (let i = vehicles.length - 1; i >= 0; i--) {
        const v = vehicles[i];
        if (Math.abs(v.mesh.position.x) > 70) {
          group.remove(v.mesh);
          vehicles.splice(i, 1);
        }
      }
    },
  };
}

/* ================================================================== */
/*  Dogs                                                              */
/* ================================================================== */

function createDogPack(scene) {
  const dogs = [
    { dog: createDog({ color: "#a9743f", patch: "#f2e6cf" }), home: new THREE.Vector3(6.8, 0, -7.2) },
    { dog: createDog({ color: "#7a5235", patch: "#e0c49a" }), home: new THREE.Vector3(-7.6, 0, -7.6) },
  ];
  for (const entry of dogs) {
    entry.dog.group.position.copy(entry.home);
    entry.dog.group.rotation.y = Math.random() * Math.PI * 2;
    entry.mode = "wander";
    entry.target = entry.home.clone();
    entry.timer = 2 + Math.random() * 4;
    entry.speed = 1.1;
    entry.sheltered = false;
    scene.add(entry.dog.group);
  }

  const state = {
    dogs,
    fighting: false,
    fightTimer: 0,
    fightCooldown: 55 + Math.random() * 40,
    onEvent: null,
    update(dt, elapsed, weather, events) {
      const event = (type, line) => {
        state.onEvent?.(type, line);
        events?.onEvent?.(type, line);
      };

      state.fightCooldown -= dt;
      if (!weather.raining && !state.fighting && state.fightCooldown <= 0) {
        state.fighting = true;
        state.fightTimer = 6.5;
        const cx = 8.5;
        const cz = -7.6;
        dogs[0].target.set(cx - 0.6, 0, cz);
        dogs[1].target.set(cx + 0.6, 0, cz);
        dogs[0].mode = "fightWalk";
        dogs[1].mode = "fightWalk";
        event("dogFight", "വാ... വാ...");
        state.fightCooldown = 100 + Math.random() * 70;
      }

      for (const entry of dogs) {
        const d = entry.dog;

        if (weather.raining && !entry.sheltered) {
          const shelter = DOG_SHELTER[dogs.indexOf(entry) % DOG_SHELTER.length];
          entry.target.copy(shelter.pos);
          entry.target.y = 0;
          entry.mode = "shelter";
          entry.sheltered = true;
        } else if (!weather.raining && entry.sheltered) {
          entry.target.copy(entry.home);
          entry.mode = "leave";
          entry.sheltered = false;
        }

        if (state.fighting) {
          if (entry.mode === "fightWalk") {
            moveToward(entry, dt, 1.9);
            if (entry.target.distanceTo(entry.dog.group.position) < 0.25) {
              entry.mode = "fight";
              entry.dog.setPose("fight");
            }
          } else if (entry.mode === "fight") {
            d.setPose("fight");
            d.update(dt, elapsed);
          }
          continue;
        }

        if (entry.mode === "shelter" || entry.mode === "leave") {
          moveToward(entry, dt, 1.65);
          if (entry.target.distanceTo(entry.dog.group.position) < 0.18) {
            if (entry.mode === "shelter") {
              entry.mode = "lie";
              entry.timer = 9999;
              entry.dog.setPose("lie");
            } else {
              entry.mode = "wander";
              entry.timer = 1 + Math.random() * 3;
            }
          }
          d.update(dt, elapsed);
          continue;
        }

        entry.timer -= dt;
        if (entry.mode === "wander" && entry.timer <= 0) {
          const roll = Math.random();
          if (roll < 0.45) {
            entry.mode = "lie";
            entry.timer = 4 + Math.random() * 6;
            d.setPose("lie");
          } else if (roll < 0.75) {
            entry.mode = "stand";
            entry.timer = 3 + Math.random() * 5;
            d.setPose("stand");
          } else {
            entry.target.set(
              THREE.MathUtils.clamp(entry.home.x - 5 + Math.random() * 10, -18, 18),
              0,
              STREET.z + 1.7 + Math.random() * 1.6
            );
            entry.mode = "walk";
          }
        } else if (entry.mode === "walk" && entry.timer <= 0) {
          if (entry.target.distanceTo(entry.dog.group.position) < 0.2) {
            entry.mode = "wander";
            entry.timer = 1 + Math.random() * 4;
            d.setPose(Math.random() < 0.5 ? "lie" : "stand");
          }
        }

        if (entry.mode === "walk") moveToward(entry, dt, 1.05);
        d.update(dt, elapsed);
      }

      if (state.fighting) {
        state.fightTimer -= dt;
        // The chaiwala steps out and shoos them apart.
        if (state.fightTimer < 3.2 && state.fightTimer > 2.6) {
          event("dogShoo", null);
        }
        if (state.fightTimer <= 0) {
          state.fighting = false;
          for (const entry of dogs) {
            entry.mode = "wander";
            entry.timer = 0.2;
            entry.target.copy(entry.home);
            entry.dog.setPose("walk");
          }
        }
      }
    },
  };

  return state;
}

function moveToward(entry, dt, speed) {
  const dog = entry.dog;
  const pos = dog.group.position;
  const target = entry.target;
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.02) return;
  const step = Math.min(dist, speed * dt);
  pos.x += (dx / dist) * step;
  pos.z += (dz / dist) * step;
  const yaw = Math.atan2(dx, dz);
  dog.group.rotation.y = dampAngle(dog.group.rotation.y, yaw, 8, dt);
  dog.setPose(dist > 0.3 ? "walk" : "stand");
  dog.speed = speed;
}

function dampAngle(current, target, lambda, dt) {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

/* ================================================================== */
/*  Ambient people                                                    */
/* ================================================================== */

function createAmbientLife(scene) {
  const people = [];
  const group = new THREE.Group();
  scene.add(group);
  let timer = 6 + Math.random() * 8;

  function spawn() {
    const person = createPerson({ kid: false });
    const fromLeft = Math.random() < 0.5;
    const z = Math.random() < 0.55 ? -12.1 : -7.15;
    person.group.position.set(fromLeft ? -32 : 32, 0, z);
    person.group.rotation.y = fromLeft ? -Math.PI / 2 : Math.PI / 2;
    person.setPose("walk");
    person.walking = true;
    person.speed = 1.25 + Math.random() * 0.4;
    person.setUmbrella(true);
    group.add(person.group);
    people.push({
      person,
      dir: fromLeft ? 1 : -1,
      speed: person.speed,
      phase: Math.random() * 10,
      timer: 0,
      chat: Math.random() < 0.35,
    });
  }

  return {
    people,
    spawn,
    update(dt, elapsed, weather) {
      timer -= dt;
      if (timer <= 0 && people.length < 3) {
        spawn();
        timer = 9 + Math.random() * 12;
      }
      for (const p of people) {
        p.timer += dt;
        p.person.group.position.x += p.dir * p.speed * dt;
        p.person.group.position.z += Math.sin(elapsed * 0.6 + p.phase) * 0.0008;
        p.person.setUmbrella(weather.rainAmount > 0.25);
        p.person.update(dt, elapsed);
      }
      for (let i = people.length - 1; i >= 0; i--) {
        const p = people[i];
        if (Math.abs(p.person.group.position.x) > 36) {
          group.remove(p.person.group);
          people.splice(i, 1);
        }
      }
    },
  };
}
