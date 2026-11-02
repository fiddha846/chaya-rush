import * as THREE from "three";
import { GAME_RULES } from "../config/game.js";

/**
 * CHAYA RUSH — customers (Stage 2).
 *
 * ⚠️ PLACEHOLDER ART: seated customers are built from primitives. They exist to
 * test ordering, selection and serving. Replace with rigged GLB characters
 * (see ASSETS_NEEDED.md) without changing the game logic.
 */

/** Seats on the camera side of each table, facing the player. */
export const SEATS = [
  { id: "seat-0", position: [1.55, 0, 1.3], facing: 0 },
  { id: "seat-1", position: [-1.85, 0, 0.05], facing: 0 },
  { id: "seat-2", position: [2.55, 0, -2.25], facing: 0 },
];

const SHIRTS = [0x2f6f6a, 0x8a3a2a, 0xb4812f, 0x3a5a8a, 0x6b6f3a];
const SKINS = [0x8a5a3b, 0xa9714a, 0x6d4327, 0xc08a5e, 0xd7a07a];
const HAIRS = [0x15100c, 0x241a12, 0x3a2a1a];

let nextId = 1;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildSeatedPerson({ shirt, skin, hair }) {
  const group = new THREE.Group();

  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.88 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.72 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.95 });
  const trouserMat = new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.92 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.4 });

  const add = (geometry, material, x, y, z, opts = {}) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    if (opts.rx) mesh.rotation.x = opts.rx;
    if (opts.ry) mesh.rotation.y = opts.ry;
    if (opts.rz) mesh.rotation.z = opts.rz;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Torso / shoulders
  add(new THREE.BoxGeometry(0.34, 0.5, 0.22), shirtMat, 0, 0.78, 0);
  add(new THREE.BoxGeometry(0.42, 0.12, 0.24), shirtMat, 0, 1.0, 0);

  // Head + hair cap + eyes
  add(new THREE.SphereGeometry(0.12, 18, 14), skinMat, 0, 1.13, 0.01);
  add(
    new THREE.SphereGeometry(0.126, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat,
    0,
    1.135,
    0
  );
  add(new THREE.SphereGeometry(0.014, 8, 6), eyeMat, -0.042, 1.145, 0.112);
  add(new THREE.SphereGeometry(0.014, 8, 6), eyeMat, 0.042, 1.145, 0.112);

  // Arms
  add(new THREE.BoxGeometry(0.085, 0.4, 0.1), shirtMat, -0.215, 0.8, 0.02, { rz: 0.06 });
  add(new THREE.BoxGeometry(0.085, 0.4, 0.1), shirtMat, 0.215, 0.8, 0.02, { rz: -0.06 });
  add(new THREE.SphereGeometry(0.05, 10, 8), skinMat, -0.23, 0.58, 0.04);
  add(new THREE.SphereGeometry(0.05, 10, 8), skinMat, 0.23, 0.58, 0.04);

  // Seated legs: thighs forward (+Z), shins down.
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(0.13, 0.14, 0.34), trouserMat, side * 0.09, 0.52, 0.17);
    add(new THREE.BoxGeometry(0.11, 0.4, 0.12), trouserMat, side * 0.09, 0.28, 0.33);
    add(new THREE.BoxGeometry(0.11, 0.06, 0.2), trouserMat, side * 0.09, 0.05, 0.42);
  }

  // Soft contact shadow so the placeholder body sits on the floor.
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(0, 0.012, 0.12);
  blob.scale.set(1, 1.5, 1);
  blob.castShadow = false;
  blob.receiveShadow = false;
  group.add(blob);

  // Invisible, generously sized click target.
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.5, 0.9),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.set(0, 0.75, 0.1);
  group.add(hit);

  return { group, head: group.children[2] };
}

export class Customer {
  constructor({ seat, order, onEvent }) {
    this.id = `customer-${nextId++}`;
    this.seat = seat;
    this.order = [...order];
    this.onEvent = onEvent;

    this.patienceMax = GAME_RULES.customerPatienceSec ?? 30;
    this.patience = this.patienceMax;
    this.state = "waiting"; // waiting | complained | completing | leaving | gone

    this.completeTimer = 0;
    this.leaveProgress = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.labelAnchor = new THREE.Vector3();

    const parts = buildSeatedPerson({ shirt: pick(SHIRTS), skin: pick(SKINS), hair: pick(HAIRS) });
    this.group = parts.group;
    this.head = parts.head;
    this.group.position.set(seat.position[0], seat.position[1], seat.position[2]);
    this.group.rotation.y = seat.facing;
    this.group.userData.customer = this;

    this._updateAnchor();
  }

