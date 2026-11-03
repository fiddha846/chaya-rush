import * as THREE from "three";

/**
 * Shared world layout. Shop, customers, camera paths and dog shelter all read
 * from here so nothing drifts out of alignment.
 *
 * Axes: +x is to the street's right, +z points toward the back wall of the
 * shop. The shop opens toward -z (the street). People face +z when yaw = 0.
 */

export const SHOP = {
  width: 9.6,
  depth: 8.4,
  backZ: 4.2,
  frontZ: -4.2,
  height: 3.25,
  halfW: 4.8,
};

export const OWNER_EYE = new THREE.Vector3(0.35, 1.52, 3.42);
export const OWNER_LOOK = new THREE.Vector3(0.1, 1.2, -4.2);

export const COUNTER = {
  x: 0,
  z: 2.35,
  width: 4.9,
  depth: 0.72,
  height: 1.05,
};

/** Spots where people can sit or stand while being served. */
export const SPOTS = {
  benchLeftA: {
    id: "benchLeftA",
    kind: "bench",
    label: "ബെഞ്ചിൽ",
    pos: new THREE.Vector3(-4.12, 0, -2.35),
    yaw: Math.PI / 2,
    sit: true,
    table: new THREE.Vector3(-3.1, 0.68, -2.35),
    service: new THREE.Vector3(-2.25, 0, -2.35),
    serviceLook: new THREE.Vector3(-4.12, 1.15, -2.35),
    approach: new THREE.Vector3(-2.25, 0, -2.35),
  },
  benchLeftB: {
    id: "benchLeftB",
    kind: "bench",
    label: "ബെഞ്ചിൽ",
    pos: new THREE.Vector3(-4.12, 0, -0.35),
    yaw: Math.PI / 2,
    sit: true,
    table: new THREE.Vector3(-3.1, 0.68, -0.35),
    service: new THREE.Vector3(-2.25, 0, -0.35),
    serviceLook: new THREE.Vector3(-4.12, 1.15, -0.35),
    approach: new THREE.Vector3(-2.25, 0, -0.35),
  },
  benchRightA: {
    id: "benchRightA",
    kind: "bench",
    label: "ബെഞ്ചിൽ",
    pos: new THREE.Vector3(4.12, 0, -2.35),
    yaw: -Math.PI / 2,
    sit: true,
    table: new THREE.Vector3(3.1, 0.68, -2.35),
    service: new THREE.Vector3(2.25, 0, -2.35),
    serviceLook: new THREE.Vector3(4.12, 1.15, -2.35),
    approach: new THREE.Vector3(2.25, 0, -2.35),
  },
  benchRightB: {
    id: "benchRightB",
    kind: "bench",
    label: "ബെഞ്ചിൽ",
    pos: new THREE.Vector3(4.12, 0, -0.35),
    yaw: -Math.PI / 2,
    sit: true,
    table: new THREE.Vector3(3.1, 0.68, -0.35),
    service: new THREE.Vector3(2.25, 0, -0.35),
    serviceLook: new THREE.Vector3(4.12, 1.15, -0.35),
    approach: new THREE.Vector3(2.25, 0, -0.35),
  },
  counterA: {
    id: "counterA",
    kind: "counter",
    label: "കൗണ്ടറിൽ",
    pos: new THREE.Vector3(0.55, 0, 1.42),
    yaw: 0,
    sit: false,
    service: new THREE.Vector3(0.55, 0, 3.0),
    serviceLook: new THREE.Vector3(0.55, 1.12, 1.42),
    instantServe: true,
  },
  counterB: {
    id: "counterB",
    kind: "counter",
    label: "കൗണ്ടറിൽ",
    pos: new THREE.Vector3(1.9, 0, 1.42),
    yaw: 0,
    sit: false,
    service: new THREE.Vector3(1.9, 0, 3.0),
    serviceLook: new THREE.Vector3(1.9, 1.12, 1.42),
    instantServe: true,
  },
  outsideStand: {
    id: "outsideStand",
    kind: "outside",
    label: "പുറത്ത്",
    pos: new THREE.Vector3(3.0, 0, -6.0),
    yaw: 0,
    sit: false,
    service: new THREE.Vector3(3.0, 0, -4.45),
    serviceLook: new THREE.Vector3(3.0, 1.15, -6.0),
  },
  outsideBench: {
    id: "outsideBench",
    kind: "outside",
    label: "പുറത്തെ ബെഞ്ചിൽ",
    pos: new THREE.Vector3(-2.9, 0, -5.45),
    yaw: 0,
    sit: true,
    table: null,
    service: new THREE.Vector3(-2.9, 0, -4.52),
    serviceLook: new THREE.Vector3(-2.9, 1.05, -5.45),
  },
};

export const SEATS = [
  SPOTS.benchLeftA,
  SPOTS.benchLeftB,
  SPOTS.benchRightA,
  SPOTS.benchRightB,
  SPOTS.outsideBench,
];

export const WAIT_SPOTS = [
  SPOTS.counterA,
  SPOTS.counterB,
  SPOTS.outsideStand,
];

/** Path from the street to the shop door, then to the middle of the shop. */
export const SPAWN = new THREE.Vector3(-0.4, 0, -12.5);
export const STREET_WALK = new THREE.Vector3(0.4, 0, -7.3);
export const DOOR = new THREE.Vector3(0.5, 0, -4.55);
export const AISLE = new THREE.Vector3(1.05, 0, -3.2);
export const CENTER = new THREE.Vector3(0.7, 0, -0.9);
export const FIRST_WAVE = new THREE.Vector3(1.55, 0, -6.7);

/** Camera walk route from the owner's stool to the shop floor. */
export const CARRY_HUB = [
  new THREE.Vector3(3.15, 1.52, 3.25),
  new THREE.Vector3(3.15, 1.52, 1.6),
  new THREE.Vector3(2.3, 1.52, 0.55),
];

/** Interior dogs' rain shelter. */
export const DOG_SHELTER = [
  { pos: new THREE.Vector3(-1.55, 0, -3.55), yaw: 0.5 },
  { pos: new THREE.Vector3(-0.55, 0, -3.75), yaw: -0.35 },
];

export const STREET = {
  z: -8.9,
  width: 5.6,
  minX: -46,
  maxX: 46,
};

