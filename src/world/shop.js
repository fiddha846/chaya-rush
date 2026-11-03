import * as THREE from "three";
import { C, mat, addBox, addCyl, addSphere, addCapsule, addPlane, addTorus, canvasTexture, makeCanvas, roundRect, makeFloorTexture, makeRoofTexture, makeWoodTexture, makeSoftTexture, softSprite } from "./art.js";
import { MENU_ROWS, CHOCOLATE, formatMoney } from "../config/menu.js";
import { SIGNS, UI } from "../config/strings.ml.js";
import { SHOP, COUNTER, SPOTS, OWNER_EYE } from "../config/layout.js";

/**
 * The chayakkada itself: open-fronted shop, terracotta roof, cream stucco,
 * honey-wood counter, glass snack case, wall menu, benches, hanging bulbs and
 * the little foreground details from the reference boards.
 */
export function buildShop({ scene, renderer }) {
  const group = new THREE.Group();
  group.name = "chayakkada";
  scene.add(group);

  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() ?? 4);
  const soft = makeSoftTexture(128, "rgba(255,255,255,0.9)", "rgba(255,255,255,0)");
  const floorTex = makeFloorTexture(aniso);
  const woodTex = makeWoodTexture(aniso);
  const woodDarkTex = makeWoodTexture(aniso, C.woodDark);
  const roofTex = makeRoofTexture(aniso);

  const M = {
    floor: new THREE.MeshLambertMaterial({ map: floorTex }),
    wood: new THREE.MeshLambertMaterial({ map: woodTex }),
    woodDark: new THREE.MeshLambertMaterial({ map: woodDarkTex }),
    cream: mat(C.cream),
    plaster: mat(C.plaster),
    plasterShade: mat(C.plasterShade),
    roof: new THREE.MeshLambertMaterial({ map: roofTex }),
    roofDark: mat(C.roofDark),
    thatch: mat(C.thatch),
    green: mat(C.green),
    greenDark: mat(C.greenDark),
    steel: mat(C.steel),
    steelDark: mat(C.steelDark),
    brass: mat(C.brass),
    copper: mat(C.copper),
    glass: mat(C.glass, { transparent: true, opacity: 0.22, depthWrite: false }),
    tea: mat(C.tea),
    lamp: mat(C.lamp, { emissive: C.amber, emissiveIntensity: 0.9 }),
  };

  const animated = {
    bulbs: [],
    glows: [],
    fan: null,
    steam: null,
    catTail: null,
    cat: null,
    time: 0,
  };

  buildShell(group, M);
  const seats = buildSeating(group, M);
  buildCounter(group, M, soft, animated);
  buildWallMenu(group, M);
  buildDecor(group, M, soft, animated);
  buildLights(group, M, soft, animated);
  buildPorch(group, M, soft, animated);
  buildVerandaProps(group, M, soft);

  const anchors = {
    steam: new THREE.Vector3(-1.3, 1.5, 2.25),
    cat: new THREE.Vector3(2.35, 2.2, 3.82),
    counterFood: [new THREE.Vector3(0.55, 1.1, 1.98), new THREE.Vector3(1.9, 1.1, 1.98)],
    outsideTable: new THREE.Vector3(3.0, 0.92, -6.0),
    outsideBenchTray: new THREE.Vector3(-2.1, 0.49, -5.45),
    tableFor: (spot) => {
      if (!spot) return new THREE.Vector3(0, 0.7, 0);
      if (spot.id === "counterA") return anchors.counterFood[0].clone();
      if (spot.id === "counterB") return anchors.counterFood[1].clone();
      if (spot.id === "outsideBench") return anchors.outsideBenchTray.clone();
      if (spot.id === "outsideStand") return anchors.outsideTable.clone();
      if (spot.table) return spot.table.clone().setY(spot.table.y + 0.015);
      return new THREE.Vector3(spot.pos.x, 0.7, spot.pos.z);
    },
  };

  function update(dt, elapsed) {
    animated.time = elapsed;
    if (animated.fan) animated.fan.rotation.y += dt * 1.15;

    for (const b of animated.bulbs) {
      b.light.intensity = b.base * (0.93 + Math.sin(elapsed * 5.4 + b.phase) * 0.07);
    }
    for (const g of animated.glows) {
      g.material.opacity = g.base * (0.9 + Math.sin(elapsed * 3.1 + g.phase) * 0.1);
    }

    if (animated.steam) updateSteam(animated.steam, dt, elapsed);
    if (animated.catTail) animated.catTail.rotation.z = Math.sin(elapsed * 1.4) * 0.22;
    if (animated.cat) animated.cat.position.y = 2.2 + Math.sin(elapsed * 1.1) * 0.004;
  }

  return { group, update, anchors, seats };
}

/* ================================================================== */
/*  Shell, roof, walls                                                */
/* ================================================================== */