  get isServable() {
    return this.state === "waiting" || this.state === "complained";
  }

  /** Remove one serving of this item from the order. */
  takeItem(itemId) {
    const index = this.order.indexOf(itemId);
    if (index === -1) return false;
    this.order.splice(index, 1);
    return true;
  }

  /** Order complete: play the short thank-you beat, then leave. */
  complete() {
    if (!this.isServable) return;
    this.state = "completing";
    this.completeTimer = 1.15;
  }

  update(dt, elapsed) {
    if (this.state === "waiting") {
      this.patience = Math.max(0, this.patience - dt);
      if (this.patience <= 0) {
        this.state = "complained";
        this.onEvent?.("complaint", this);
      }
    }

    if (this.state === "completing") {
      this.completeTimer -= dt;
      if (this.completeTimer <= 0) {
        this.state = "leaving";
        this.leaveProgress = 0;
      }
    }

    if (this.state === "leaving") {
      this.leaveProgress += dt / 0.5;
      const scale = Math.max(0, 1 - this.leaveProgress);
      this.group.scale.setScalar(scale);
      this.group.position.y = (1 - scale) * 0.35;
      if (this.leaveProgress >= 1) {
        this.state = "gone";
      }
    }

    // Gentle idle life (head turn + breathing).
    if (this.isServable || this.state === "completing") {
      this.head.rotation.y = Math.sin(elapsed * 0.55 + this.phase) * 0.1;
      this.group.position.y = Math.sin(elapsed * 1.4 + this.phase) * 0.004;
    }

    this._updateAnchor();
  }

  _updateAnchor() {
    this.labelAnchor.set(
      this.group.position.x,
      this.group.position.y + 1.52,
      this.group.position.z
    );
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) mat?.dispose?.();
      }
    });
  }
}

export class CustomerManager {
  constructor({ scene, onEvent }) {
    this.scene = scene;
    this.onEvent = onEvent;
    this.customers = [];
    this.occupied = new Set();

    this.selectionRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.018, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9 })
    );
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.position.y = 0.03;
    this.selectionRing.visible = false;
    this.selectionRing.frustumCulled = false;
    scene.add(this.selectionRing);
  }

  get activeCount() {
    return this.customers.filter(
      (c) => c.state === "waiting" || c.state === "complained" || c.state === "completing"
    ).length;
  }

  getById(id) {
    return this.customers.find((c) => c.id === id) ?? null;
  }

  /** Spawn a customer in the first free seat. Returns the customer or null. */
  spawn(order) {
    const seat = SEATS.find((s) => !this.occupied.has(s.id));
    if (!seat) return null;

    this.occupied.add(seat.id);
    const customer = new Customer({
      seat,
      order,
      onEvent: this.onEvent,
    });
    customer.seat = seat;
    this.scene.add(customer.group);
    this.customers.push(customer);
    return customer;
  }

  update(dt, elapsed) {
    for (const customer of this.customers) customer.update(dt, elapsed);

    const gone = this.customers.filter((c) => c.state === "gone");
    for (const customer of gone) {
      this.scene.remove(customer.group);
      customer.dispose();
      this.occupied.delete(customer.seat.id);
      this.onEvent?.("gone", customer);
    }
    if (gone.length) {
      this.customers = this.customers.filter((c) => c.state !== "gone");
    }

    // Keep the ring aligned if the selected customer is leaving.
    const ring = this.selectionRing;
    if (ring.visible) {
      const selected = this.customers.find((c) => c === ring.userData.customer);
      if (!selected || selected.state === "leaving" || selected.state === "gone") {
        ring.visible = false;
      }
    }
  }

  setSelected(customer) {
    if (!customer) {
      this.selectionRing.visible = false;
      this.selectionRing.userData.customer = null;
      return;
    }
    this.selectionRing.visible = true;
    this.selectionRing.userData.customer = customer;
    this.selectionRing.position.set(
      customer.group.position.x,
      0.03,
      customer.group.position.z
    );
  }

  /** Raycast against all visible customers; returns the customer or null. */
  pick(raycaster) {
    const roots = this.customers
      .filter((c) => c.state !== "leaving" && c.state !== "gone")
      .map((c) => c.group);
    if (!roots.length) return null;

    const hits = raycaster.intersectObjects(roots, true);
    if (!hits.length) return null;

    let node = hits[0].object;
    while (node && !node.userData.customer) node = node.parent;
    return node?.userData.customer ?? null;
  }

  reset() {
    for (const customer of this.customers) {
      this.scene.remove(customer.group);
      customer.dispose();
    }
    this.customers = [];
    this.occupied.clear();
    this.setSelected(null);
    nextId = 1;
  }
}
