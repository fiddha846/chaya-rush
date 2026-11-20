import * as THREE from "three";
import { C, mat, addBox, addCyl, addSphere, addCapsule, addTorus, pickColor, SKIN_TONES, SHIRT_COLORS, MUNDU_COLORS, BORDER_COLORS } from "./art.js";
import { itemById } from "../config/menu.js";

/**
 * Low-poly cartoon people and street dogs.
 *
 * The style brief: soft rounded shapes, no outlines, dot eyes, simple smiles,
 * shirt + mundu for men, sari/dress for women, slightly large heads.
 * All animation is procedural — no external rigs.
 */

const HAIR_COLORS = ["#241713", "#2e1c15", "#3a241a", "#1d1512", "#4a2d1d"];
const FACE = "#4a2419";
const BLUSH = "#d98a74";

function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function createPerson({
  gender = Math.random() < 0.48 ? "female" : "male",
  kid = false,
  skin = pickColor(SKIN_TONES),
  shirt = pickColor(SHIRT_COLORS),
  mundu = pickColor(MUNDU_COLORS),
  border = pickColor(BORDER_COLORS),
  hair = pickColor(HAIR_COLORS),
  glasses = !kid && Math.random() < 0.16,
  moustache = !kid && gender === "male" && Math.random() < 0.55,
  seed = Math.random(),
} = {}) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const rng = mulberry32(Math.floor(seed * 1e9));
  const scale = kid ? 0.72 : 1;
  group.scale.setScalar(scale);

  // ---------------------------------------------------------------- legs
  const legs = {};
  for (const side of ["L", "R"]) {
    const sign = side === "L" ? 1 : -1;
    const hip = new THREE.Group();
    hip.position.set(sign * 0.095, 0.78, 0);
    body.add(hip);

    addCapsule(hip, 0.062, 0.26, skin, 0, -0.19, 0, { capSeg: 6, radialSeg: 10 });

    const knee = new THREE.Group();
    knee.position.set(0, -0.38, 0);
    hip.add(knee);
    addCapsule(knee, 0.052, 0.26, skin, 0, -0.18, 0, { capSeg: 6, radialSeg: 10 });

    // Sandal
    addBox(knee, 0.105, 0.045, 0.19, "#6f4a30", 0, -0.355, 0.045, { cast: true });
    addBox(knee, 0.11, 0.02, 0.2, mundu, 0, -0.33, 0.045, { cast: false });

    legs[side] = { hip, knee };
  }

  // ---------------------------------------------------------------- torso
  addCapsule(body, 0.19, 0.27, shirt, 0, 1.07, 0, { capSeg: 8, radialSeg: 16 });

  // Mundu / lower wrap
  addCyl(body, 0.205, 0.275, 0.5, 18, mundu, 0, 0.54, 0);
  addCyl(body, 0.212, 0.212, 0.045, 18, border, 0, 0.79, 0);
  addBox(body, 0.24, 0.16, 0.02, border, 0.06, 0.42, 0.26, { rx: -0.08, cast: false });

  // Shirt details: collar, buttons, pocket
  addCyl(body, 0.095, 0.115, 0.075, 12, mundu, 0, 1.315, 0.01, { cast: false });
  for (let i = 0; i < 3; i++) {
    addSphere(body, 0.012, "#f5e9d0", 0.025, 1.18 - i * 0.11, 0.192, {
      widthSeg: 8,
      heightSeg: 6,
      cast: false,
    });
  }
  addBox(body, 0.1, 0.09, 0.012, border, -0.095, 1.13, 0.18, { cast: false, ry: 0.1 });

  if (gender === "female") {
    // Simple pallu across the shoulder
    const pallu = addBox(body, 0.18, 0.62, 0.035, shirt, -0.06, 1.06, 0.155, {
      rz: 0.42,
      cast: false,
    });
    pallu.renderOrder = 1;
  }

  // ---------------------------------------------------------------- arms
  const arms = {};
  for (const side of ["L", "R"]) {
    const sign = side === "L" ? 1 : -1;
    const arm = new THREE.Group();
    arm.position.set(sign * 0.225, 1.335, 0);
    body.add(arm);

    addCapsule(arm, 0.052, 0.29, shirt, 0, -0.16, 0, { capSeg: 6, radialSeg: 10 });
    addSphere(arm, 0.06, skin, 0, -0.335, 0, { widthSeg: 12, heightSeg: 10 });

    const hand = new THREE.Group();
    hand.position.set(0, -0.39, 0);
    arm.add(hand);

    // Sleeve cuff
    addCyl(arm, 0.058, 0.058, 0.045, 10, shirt, 0, -0.055, 0, { cast: false });

    arms[side] = { arm, hand };
  }

  // ---------------------------------------------------------------- head
  const head = new THREE.Group();
  head.position.set(0, 1.585, 0);
  body.add(head);

  addSphere(head, 0.19, skin, 0, 0, 0, { sx: 1, sy: 1.04, sz: 0.98, widthSeg: 24, heightSeg: 18 });
  addSphere(head, 0.062, skin, 0, -0.19, 0.005, { sx: 1, sy: 0.8, sz: 1, cast: false });

  // Hair cap
  const hairMat = hair;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.198, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
    mat(hairMat)
  );
  cap.position.set(0, 0.012, -0.012);
  cap.scale.set(1.02, 1.02, 1.0);
  cap.castShadow = true;
  head.add(cap);

  if (gender === "female") {
    addSphere(head, 0.095, hairMat, 0, -0.03, -0.165, { sx: 0.95, sy: 1.15, sz: 0.85 });
    addCapsule(head, 0.075, 0.28, hairMat, 0, -0.22, -0.15, { rz: 0.08, cast: true });
    addSphere(head, 0.05, hairMat, 0, 0.16, 0.11, { sx: 1.4, sy: 0.55, sz: 0.9, cast: false });
  } else {
    // Sideburns
    addSphere(head, 0.05, hairMat, 0.165, 0.02, 0.02, { sx: 0.45, sy: 1.0, sz: 0.65, cast: false });
    addSphere(head, 0.05, hairMat, -0.165, 0.02, 0.02, { sx: 0.45, sy: 1.0, sz: 0.65, cast: false });
  }

  // Ears
  addSphere(head, 0.045, skin, 0.188, -0.01, -0.005, { sx: 0.55, sy: 1, sz: 0.85, cast: false });
  addSphere(head, 0.045, skin, -0.188, -0.01, -0.005, { sx: 0.55, sy: 1, sz: 0.85, cast: false });

  // Dot eyes
  addSphere(head, 0.0165, FACE, 0.068, 0.025, 0.182, { widthSeg: 8, heightSeg: 6, cast: false });
  addSphere(head, 0.0165, FACE, -0.068, 0.025, 0.182, { widthSeg: 8, heightSeg: 6, cast: false });
  addSphere(head, 0.006, "#fbf5e6", 0.071, 0.031, 0.197, { widthSeg: 6, heightSeg: 4, cast: false });
  addSphere(head, 0.006, "#fbf5e6", -0.065, 0.031, 0.197, { widthSeg: 6, heightSeg: 4, cast: false });

  // Eyebrows
  addBox(head, 0.045, 0.009, 0.01, hairMat, 0.068, 0.068, 0.178, { rz: -0.08, cast: false });
  addBox(head, 0.045, 0.009, 0.01, hairMat, -0.068, 0.068, 0.178, { rz: 0.08, cast: false });

  // Smile (half torus, ends turned up)
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.008, 6, 16, Math.PI),
    mat(FACE)
  );
  smile.position.set(0, -0.06, 0.183);
  smile.rotation.z = Math.PI;
  head.add(smile);

  // Nose
  addSphere(head, 0.017, skin, 0, -0.012, 0.196, { sx: 1, sy: 0.85, sz: 1.1, cast: false });

  if (moustache) {
    addCapsule(head, 0.012, 0.055, FACE, 0.038, -0.028, 0.187, {
      rz: Math.PI / 2 - 0.12,
      cast: false,
    });
    addCapsule(head, 0.012, 0.055, FACE, -0.038, -0.028, 0.187, {
      rz: Math.PI / 2 + 0.12,
      cast: false,
    });
  }

  if (gender === "female") {
    addSphere(head, 0.008, "#b23148", 0, 0.098, 0.188, { widthSeg: 6, heightSeg: 4, cast: false });
    addTorus(head, 0.025, 0.005, C.mustard, 0.198, -0.05, 0, { rx: Math.PI / 2, cast: false });
    addTorus(head, 0.025, 0.005, C.mustard, -0.198, -0.05, 0, { rx: Math.PI / 2, cast: false });
  }

  if (!kid) {
    addSphere(head, 0.028, BLUSH, 0.12, -0.035, 0.16, { sx: 1.4, sy: 0.8, sz: 0.3, cast: false });
    addSphere(head, 0.028, BLUSH, -0.12, -0.035, 0.16, { sx: 1.4, sy: 0.8, sz: 0.3, cast: false });
  }

  if (glasses) {
    addTorus(head, 0.052, 0.006, "#54443a", 0.07, 0.028, 0.19, { cast: false });
    addTorus(head, 0.052, 0.006, "#54443a", -0.07, 0.028, 0.19, { cast: false });
    addBox(head, 0.035, 0.006, 0.006, "#54443a", 0, 0.028, 0.19, { cast: false });
  }

  // ---------------------------------------------------------------- sip glass
  const sip = new THREE.Group();
  const sipGlass = addCyl(
    sip,
    0.033,
    0.03,
    0.085,
    12,
    mat(C.glass, { transparent: true, opacity: 0.45, depthWrite: false }),
    0,
    0.042,
    0,
    { cast: false }
  );
  sipGlass.renderOrder = 2;
  addCyl(sip, 0.03, 0.028, 0.055, 12, C.tea, 0, 0.034, 0, { cast: false });
  sip.visible = false;
  arms.R.hand.add(sip);
  sip.position.set(0.01, -0.03, 0.03);

  // ---------------------------------------------------------------- umbrella
  const umbrella = new THREE.Group();
  const pole = addCyl(umbrella, 0.012, 0.012, 1.05, 6, "#5c4530", 0.33, 1.65, 0.02, { cast: false });
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(0.52, 0.24, 14, 1, true),
    mat(pickColor(["#3f7f79", "#b75472", "#5a7ca6", "#c85a44"]))
  );
  canopy.position.set(0.33, 2.18, 0.02);
  canopy.castShadow = true;
  umbrella.add(canopy);
  addSphere(umbrella, 0.02, "#5c4530", 0.33, 2.3, 0.02, { cast: false });
  umbrella.visible = false;
  body.add(umbrella);

  // ---------------------------------------------------------------- rig state
  const state = {
    group,
    body,
    head,
    legs,
    arms,
    sip,
    umbrella,
    pose: "idle",
    walking: false,
    drinking: false,
    drinkTimer: 2 + rng() * 3,
    time: rng() * 10,
    phase: rng() * Math.PI * 2,
    speed: 0,
    headYaw: 0,
    blinkTimer: 2 + rng() * 4,
  };

  state.setPose = (pose) => {
    state.pose = pose;
    state.walking = pose === "walk";
  };

  state.setDrinking = (on) => {
    state.drinking = on;
    if (!on) state.sip.visible = false;
  };

  state.setUmbrella = (on) => {
    state.umbrella.visible = on;
  };

  state.setHeadLook = (yaw) => {
    state.headYaw = yaw;
  };

  state.attachToHand = (object3d, hand = "R") => {
    arms[hand].hand.add(object3d);
    return object3d;
  };

  state.headWorld = (out = new THREE.Vector3()) => {
    return head.getWorldPosition(out);
  };

  state.update = (dt, elapsed) => {
    state.time += dt;
    const t = state.time;
    const walk = state.walking;
    const sit = state.pose === "sit";

    if (walk) {
      state.phase += dt * (state.speed || 1.15) * 7.4;
    }

    const target = {
      bodyY: sit ? -0.36 : 0,
      thighL: 0,
      thighR: 0,
      shinL: 0,
      shinR: 0,
      armLX: 0,
      armRX: 0,
      armLZ: 0.06,
      armRZ: -0.06,
      headY: 0,
      headZ: 0,
      footL: 0,
      footR: 0,
    };

    if (sit) {
      target.thighL = -1.32;
      target.thighR = -1.32;
      target.shinL = 1.28;
      target.shinR = 1.28;
      target.armLX = -0.68;
      target.armRX = -0.68;
      target.armLZ = 0.16;
      target.armRZ = -0.16;
      target.bodyY = -0.36 + Math.sin(t * 1.5) * 0.004;
    } else if (walk) {
      const s = Math.sin(state.phase);
      const s2 = Math.sin(state.phase + Math.PI);
      target.thighL = s * 0.55;
      target.thighR = s2 * 0.55;
      target.shinL = Math.max(0, -s) * 0.85;
      target.shinR = Math.max(0, -s2) * 0.85;
      target.armLX = -s * 0.45;
      target.armRX = -s2 * 0.45;
      target.bodyY = Math.abs(Math.sin(state.phase * 2)) * 0.025;
      target.headZ = Math.sin(state.phase * 2) * 0.015;
    } else {
      target.bodyY = Math.sin(t * 1.6) * 0.006;
      target.armLX = Math.sin(t * 1.4) * 0.02;
      target.armRX = Math.sin(t * 1.4 + 1) * 0.02;
    }

    if (state.pose === "wave") {
      target.armRZ = 2.32 + Math.sin(t * 9.5) * 0.28;
      target.armRX = -0.12;
      target.bodyY += Math.abs(Math.sin(t * 4.5)) * 0.012;
    }

    if (state.pose === "angry") {
      target.headZ = Math.sin(t * 12) * 0.05;
      target.armLX = -0.3;
      target.armRX = -0.3;
      target.armLZ = 0.28;
      target.armRZ = -0.28;
      target.thighL = Math.sin(t * 6) * 0.08;
      target.thighR = -Math.sin(t * 6) * 0.08;
    }

    if (state.drinking && (sit || state.pose === "idle")) {
      state.drinkTimer += dt;
      const cycle = state.drinkTimer % 8.5;
      let raise = 0;
      if (cycle > 1.2 && cycle < 3.6) {
        raise = Math.sin(((cycle - 1.2) / 2.4) * Math.PI);
        state.sip.visible = raise > 0.28;
      } else {
        state.sip.visible = false;
      }
      target.armRX = -0.68 - raise * 1.7;
      target.armRZ = -0.16 + raise * 0.06;
      target.headZ = -raise * 0.05;
    } else {
      state.sip.visible = false;
    }

    const k = 9;
    const b = state.body;
    b.position.y = damp(b.position.y, target.bodyY, 8, dt);

    for (const side of ["L", "R"]) {
      const l = legs[side];
      const thigh = side === "L" ? target.thighL : target.thighR;
      const shin = side === "L" ? target.shinL : target.shinR;
      l.hip.rotation.x = damp(l.hip.rotation.x, thigh, k, dt);
      l.knee.rotation.x = damp(l.knee.rotation.x, shin, k, dt);
    }

    arms.L.arm.rotation.x = damp(arms.L.arm.rotation.x, target.armLX, k, dt);
    arms.R.arm.rotation.x = damp(arms.R.arm.rotation.x, target.armRX, k, dt);
    arms.L.arm.rotation.z = damp(arms.L.arm.rotation.z, target.armLZ, k, dt);
    arms.R.arm.rotation.z = damp(arms.R.arm.rotation.z, target.armRZ, k, dt);

    // Gentle idle head motion, plus a target yaw toward whoever is talking.
    head.rotation.y = damp(head.rotation.y, state.headYaw + Math.sin(t * 0.37) * 0.04, 4, dt);
    head.rotation.z = damp(head.rotation.z, target.headZ, 6, dt);
    head.position.y = 1.585 + Math.sin(t * 1.4) * 0.003;
  };

  return state;
}