function buildShell(parent, M) {
  // Interior floor
  const floor = addBox(parent, SHOP.width, 0.12, SHOP.depth, M.floor, 0, -0.06, 0, {
    cast: false,
    receive: true,
  });
  floor.receiveShadow = true;

  // Veranda slab
  addBox(parent, SHOP.width + 1.2, 0.1, 2.0, mat(C.floorShade), 0, -0.045, -5.1, {
    cast: false,
    receive: true,
  });

  // Back wall and side walls
  addBox(parent, SHOP.width + 0.2, SHOP.height, 0.22, M.plaster, 0, SHOP.height / 2, SHOP.backZ, {
    cast: true,
    receive: true,
  });
  addBox(parent, 0.22, SHOP.height, SHOP.depth, M.plaster, -SHOP.halfW, SHOP.height / 2, 0);
  addBox(parent, 0.22, SHOP.height, SHOP.depth, M.plaster, SHOP.halfW, SHOP.height / 2, 0);

  // Warm wainscot band
  const band = mat(C.creamShade);
  addBox(parent, SHOP.width - 0.3, 0.12, 0.04, band, 0, 1.02, SHOP.backZ - 0.13, { cast: false });
  addBox(parent, 0.04, 0.12, SHOP.depth - 0.3, band, -SHOP.halfW + 0.13, 1.02, 0, { cast: false });
  addBox(parent, 0.04, 0.12, SHOP.depth - 0.3, band, SHOP.halfW - 0.13, 1.02, 0, { cast: false });

  // Ceiling boards + beams
  addBox(parent, SHOP.width, 0.14, SHOP.depth, mat("#5a4028"), 0, SHOP.height, 0, {
    cast: false,
    receive: true,
  });
  for (const z of [-3.6, -2.2, -0.8, 0.6, 2.0, 3.4]) {
    addBox(parent, SHOP.width + 0.1, 0.16, 0.2, M.woodDark, 0, SHOP.height - 0.09, z);
  }

  // Open front: header + posts
  addBox(parent, SHOP.width + 0.3, 0.34, 0.3, M.woodDark, 0, SHOP.height - 0.17, SHOP.frontZ);
  for (const x of [-SHOP.halfW + 0.12, SHOP.halfW - 0.12]) {
    addBox(parent, 0.24, SHOP.height - 0.3, 0.24, M.woodDark, x, (SHOP.height - 0.3) / 2, SHOP.frontZ);
  }

  // Threshold
  addBox(parent, SHOP.width + 0.2, 0.1, 0.55, M.woodDark, 0, 0.03, SHOP.frontZ - 0.05, {
    cast: false,
    receive: true,
  });

  // Pitched terracotta roof, ridge along x
  const roofAngle = 0.22;
  const front = addBox(parent, SHOP.width + 1.6, 0.16, 6.55, M.roof, 0, 3.95, -3.02, {
    rx: -roofAngle,
    cast: true,
    receive: true,
  });
  front.receiveShadow = true;
  addBox(parent, SHOP.width + 1.6, 0.16, 6.55, M.roof, 0, 3.95, 3.02, {
    rx: roofAngle,
    cast: true,
    receive: true,
  });
  addCyl(parent, 0.09, 0.09, SHOP.width + 1.8, 10, M.roofDark, 0, 4.62, 0, {
    rz: Math.PI / 2,
    cast: false,
  });

  // Gable triangles
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(-4.4, 0);
    shape.lineTo(4.4, 0);
    shape.lineTo(0, 1.32);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(geo, mat(C.cream));
    mesh.position.set(side * (SHOP.halfW + 0.11), SHOP.height - 0.02, 0);
    mesh.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    mesh.rotation.z = side > 0 ? 0 : 0;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }

  // Eave fascia + thatch valance along the front
  addBox(parent, SHOP.width + 1.6, 0.16, 0.18, M.woodDark, 0, 3.01, -6.18, { cast: false });
  const valance = addBox(parent, SHOP.width + 1.3, 0.34, 0.09, M.thatch, 0, 2.87, -6.15, {
    cast: false,
  });
  for (let i = 0; i < 26; i++) {
    addBox(parent, 0.06, 0.22, 0.1, i % 2 ? M.thatch : mat("#7d6245"), -5.1 + i * 0.41, 2.68, -6.15, {
      cast: false,
    });
  }

  // Back wall trim
  addBox(parent, SHOP.width, 0.12, 0.06, M.woodDark, 0, SHOP.height - 0.22, SHOP.backZ - 0.14, {
    cast: false,
  });
}

/* ================================================================== */
/*  Seating: long benches, small tables, glasses                      */
/* ================================================================== */

function buildSeating(parent, M) {
  const seats = [];

  for (const side of [-1, 1]) {
    const x = side * 4.14;
    const backX = side * 4.55;
    const zCenter = -1.35;

    // Bench seat
    addBox(parent, 0.7, 0.09, 3.9, M.wood, x, 0.47, zCenter);
    addBox(parent, 0.62, 0.09, 3.75, M.woodDark, x, 0.32, zCenter, { cast: false });

    // Bench legs
    for (const z of [-3.1, -1.3, 0.5]) {
      addBox(parent, 0.55, 0.34, 0.1, M.woodDark, x, 0.17, z);
    }

    // Backrest
    addBox(parent, 0.1, 0.66, 3.9, M.woodDark, backX, 0.83, zCenter);
    addBox(parent, 0.14, 0.1, 3.9, M.wood, backX, 1.15, zCenter);
    for (let i = 0; i < 6; i++) {
      addBox(parent, 0.06, 0.5, 0.09, M.wood, backX - side * 0.04, 0.84, -3.05 + i * 0.68, {
        cast: false,
      });
    }

    // Cushion stripe
    addBox(parent, 0.64, 0.045, 3.72, mat(side < 0 ? "#c9815a" : "#5b7f8c"), x, 0.525, zCenter, {
      cast: false,
    });

    // Tables and glasses
    for (const z of [-2.35, -0.35]) {
      const tx = side * 3.1;
      addBox(parent, 0.74, 0.07, 0.74, M.wood, tx, 0.7, z);
      addBox(parent, 0.06, 0.66, 0.06, M.woodDark, tx - 0.28, 0.33, z - 0.28);
      addBox(parent, 0.06, 0.66, 0.06, M.woodDark, tx + 0.28, 0.33, z - 0.28);
      addBox(parent, 0.06, 0.66, 0.06, M.woodDark, tx - 0.28, 0.33, z + 0.28);
      addBox(parent, 0.06, 0.66, 0.06, M.woodDark, tx + 0.28, 0.33, z + 0.28);
      // A waiting glass and small snack plate
      addCyl(parent, 0.036, 0.033, 0.09, 12, M.glass, tx - 0.1, 0.785, z + 0.08, { cast: false });
      addCyl(parent, 0.03, 0.028, 0.055, 10, M.tea, tx - 0.1, 0.77, z + 0.08, { cast: false });
      addCyl(parent, 0.075, 0.07, 0.012, 16, mat("#f4ead6"), tx + 0.14, 0.74, z - 0.08, { cast: false });
      addSphere(parent, 0.035, mat(C.mustard), tx + 0.14, 0.775, z - 0.08, { cast: false });
      seats.push({ x: tx, z, side });
    }
  }

  return seats;
}