/** Build a street dog. Faces +z. */
export function createDog({ color = pickColor(["#a9743f", "#c58d52", "#7a5235", "#d8b07a", "#5a4636"]), patch = pickColor(["#f2e6cf", "#e0c49a", "#8a6746"]) } = {}) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  addSphere(body, 0.17, color, 0, 0.38, 0, { sx: 1.0, sy: 0.95, sz: 1.75, widthSeg: 18, heightSeg: 14 });
  addSphere(body, 0.09, patch, 0.09, 0.4, 0.24, { sx: 0.9, sy: 0.7, sz: 1.2, cast: false });

  // Chest and rump
  addSphere(body, 0.145, color, 0, 0.39, 0.2, { sx: 0.95, sy: 0.9, sz: 0.8 });
  addSphere(body, 0.135, color, 0, 0.37, -0.2, { sx: 0.95, sy: 0.9, sz: 0.8 });

  const head = new THREE.Group();
  head.position.set(0, 0.53, 0.3);
  body.add(head);
  addSphere(head, 0.135, color, 0, 0, 0, { sx: 1, sy: 0.95, sz: 1.05, widthSeg: 16, heightSeg: 12 });
  addSphere(head, 0.085, patch, 0, -0.03, 0.11, { sx: 0.9, sy: 0.7, sz: 1.2 });
  addSphere(head, 0.028, "#2b1d18", 0, -0.01, 0.19, { widthSeg: 8, heightSeg: 6, cast: false });
  addSphere(head, 0.017, "#1c1310", 0.055, 0.045, 0.125, { widthSeg: 8, heightSeg: 6, cast: false });
  addSphere(head, 0.017, "#1c1310", -0.055, 0.045, 0.125, { widthSeg: 8, heightSeg: 6, cast: false });

  // Ears
  for (const sign of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.15, 5), mat(color));
    ear.position.set(sign * 0.105, 0.115, 0.0);
    ear.rotation.z = sign * 0.42;
    ear.rotation.x = -0.15;
    ear.castShadow = true;
    head.add(ear);
  }

  // Collar
  addTorus(body, 0.12, 0.018, C.red, 0, 0.47, 0.21, { rx: Math.PI / 2, cast: false });

  // Legs
  const legs = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(sx * 0.1, 0.27, sz * 0.2);
      body.add(leg);
      addCapsule(leg, 0.033, 0.2, color, 0, -0.11, 0, { capSeg: 4, radialSeg: 8 });
      addSphere(leg, 0.045, patch, 0, -0.225, 0.03, { sx: 1.1, sy: 0.6, sz: 1.3, cast: false });
      legs.push(leg);
    }
  }

  // Tail
  const tail = new THREE.Group();
  tail.position.set(0, 0.46, -0.28);
  body.add(tail);
  addCapsule(tail, 0.028, 0.2, color, 0, 0.1, -0.04, { rx: -0.6, cast: false });

  const state = {
    group,
    body,
    head,
    tail,
    legs,
    pose: "stand",
    time: Math.random() * 10,
    phase: Math.random() * Math.PI * 2,
    speed: 0,
    setPose: (pose) => {
      state.pose = pose;
    },
    update: (dt, elapsed) => {
      state.time += dt;
      const t = state.time;
      const walking = state.pose === "walk" || state.pose === "run";
      if (walking) state.phase += dt * (state.speed || 1.5) * 6;

      let bodyY = 0;
      let bodyZ = 0;
      let headY = 0.53;
      let headX = 0;
      let tailZ = 0;
      let legSwing = 0;

      if (state.pose === "lie") {
        bodyY = -0.22;
        headY = 0.4;
        headX = -0.18;
        bodyZ = 0.02;
      } else if (state.pose === "fight") {
        bodyY = 0.02 + Math.abs(Math.sin(t * 8)) * 0.04;
        bodyZ = 0.04;
        headX = -0.12 + Math.sin(t * 9) * 0.12;
        tailZ = Math.sin(t * 12) * 0.4;
      } else if (walking) {
        bodyY = Math.abs(Math.sin(state.phase * 2)) * 0.02;
        legSwing = 0.5;
      }

      state.body.position.y = damp(state.body.position.y, bodyY, 10, dt);
      state.body.position.z = damp(state.body.position.z, bodyZ, 10, dt);
      state.head.rotation.x = damp(state.head.rotation.x, headX, 8, dt);
      state.head.position.y = damp(state.head.position.y, headY, 8, dt);

      legs.forEach((leg, i) => {
        const phase = state.phase + (i % 2 === 0 ? 0 : Math.PI);
        const swing = walking ? Math.sin(phase) * legSwing : 0;
        leg.rotation.x = damp(leg.rotation.x, swing, 12, dt);
      });

      const wag = state.pose === "lie" ? Math.sin(t * 2.2) * 0.15 : Math.sin(t * (state.pose === "fight" ? 10 : 5)) * 0.5;
      state.tail.rotation.z = damp(state.tail.rotation.z, tailZ + wag, 10, dt);
      state.tail.rotation.x = damp(state.tail.rotation.x, state.pose === "lie" ? -1.0 : -0.5, 6, dt);
      state.head.rotation.y = Math.sin(t * 0.8) * 0.12;
    },
  };

  return state;
}