/* ================================================================== */
/*  Counter, display case, kettle, jars                              */
/* ================================================================== */

function buildCounter(parent, M, soft, animated) {
  const { width, depth, height, z } = COUNTER;

  // Counter body
  addBox(parent, width, height, depth, M.wood, 0, height / 2, z);
  addBox(parent, width + 0.14, 0.07, depth + 0.14, M.woodDark, 0, height + 0.035, z);

  // Cream front panels
  for (let i = 0; i < 5; i++) {
    addBox(parent, 0.74, 0.62, 0.035, mat(C.cream), -1.85 + i * 0.93, 0.57, z + depth / 2 + 0.02, {
      cast: false,
    });
    addBox(parent, 0.62, 0.5, 0.02, mat(C.creamShade), -1.85 + i * 0.93, 0.57, z + depth / 2 + 0.04, {
      cast: false,
    });
  }
  addBox(parent, width + 0.05, 0.08, 0.04, M.woodDark, 0, 0.18, z + depth / 2 + 0.03, { cast: false });

  // Back counter / worktop
  addBox(parent, width - 1.6, 0.95, 0.62, M.woodDark, 0.65, 0.475, 3.55);
  addBox(parent, width - 1.5, 0.06, 0.7, M.wood, 0.65, 0.98, 3.55);

  // Glass snack case (left side of the counter)
  const caseX = -1.35;
  const caseZ = z + 0.02;
  addBox(parent, 1.9, 0.08, 0.56, M.woodDark, caseX, 1.14, caseZ, { cast: false });
  addBox(parent, 1.9, 0.08, 0.56, M.woodDark, caseX, 1.7, caseZ, { cast: false });
  for (const sx of [-1, 1]) {
    addBox(parent, 0.06, 0.56, 0.56, M.woodDark, caseX + sx * 0.92, 1.42, caseZ);
    addBox(parent, 1.88, 0.56, 0.03, M.glass, caseX, 1.42, caseZ + 0.27, { cast: false });
    addBox(parent, 0.03, 0.56, 0.54, M.glass, caseX + sx * 0.915, 1.42, caseZ, { cast: false });
  }
  for (const shelfY of [1.24, 1.45]) {
    addBox(parent, 1.76, 0.03, 0.48, M.wood, caseX, shelfY, caseZ, { cast: false });
    for (let i = 0; i < 5; i++) {
      const x = caseX - 0.7 + i * 0.35;
      const col = i % 2 ? C.mustard : "#c47b32";
      addSphere(parent, 0.055, mat(col), x, shelfY + 0.065, caseZ - 0.08, { sy: 0.6 });
      addTorus(parent, 0.04, 0.016, mat(col), x, shelfY + 0.04, caseZ + 0.12, { rx: Math.PI / 2, cast: false });
    }
  }
  // Tiny Malayalam price cards on the glass
  const cardTex = makePriceCard();
  const cardMat = new THREE.MeshLambertMaterial({ map: cardTex });
  addPlane(parent, 0.24, 0.13, cardMat, caseX - 0.45, 1.51, caseZ + 0.285, { cast: false });
  addPlane(parent, 0.24, 0.13, cardMat, caseX + 0.35, 1.51, caseZ + 0.285, { cast: false });

  // Gas stove + kettle (right side)
  addBox(parent, 0.55, 0.12, 0.42, M.steelDark, 0.93, 1.13, z);
  addCyl(parent, 0.1, 0.12, 0.06, 12, M.steel, 0.93, 1.22, z);
  const kettle = new THREE.Group();
  kettle.position.set(1.55, 1.1, z - 0.02);
  addCyl(kettle, 0.23, 0.26, 0.3, 20, M.steel, 0, 0.15, 0);
  addCyl(kettle, 0.13, 0.2, 0.12, 16, M.steel, 0, 0.34, 0);
  addTorus(kettle, 0.13, 0.018, M.steelDark, 0, 0.4, 0, { rx: Math.PI / 2, cast: false });
  addCyl(kettle, 0.028, 0.028, 0.08, 8, M.steelDark, 0.22, 0.28, 0, { rz: -0.8, cast: false });
  addTorus(kettle, 0.1, 0.02, M.steelDark, -0.24, 0.2, 0, { rz: Math.PI / 2, cast: false });
  parent.add(kettle);

  // Steel jars behind the counter
  for (let i = 0; i < 5; i++) {
    const x = -1.6 + i * 0.62;
    addCyl(parent, 0.13, 0.14, 0.28, 14, M.steel, x, 1.15, 3.55);
    addCyl(parent, 0.14, 0.14, 0.035, 14, M.steelDark, x, 1.3, 3.55);
    addSphere(parent, 0.035, M.steelDark, x, 1.33, 3.55, { cast: false });
  }

  // Glass jar of chocolates + snack jar on the counter
  const jar = new THREE.Group();
  jar.position.set(2.02, 1.09, z + 0.05);
  addCyl(jar, 0.13, 0.15, 0.3, 16, mat(C.glass, { transparent: true, opacity: 0.24, depthWrite: false }), 0, 0.16, 0, {
    cast: false,
  });
  for (let i = 0; i < 7; i++) {
    addBox(jar, 0.075, 0.026, 0.04, mat(i % 2 ? C.chocolate : "#a8425e"), -0.06 + (i % 2) * 0.09, 0.04 + Math.floor(i / 2) * 0.045, -0.03 + (i % 3) * 0.035, {
      ry: i * 0.7,
      cast: false,
    });
  }
  addCyl(jar, 0.14, 0.14, 0.03, 16, M.woodDark, 0, 0.32, 0, { cast: false });
  parent.add(jar);
  const chocTex = makeChocolateCard();
  addPlane(parent, 0.25, 0.14, new THREE.MeshLambertMaterial({ map: chocTex }), 2.02, 1.23, z + 0.17, { cast: false });

  // Glass tumblers, cash box, newspaper, foreground tea
  for (let i = 0; i < 4; i++) {
    addCyl(parent, 0.035, 0.032, 0.085, 10, M.glass, 0.25 + i * 0.085, 1.14, z - 0.1, { cast: false });
  }
  addBox(parent, 0.42, 0.2, 0.3, M.woodDark, -2.05, 1.18, z - 0.05);
  addBox(parent, 0.08, 0.02, 0.03, M.brass, -2.05, 1.29, z - 0.05, { cast: false });

  // Owner-side foreground: folded newspaper and a tea glass
  const paperTex = makeNewspaperCanvas();
  addBox(parent, 0.62, 0.018, 0.45, new THREE.MeshLambertMaterial({ map: paperTex }), 1.35, 1.11, z + 0.33, {
    cast: false,
  });
  addCyl(parent, 0.045, 0.04, 0.1, 14, M.glass, 0.88, 1.18, z + 0.3, { cast: false });
  addCyl(parent, 0.039, 0.036, 0.07, 12, M.tea, 0.88, 1.17, z + 0.3, { cast: false });
  addCyl(parent, 0.04, 0.039, 0.006, 12, mat("#f1dcb8"), 0.88, 1.225, z + 0.3, { cast: false });

  // Kettle steam
  animated.steam = createSteam(parent, soft, new THREE.Vector3(1.55, 1.52, z - 0.02));
}