/**
 * Food / drink prop. Origin sits at the base so it can be placed on tables,
 * trays and counters.
 */
export function createFoodMesh(id, { scale = 1 } = {}) {
  const item = itemById(id);
  const group = new THREE.Group();
  if (!item) return group;

  if (item.kind === "drink") {
    const liquid = item.id === "kaapi" ? C.coffee : item.id === "kattan chaya" ? "#6b2f16" : item.id === "boost" ? C.boost : C.tea;
    addCyl(
      group,
      0.035,
      0.032,
      0.095,
      14,
      mat(C.glass, { transparent: true, opacity: 0.42, depthWrite: false }),
      0,
      0.048,
      0,
      { cast: false }
    );
    addCyl(group, 0.031, 0.029, 0.062, 12, liquid, 0, 0.038, 0, { cast: false });
    addCyl(group, 0.032, 0.031, 0.012, 12, "#f4e3c8", 0, 0.082, 0, { cast: false });
    addTorus(group, 0.032, 0.003, "#eef6f4", 0, 0.096, 0, { rx: Math.PI / 2, cast: false });
    // Steam wisp
    const steam = addSphere(group, 0.04, mat("#f7efe0", { transparent: true, opacity: 0.24, depthWrite: false }), 0, 0.15, 0, {
      sx: 0.5,
      sy: 1.1,
      sz: 0.5,
      cast: false,
    });
    steam.renderOrder = 3;
    group.scale.setScalar(scale);
    return group;
  }

  if (item.id === "chocolate") {
    addBox(group, 0.095, 0.026, 0.05, C.chocolate, 0, 0.018, 0, { cast: false });
    addBox(group, 0.028, 0.027, 0.052, C.wrapper, -0.036, 0.018, 0, { cast: false });
    addBox(group, 0.028, 0.027, 0.052, C.wrapper, 0.036, 0.018, 0, { cast: false });
    group.scale.setScalar(scale);
    return group;
  }

  // Plate
  addCyl(group, 0.088, 0.078, 0.012, 20, "#f4ead6", 0, 0.006, 0, { cast: false });
  addTorus(group, 0.08, 0.006, C.amberDeep, 0, 0.012, 0, { rx: Math.PI / 2, cast: false });

  const shape = item.shape ?? "bonda";
  const col = item.color ?? C.mustard;

  if (shape === "samosa") {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.09, 3), mat(col));
    mesh.position.set(0, 0.058, 0);
    mesh.rotation.y = Math.PI / 6;
    mesh.castShadow = true;
    group.add(mesh);
  } else if (shape === "pazhampori") {
    addSphere(group, 0.07, col, 0, 0.038, 0, { sx: 1.2, sy: 0.38, sz: 1.0, widthSeg: 16, heightSeg: 10 });
    addSphere(group, 0.018, "#7a3d18", 0.03, 0.052, 0.01, { cast: false });
  } else if (shape === "roll") {
    addCapsule(group, 0.033, 0.1, col, 0, 0.04, 0, { rz: Math.PI / 2, capSeg: 4, radialSeg: 10 });
    addCyl(group, 0.033, 0.033, 0.012, 10, "#9c5a32", 0.062, 0.04, 0, { rz: Math.PI / 2, cast: false });
    addCyl(group, 0.033, 0.033, 0.012, 10, "#9c5a32", -0.062, 0.04, 0, { rz: Math.PI / 2, cast: false });
  } else if (shape === "vada") {
    addTorus(group, 0.045, 0.021, col, 0, 0.035, 0, { rx: Math.PI / 2, cast: true });
  } else if (shape === "baji") {
    addSphere(group, 0.062, col, 0, 0.062, 0, { sx: 1.0, sy: 0.8, sz: 1.0 });
    addSphere(group, 0.035, "#f2cf6a", 0, 0.105, 0, { sy: 0.65, cast: false });
  } else if (shape === "sugiyan") {
    addSphere(group, 0.052, col, 0, 0.052, 0, { sx: 1, sy: 0.85, sz: 1 });
    addSphere(group, 0.02, "#6b3b1e", 0, 0.095, 0, { cast: false });
  } else {
    // bonda / default: three little fried balls
    addSphere(group, 0.036, col, 0.02, 0.042, 0.0, { widthSeg: 12, heightSeg: 10 });
    addSphere(group, 0.033, col, -0.03, 0.04, 0.018, { widthSeg: 12, heightSeg: 10 });
    addSphere(group, 0.031, col, -0.002, 0.042, -0.045, { widthSeg: 12, heightSeg: 10 });
  }

  group.scale.setScalar(scale);
  return group;
}

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