/* ================================================================== */
/*  Menu board + painted signs                                        */
/* ================================================================== */

function buildWallMenu(parent, M) {
  const canvas = makeMenuBoardCanvas();
  const tex = canvasTexture(canvas, { aniso: 8 });
  const boardMat = new THREE.MeshLambertMaterial({ map: tex });

  const group = new THREE.Group();
  group.position.set(SHOP.halfW - 0.13, 2.05, 0.55);
  group.rotation.y = -Math.PI / 2;
  parent.add(group);

  addBox(group, 2.4, 1.75, 0.06, M.woodDark, 0, 0, -0.01, { cast: false });
  addPlane(group, 2.2, 1.55, boardMat, 0, 0, 0.03, { cast: false });
  addBox(group, 2.4, 0.07, 0.08, M.wood, 0, 0.9, 0, { cast: false });

  // Small chalk "today" tag under the board
  const todayTex = makeTodayCard();
  addPlane(group, 0.56, 0.24, new THREE.MeshLambertMaterial({ map: todayTex }), 0.55, -1.07, 0.03, {
    cast: false,
  });
}

function makeMenuBoardCanvas() {
  return makeCanvas(1024, 720, (ctx, w, h) => {
    ctx.fillStyle = "#243a32";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(245,236,212,0.18)";
    ctx.lineWidth = 4;
    for (let y = 8; y < h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = C.cream;
    ctx.lineWidth = 8;
    roundRect(ctx, 22, 22, w - 44, h - 44, 18);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = C.cream;
    ctx.font = '700 52px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
    ctx.fillText(SIGNS.boardTitle, w / 2, 92);

    ctx.strokeStyle = "rgba(245,236,212,0.45)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 260, 116);
    ctx.lineTo(w / 2 + 260, 116);
    ctx.stroke();

    const rows = [...MENU_ROWS, { label: CHOCOLATE.label, price: CHOCOLATE.price }];
    const half = Math.ceil(rows.length / 2);
    const cols = [
      { x: 82, width: 390 },
      { x: 552, width: 390 },
    ];
    const rowH = 60;

    rows.forEach((row, i) => {
      const col = i < half ? cols[0] : cols[1];
      const r = i < half ? i : i - half;
      const y = 178 + r * rowH;
      if (r % 2 === 0) {
        ctx.fillStyle = "rgba(245,236,212,0.04)";
        ctx.fillRect(col.x - 18, y - 34, col.width + 12, 48);
      }
      ctx.textAlign = "left";
      ctx.fillStyle = C.cream;
      ctx.font = '600 30px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillText(row.label, col.x, y);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffc46b";
      ctx.font = '700 30px "Noto Sans Malayalam", "Segoe UI Symbol", sans-serif';
      ctx.fillText(formatMoney(row.price), col.x + col.width, y);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(245,236,212,0.55)";
    ctx.font = '500 21px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
    ctx.fillText(SIGNS.boardFooter, w / 2, h - 44);
  });
}

function makePriceCard() {
  return canvasTexture(
    makeCanvas(256, 140, (ctx, w, h) => {
      ctx.fillStyle = "#f7efd9";
      roundRect(ctx, 4, 4, w - 8, h - 8, 14);
      ctx.fill();
      ctx.strokeStyle = C.woodDark;
      ctx.lineWidth = 3;
      roundRect(ctx, 8, 8, w - 16, h - 16, 12);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#3a2418";
      ctx.font = '700 38px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillText("പലഹാരം", w / 2, 58);
      ctx.fillStyle = "#a34b2d";
      ctx.font = '700 34px "Noto Sans Malayalam", "Segoe UI Symbol", sans-serif';
      ctx.fillText("₹12 മുതൽ", w / 2, 108);
    })
  );
}

function makeChocolateCard() {
  return canvasTexture(
    makeCanvas(256, 140, (ctx, w, h) => {
      ctx.fillStyle = "#f7efd9";
      roundRect(ctx, 4, 4, w - 8, h - 8, 14);
      ctx.fill();
      ctx.strokeStyle = "#7a2f46";
      ctx.lineWidth = 4;
      roundRect(ctx, 8, 8, w - 16, h - 16, 12);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#5c2234";
      ctx.font = '700 34px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillText(SIGNS.chocolateCard, w / 2, 56);
      ctx.fillStyle = "#a34b2d";
      ctx.font = '700 38px "Noto Sans Malayalam", "Segoe UI Symbol", sans-serif';
      ctx.fillText(formatMoney(CHOCOLATE.price), w / 2, 108);
    })
  );
}

function makeTodayCard() {
  return canvasTexture(
    makeCanvas(300, 128, (ctx, w, h) => {
      ctx.fillStyle = "#f7efd9";
      roundRect(ctx, 4, 4, w - 8, h - 8, 12);
      ctx.fill();
      ctx.strokeStyle = C.woodDark;
      ctx.lineWidth = 3;
      roundRect(ctx, 8, 8, w - 16, h - 16, 10);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#6b4a2c";
      ctx.font = '600 22px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillText(SIGNS.todaySnack, w / 2, 38);
      ctx.fillStyle = "#a34b2d";
      ctx.font = '700 36px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillText(SIGNS.todaySnackValue, w / 2, 90);
    })
  );
}

function makeNewspaperCanvas() {
  return canvasTexture(
    makeCanvas(512, 360, (ctx, w, h) => {
      ctx.fillStyle = "#f4efdf";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(90,70,50,0.2)";
      ctx.lineWidth = 2;
      for (let y = 60; y < h; y += 22) {
        ctx.beginPath();
        ctx.moveTo(18, y);
        ctx.lineTo(w - 18, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#8f3f2a";
      ctx.font = '700 44px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillText("മാതൃഭൂമി", 24, 46);
      ctx.fillStyle = "rgba(60,40,28,0.55)";
      ctx.font = '600 18px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillText("വൈകുന്നേരം", w - 175, 44);
    })
  );
}

/* ================================================================== */
/*  Wall decor, shelves, clock, cat                                   */
/* ================================================================== */

function buildDecor(parent, M, soft, animated) {
  // Poster on the left wall
  const posterTex = makePosterCanvas();
  const poster = addPlane(
    parent,
    1.22,
    1.55,
    new THREE.MeshLambertMaterial({ map: posterTex }),
    -SHOP.halfW + 0.14,
    2.06,
    -1.1,
    { ry: Math.PI / 2, cast: false }
  );
  addBox(parent, 0.06, 1.65, 1.32, M.woodDark, -SHOP.halfW + 0.1, 2.06, -1.1, { cast: false });

  // Back-wall shelves with steel jars
  for (const y of [1.62, 2.12, 2.62]) {
    addBox(parent, 3.4, 0.07, 0.36, M.wood, 0.65, y, SHOP.backZ - 0.24);
  }
  addBox(parent, 0.07, 1.35, 0.36, M.woodDark, -1.03, 2.12, SHOP.backZ - 0.24);
  addBox(parent, 0.07, 1.35, 0.36, M.woodDark, 2.33, 2.12, SHOP.backZ - 0.24);
  for (const y of [1.66, 2.16, 2.66]) {
    for (let i = 0; i < 4; i++) {
      const x = -0.55 + i * 0.7;
      addCyl(parent, 0.11, 0.12, 0.24, 12, M.steel, x, y + 0.15, SHOP.backZ - 0.24);
      addCyl(parent, 0.12, 0.12, 0.028, 12, M.steelDark, x, y + 0.28, SHOP.backZ - 0.24, { cast: false });
    }
  }

  // Clock
  const clock = new THREE.Group();
  clock.position.set(-2.2, 2.75, SHOP.backZ - 0.16);
  parent.add(clock);
  addCyl(clock, 0.22, 0.22, 0.04, 24, mat("#f7efd9"), 0, 0, 0, { rx: Math.PI / 2, cast: false });
  addTorus(clock, 0.23, 0.025, M.woodDark, 0, 0, 0, { cast: false });
  addBox(clock, 0.016, 0.15, 0.012, mat("#3a2418"), 0, 0.06, 0.03, { cast: false });
  addBox(clock, 0.1, 0.016, 0.012, mat("#3a2418"), 0.041, 0, 0.03, { cast: false });
  addSphere(clock, 0.018, mat(C.amberDeep), 0, 0, 0.035, { cast: false });

  // Framed picture / lucky poster on the right wall
  const luckyTex = makeLuckyCanvas();
  addPlane(
    parent,
    0.7,
    0.9,
    new THREE.MeshLambertMaterial({ map: luckyTex }),
    SHOP.halfW - 0.14,
    2.5,
    2.3,
    { ry: -Math.PI / 2, cast: false }
  );

  // Banana bunch hanging from the front-left post / roof beam
  const banana = new THREE.Group();
  banana.position.set(-4.15, 2.35, -5.62);
  parent.add(banana);
  addCyl(banana, 0.02, 0.02, 0.55, 6, "#6b4a2c", 0, 0.28, 0, { cast: false });
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const bx = Math.cos(angle) * 0.1;
    const bz = Math.sin(angle) * 0.09;
    const b = addCyl(banana, 0.035, 0.02, 0.26, 8, i % 2 ? "#f2cf4a" : "#e8c13a", bx, -0.12 - (i % 3) * 0.03, bz, { cast: false });
    b.rotation.z = angle * 0.2;
    b.rotation.x = 0.12 * Math.sin(angle);
  }

  // Sleeping cat on the back shelf
  const cat = new THREE.Group();
  cat.position.set(1.9, 2.2, SHOP.backZ - 0.32);
  parent.add(cat);
  addSphere(cat, 0.11, mat("#d8a05a"), 0, 0.04, 0, { sx: 1.5, sy: 0.7, sz: 0.95 });
  addSphere(cat, 0.085, mat("#d8a05a"), 0.1, 0.08, 0.01, { sx: 1, sy: 0.95, sz: 1 });
  addSphere(cat, 0.035, mat("#c88a44"), 0.12, 0.15, 0, { sx: 0.4, sy: 1, sz: 1, cast: false });
  addSphere(cat, 0.035, mat("#c88a44"), 0.08, 0.15, 0, { sx: 0.4, sy: 1, sz: 1, cast: false });
  const tail = new THREE.Group();
  tail.position.set(-0.13, 0.05, 0.02);
  cat.add(tail);
  addCapsule(tail, 0.018, 0.16, mat("#c88a44"), -0.03, 0.0, 0.05, { rx: 1.1, cast: false });
  animated.catTail = tail;
  animated.cat = cat;

  // Coir mat at the door
  addBox(parent, 1.55, 0.018, 0.6, mat("#9a7a4f"), 0.4, 0.02, -3.95, { cast: false });
  for (let i = 0; i < 5; i++) {
    addBox(parent, 1.38, 0.006, 0.035, mat("#b28f5f"), 0.4, 0.03, -4.15 + i * 0.1, { cast: false });
  }
}

function makePosterCanvas() {
  return canvasTexture(
    makeCanvas(512, 660, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#f5ecd4");
      g.addColorStop(1, "#eadbbd");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = C.roof;
      ctx.lineWidth = 12;
      ctx.strokeRect(18, 18, w - 36, h - 36);
      ctx.textAlign = "center";
      ctx.fillStyle = C.roof;
      ctx.font = '700 62px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillText(SIGNS.hotTea, w / 2, 122);
      // Tea glass
      const gx = w / 2;
      const gy = 330;
      ctx.fillStyle = "#c48a4b";
      ctx.beginPath();
      ctx.moveTo(gx - 65, gy - 72);
      ctx.lineTo(gx + 65, gy - 72);
      ctx.lineTo(gx + 46, gy + 78);
      ctx.lineTo(gx - 46, gy + 78);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#8b5a2b";
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,244,220,0.45)";
      ctx.fillRect(gx - 44, gy - 50, 88, 22);
      // Steam
      ctx.strokeStyle = "rgba(120,90,60,0.38)";
      ctx.lineWidth = 6;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(gx + i * 26, gy - 88);
        ctx.bezierCurveTo(gx + i * 26 - 12, gy - 125, gx + i * 26 + 12, gy - 150, gx + i * 26, gy - 180);
        ctx.stroke();
      }
      ctx.fillStyle = "#5c4432";
      ctx.font = '600 30px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillText(SIGNS.posterSub, w / 2, 500);
      ctx.fillStyle = C.roof;
      ctx.font = '700 34px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillText(SIGNS.shop, w / 2, 578);
    })
  );
}

function makeLuckyCanvas() {
  return canvasTexture(
    makeCanvas(360, 460, (ctx, w, h) => {
      ctx.fillStyle = "#f3e4c5";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#8b5a2b";
      ctx.lineWidth = 10;
      ctx.strokeRect(12, 12, w - 24, h - 24);
      ctx.textAlign = "center";
      ctx.fillStyle = "#8c3e25";
      ctx.font = '700 52px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillText("ശുഭം", w / 2, 150);
      ctx.fillStyle = C.greenDark;
      ctx.beginPath();
      ctx.arc(w / 2, 285, 78, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd489";
      ctx.beginPath();
      ctx.arc(w / 2, 285, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f3e4c5";
      ctx.font = '600 26px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
      ctx.fillText("ചായക്കട", w / 2, 405);
    })
  );
}

/* ================================================================== */
/*  Lights, string bulbs, fan, steam                                  */
/* ================================================================== */

function buildLights(parent, M, soft, animated) {
  // Hanging bulbs inside
  const bulbs = [
    { x: -1.5, z: 0.35, y: 2.55, phase: 0 },
    { x: 1.7, z: 2.05, y: 2.6, phase: 2.2 },
    { x: 0.1, z: -2.35, y: 2.6, phase: 4.0 },
  ];
  for (const b of bulbs) {
    addCyl(parent, 0.008, 0.008, 0.65, 5, mat("#4a3a2a"), b.x, SHOP.height - 0.38, b.z, { cast: false });
    addCyl(parent, 0.16, 0.16, 0.05, 14, M.woodDark, b.x, SHOP.height - 0.71, b.z, { cast: false });
    addSphere(parent, 0.07, M.lamp, b.x, SHOP.height - 0.79, b.z, { cast: false });
    const glow = softSprite(soft, "#ffb35c", 0.72, 0.34);
    glow.position.set(b.x, SHOP.height - 0.8, b.z);
    parent.add(glow);
    animated.glows.push({ material: glow.material, base: 0.34, phase: b.phase });

    const light = new THREE.PointLight(0xffb15e, 12, 9, 2);
    light.position.set(b.x, SHOP.height - 0.82, b.z);
    parent.add(light);
    animated.bulbs.push({ light, base: 12, phase: b.phase });
  }

  // Ceiling fan
  const fan = new THREE.Group();
  fan.position.set(0.3, SHOP.height - 0.42, 0.25);
  parent.add(fan);
  addCyl(fan, 0.03, 0.03, 0.4, 8, mat("#3f3328"), 0, 0.2, 0);
  addCyl(fan, 0.14, 0.14, 0.09, 16, mat("#4a3a2a"), 0, 0, 0);
  const blades = new THREE.Group();
  fan.add(blades);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const blade = addBox(blades, 0.96, 0.022, 0.19, mat("#6f4e2b"), 0, 0, 0, { cast: false });
    blade.rotation.y = -angle;
    blade.position.set(Math.cos(angle) * 0.52, 0, Math.sin(angle) * 0.52);
  }
  animated.fan = blades;

  // Warm fill near the counter
  const fill = new THREE.PointLight(0xff9e54, 7, 6.5, 2);
  fill.position.set(0, 2.1, 1.1);
  parent.add(fill);

  // Dust motes in the warm light
  const dustCount = 60;
  const positions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    positions[i * 3] = -3.6 + Math.random() * 7.2;
    positions[i * 3 + 1] = 0.5 + Math.random() * 2.1;
    positions[i * 3 + 2] = -3.2 + Math.random() * 6.2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const dustMat = new THREE.PointsMaterial({
    map: soft,
    color: 0xffd9a8,
    size: 0.04,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  parent.add(dust);
}

function createSteam(parent, soft, origin) {
  const count = 34;
  const positions = new Float32Array(count * 3);
  const state = [];
  for (let i = 0; i < count; i++) {
    const life = Math.random();
    const angle = Math.random() * Math.PI * 2;
    const spread = Math.random() * 0.13;
    state.push({ life, speed: 0.13 + Math.random() * 0.18, x: Math.cos(angle) * spread, z: Math.sin(angle) * spread });
    positions[i * 3] = origin.x + state[i].x;
    positions[i * 3 + 1] = origin.y + life * 0.85;
    positions[i * 3 + 2] = origin.z + state[i].z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const matP = new THREE.PointsMaterial({
    map: soft,
    color: 0xfff1d9,
    size: 0.18,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, matP);
  points.frustumCulled = false;
  parent.add(points);
  return { points, state, origin };
}

function updateSteam(steam, dt, elapsed) {
  const attr = steam.points.geometry.getAttribute("position");
  const arr = attr.array;
  for (let i = 0; i < steam.state.length; i++) {
    const s = steam.state[i];
    s.life += dt * s.speed;
    if (s.life > 1) s.life -= 1;
    const t = s.life;
    arr[i * 3] = steam.origin.x + s.x + Math.sin(elapsed * 0.8 + i) * 0.04;
    arr[i * 3 + 1] = steam.origin.y + t * 0.9;
    arr[i * 3 + 2] = steam.origin.z + s.z + Math.cos(elapsed * 0.7 + i) * 0.04;
  }
  attr.needsUpdate = true;
}

/* ================================================================== */
/*  Porch: sign boards, outside bench, posts, string lights, bicycle  */
/* ================================================================== */

function buildPorch(parent, M, soft, animated) {
  // Porch posts
  for (const x of [-4.55, 4.55]) {
    addBox(parent, 0.24, 2.85, 0.24, M.woodDark, x, 1.42, -5.62);
    addBox(parent, 0.36, 0.18, 0.36, M.wood, x, 0.09, -5.62);
  }

  // Outer sign, facing the street
  const signTex = canvasTexture(makeShopSignCanvas(), { aniso: 8 });
  const signMat = new THREE.MeshLambertMaterial({ map: signTex, emissive: 0x1a0d05, emissiveIntensity: 0.22 });
  addBox(parent, 5.5, 1.32, 0.12, M.woodDark, 0, 2.9, -5.76);
  addPlane(parent, 5.3, 1.14, signMat, 0, 2.9, -5.83, { ry: Math.PI, cast: false });

  // Smaller inner-facing board above the opening
  const innerTex = canvasTexture(makeInnerSignCanvas(), { aniso: 8 });
  addPlane(
    parent,
    3.4,
    0.72,
    new THREE.MeshLambertMaterial({ map: innerTex }),
    0,
    2.82,
    SHOP.frontZ - 0.17,
    { cast: false }
  );

  // Outside bench (left, under the porch)
  const bx = -2.9;
  const bz = -5.45;
  addBox(parent, 2.3, 0.09, 0.55, M.wood, bx, 0.47, bz);
  addBox(parent, 2.3, 0.1, 0.1, M.woodDark, bx, 0.78, bz - 0.28);
  for (const x of [bx - 0.92, bx, bx + 0.92]) {
    addBox(parent, 0.09, 0.38, 0.5, M.woodDark, x, 0.24, bz);
  }
  for (let i = 0; i < 4; i++) {
    addBox(parent, 0.06, 0.5, 0.08, M.wood, bx - 0.9 + i * 0.6, 0.62, bz - 0.28, { cast: false });
  }

  // Small standing table outside (for the customer who drinks near the road)
  addCyl(parent, 0.42, 0.42, 0.06, 20, M.wood, 3.0, 0.92, -6.0);
  addCyl(parent, 0.055, 0.075, 0.86, 10, M.woodDark, 3.0, 0.45, -6.0);
  addCyl(parent, 0.3, 0.34, 0.07, 16, M.woodDark, 3.0, 0.04, -6.0);

  // String lights along the porch beam
  addCyl(parent, 0.008, 0.008, 9.7, 5, mat("#4a3a2a"), 0, 2.98, -6.05, { rz: Math.PI / 2, cast: false });
  for (let i = 0; i < 9; i++) {
    const x = -4.3 + i * 1.08;
    const y = 2.9 + Math.sin((i / 9) * Math.PI) * -0.08;
    addSphere(parent, 0.045, M.lamp, x, y, -6.05, { cast: false });
    const glow = softSprite(soft, "#ffb45e", 0.45, 0.3);
    glow.position.set(x, y, -6.05);
    parent.add(glow);
    animated.glows.push({ material: glow.material, base: 0.3, phase: i * 1.3 });
  }

  // Bicycle leaning by the left porch post
  buildBicycle(parent, -4.2, -5.1, -0.35);

  // Potted plants near the door
  for (const [x, z, s] of [
    [-4.05, -4.6, 1],
    [4.05, -4.55, 0.85],
  ]) {
    addCyl(parent, 0.18 * s, 0.14 * s, 0.3 * s, 12, mat("#b56a45"), x, 0.15 * s, z);
    addCyl(parent, 0.17 * s, 0.17 * s, 0.03 * s, 12, mat("#6f4a30"), x, 0.3 * s, z, { cast: false });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      addSphere(parent, 0.13 * s, mat(i % 2 ? C.green : C.greenLight), x + Math.cos(a) * 0.1 * s, (0.45 + Math.sin(i) * 0.05) * s, z + Math.sin(a) * 0.1 * s, {
        sx: 1,
        sy: 1.2,
        sz: 1,
        cast: false,
      });
    }
  }
}

function makeShopSignCanvas() {
  return makeCanvas(1200, 280, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#f7efd9");
    g.addColorStop(1, "#efe1c2");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 12;
    roundRect(ctx, 10, 10, w - 20, h - 20, 18);
    ctx.stroke();

    // Tea glass motif on the left
    ctx.save();
    ctx.translate(118, 132);
    ctx.fillStyle = "#c48a4b";
    ctx.beginPath();
    ctx.moveTo(-52, -62);
    ctx.lineTo(52, -62);
    ctx.lineTo(36, 62);
    ctx.lineTo(-36, 62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = "rgba(120,90,60,0.4)";
    ctx.lineWidth = 6;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 24, -76);
      ctx.bezierCurveTo(i * 24 - 12, -108, i * 24 + 12, -122, i * 24, -148);
      ctx.stroke();
    }
    ctx.restore();

    ctx.textAlign = "center";
    ctx.fillStyle = "#a8462c";
    ctx.font = '700 94px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
    ctx.fillText(SIGNS.shop, w / 2 + 20, 134);
    ctx.fillStyle = "#6b4a2c";
    ctx.font = '600 32px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
    ctx.fillText(SIGNS.shopSub, w / 2 + 20, 196);

    // Palm silhouette on the right
    ctx.save();
    ctx.translate(w - 120, 210);
    ctx.strokeStyle = "#4a7c59";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(8, -60, 2, -120);
    ctx.stroke();
    ctx.lineWidth = 8;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.42;
      ctx.beginPath();
      ctx.moveTo(2, -120);
      ctx.quadraticCurveTo(2 + Math.cos(a) * 42, -120 + Math.sin(a) * 30, 2 + Math.cos(a) * 70, -120 + Math.sin(a) * 68);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function makeInnerSignCanvas() {
  return makeCanvas(1024, 220, (ctx, w, h) => {
    ctx.fillStyle = "#f7efd9";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 10;
    roundRect(ctx, 8, 8, w - 16, h - 16, 16);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#a8462c";
    ctx.font = '700 92px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
    ctx.fillText(SIGNS.shop, w / 2, 118);
    ctx.fillStyle = "#6b4a2c";
    ctx.font = '600 28px "Noto Sans Malayalam", "Nirmala UI", sans-serif';
    ctx.fillText(SIGNS.shopSub, w / 2, 174);
  });
}

function buildBicycle(parent, x, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  g.rotation.z = 0.06;
  parent.add(g);

  const wheelMat = mat("#4a3a2a");
  for (const wz of [-0.52, 0.52]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 8, 24), wheelMat);
    wheel.position.set(0, 0.36, wz);
    wheel.rotation.y = Math.PI / 2;
    wheel.castShadow = true;
    g.add(wheel);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      addCyl(g, 0.006, 0.006, 0.58, 4, mat("#8a7a68"), 0, 0.36, wz, { rx: a, cast: false });
    }
  }
  const frame = mat("#5b7f8c");
  addCyl(g, 0.025, 0.025, 0.72, 8, frame, 0, 0.5, 0, { rx: Math.PI / 2, cast: false });
  addCyl(g, 0.025, 0.025, 0.48, 8, frame, 0, 0.55, 0.28, { rx: -0.7, cast: false });
  addCyl(g, 0.022, 0.022, 0.4, 8, frame, 0, 0.42, -0.35, { rx: 0.55, cast: false });
  addCyl(g, 0.02, 0.02, 0.38, 8, frame, 0, 0.68, -0.32, { rx: 0.2, cast: false });
  addBox(g, 0.12, 0.05, 0.22, mat("#3a2a1e"), 0, 0.79, 0.28, { cast: false });
  addCyl(g, 0.02, 0.02, 0.42, 6, mat("#3a2a1e"), 0, 0.8, -0.5, { rz: Math.PI / 2, cast: false });
  addCyl(g, 0.02, 0.02, 0.42, 6, mat("#3a2a1e"), 0, 0.8, -0.42, { rz: Math.PI / 2, cast: false });
}

function buildVerandaProps(parent, M, soft) {
  // A couple of blue plastic chairs stacked by the right post
  const chairMat = mat("#4f8b9a");
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group();
    g.position.set(4.55 + i * 0.08, 0, -4.8 - i * 0.1);
    g.rotation.y = -0.7;
    addBox(g, 0.42, 0.05, 0.4, chairMat, 0, 0.42, 0, { cast: false });
    addBox(g, 0.42, 0.5, 0.05, chairMat, 0, 0.68, -0.19, { cast: false });
    for (const sx of [-1, 1]) {
      addBox(g, 0.04, 0.42, 0.04, chairMat, sx * 0.17, 0.21, 0.15, { cast: false });
      addBox(g, 0.04, 0.42, 0.04, chairMat, sx * 0.17, 0.21, -0.15, { cast: false });
    }
    parent.add(g);
  }

  // Hanging banana bunch already added in decor. A couple of sacks near the counter.
  addSphere(parent, 0.24, mat("#c9a86a"), -3.1, 0.25, 1.35, { sx: 1.2, sy: 1.0, sz: 0.9, cast: false });
  addSphere(parent, 0.22, mat("#b99458"), 3.0, 0.23, 1.25, { sx: 1.1, sy: 0.95, sz: 0.9, cast: false });
}
