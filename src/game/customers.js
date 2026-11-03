import * as THREE from "three";
import { createPerson } from "../world/people.js";
import {
  SPOTS,
  SEATS,
  WAIT_SPOTS,
  SPAWN,
  STREET_WALK,
  DOOR,
  AISLE,
  FIRST_WAVE,
} from "../config/layout.js";
import { itemById, spokenOrder } from "../config/menu.js";
import {
  GREETINGS,
  RAIN_COMMENTS,
  COMPLAINTS_TEA,
  COMPLAINTS_GENERAL,
  COMPLAINTS_SAMOSA,
  COMPLAINTS_PAZHAMPORI,
  COMPLAINTS_PARTIAL,
  GIVE_UP_TEA,
  GIVE_UP_ANY,
  BILL_REQUESTS,
  BILL_THANKS,
  THANKS_BY_ITEM,
  THANKS,
  PARTIAL_ACK,
  KID,
  pick,
} from "../config/strings.ml.js";

/**
 * Customers, their little walking routes, orders and patience.
 *
 * All customer-facing text comes from src/config/strings.ml.js. No dialogue is
 * written here.
 */

let nextId = 1;

const COMPLAIN_AT = 45;
const GIVE_UP_AT = 60;
const BILL_GIVE_UP_AT = 24;

function dampAngle(current, target, lambda, dt) {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

function makeLines(order) {
  return order.map((line) => {
    const item = itemById(line.id);
    return {
      id: line.id,
      qty: line.qty ?? 1,
      served: 0,
      prepared: 0,
      preparing: 0,
      price: item?.price ?? 0,
    };
  });
}

export class Customer {
  constructor({ spot, order, kid = false, first = false, onEvent }) {
    this.id = `customer-${nextId++}`;
    this.spot = spot;
    this.kid = kid;
    this.onEvent = onEvent;
    this.lines = makeLines(order);
    this.state = first ? "waving" : "arriving";
    this.timer = first ? 2.6 : 0;
    this.patienceMax = GIVE_UP_AT;
    this.patience = GIVE_UP_AT;
    this.complained = false;
    this.gaveUp = false;
    this.arrived = false;
    this.billTimer = 0;
    this.drinkServed = false;
    this.reply = null;
    this.replyUntil = 0;
    this.payTimer = 0;
    this.speed = kid ? 1.55 : 1.3 + Math.random() * 0.18;
    this.phase = Math.random() * Math.PI * 2;

    this.person = createPerson({
      kid,
      gender: kid ? Math.random() < 0.5 : undefined,
      seed: Math.random(),
    });
    this.group = this.person.group;
    this.group.userData.customer = this;
    this.group.position.copy(first ? FIRST_WAVE : SPAWN);
    this.group.rotation.y = first ? 0 : Math.PI;
    this.person.setPose(first ? "wave" : "walk");
    this.person.walking = !first;

    this.path = first ? [] : entryPath(spot);
    this.labelAnchor = new THREE.Vector3();
    this._updateAnchor();
  }

  /* ------------------------------------------------------------------ */

  get isActive() {
    return this.state !== "gone";
  }

  get isServable() {
    return this.state === "ordering" || this.state === "complained";
  }

  get isWaitStaff() {
    return this.state === "billing";
  }

  get allServed() {
    return this.lines.every((l) => l.served >= l.qty);
  }

  get remainingCount() {
    return this.lines.reduce((n, l) => n + Math.max(0, l.qty - l.served), 0);
  }

  get preparedCount() {
    return this.lines.reduce((n, l) => n + l.prepared, 0);
  }

  get preparingCount() {
    return this.lines.reduce((n, l) => n + l.preparing, 0);
  }

  total() {
    return this.lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  }

  paidTotal() {
    return this.lines.reduce((sum, l) => sum + l.price * l.served, 0);
  }

  lineStatus(line) {
    if (line.served >= line.qty) return "served";
    if (line.prepared > line.served) return "ready";
    if (line.preparing > 0) return "preparing";
    return "waiting";
  }

  startPrep(lineId) {
    const line = this.lines.find((l) => l.id === lineId);
    if (!line) return false;
    const available = line.qty - line.served - line.prepared - line.preparing;
    if (available <= 0) return false;
    line.preparing += 1;
    return true;
  }

  finishPrep(lineId) {
    const line = this.lines.find((l) => l.id === lineId);
    if (!line || line.preparing <= 0) return false;
    line.preparing -= 1;
    line.prepared += 1;
    return true;
  }

  cancelPrep(lineId) {
    const line = this.lines.find((l) => l.id === lineId);
    if (!line || line.preparing <= 0) return;
    line.preparing -= 1;
  }

  /** Items currently sitting on the pass, ready to go on the tray. */
  preparedItems() {
    const out = [];
    for (const line of this.lines) {
      for (let i = 0; i < line.prepared; i++) out.push({ id: line.id });
    }
    return out;
  }

  /** Take prepared items out of the kitchen. Returns [{ id }] for the tray. */
  takePrepared() {
    const out = this.preparedItems();
    for (const line of this.lines) line.prepared = 0;
    return out;
  }

  /** The tray arrived: mark those items served. */
  deliver(items) {
    let delivered = 0;
    for (const item of items) {
      const line = this.lines.find((l) => l.id === item.id);
      if (!line) continue;
      if (line.served >= line.qty) continue;
      line.served += 1;
      line.prepared = Math.max(0, line.prepared - 1);
      delivered += 1;
      if (itemById(item.id)?.kind === "drink") this.drinkServed = true;
    }
    return delivered;
  }

  say(text, tone = "good", duration = 4) {
    if (!text) return;
    this.reply = { text, tone };
    this.replyUntil = duration === Infinity ? Infinity : performance.now() / 1000 + duration;
  }

  completeServe() {
    if (this.state === "served" || this.state === "billing") return;
    this.state = "served";
    this.timer = this.kid ? 1.5 : 2.6;
    const lastDrink = this.lines.find((l) => itemById(l.id)?.kind === "drink");
    const line = this.kid ? pick(KID.joy) : pick(THANKS_BY_ITEM[lastDrink?.id] ?? THANKS);
    this.say(line, "good", this.kid ? 1.5 : 2.8);
    this.person.setDrinking(this.drinkServed);
  }

  /** The kid asked the price; only the right answer earns the sale. */
  answerKidPrice(correct) {
    if (this.state !== "kidPrice") return false;
    if (correct) {
      this.state = "ordering";
      this.patience = GIVE_UP_AT;
      this.say(KID.two, "good", 4);
      this.onEvent?.("ready", this);
      return true;
    }
    this.say(pick([KID.wrongPrice, KID.noMoney]), "bad", 2.6);
    this.leave();
    return false;
  }

  partialAck() {
    this.say(pick(PARTIAL_ACK), "good", 3.5);
    this.person.setDrinking(this.drinkServed);
  }

  requestBill() {
    if (this.state !== "served") return;
    this.state = "billing";
    this.timer = BILL_GIVE_UP_AT;
    this.say(pick(BILL_REQUESTS), "good", 6);
    this.onEvent?.("billRequest", this);
  }

  payBill() {
    if (this.state !== "billing") return false;
    this.state = "paid";
    this.payTimer = 0.9;
    this.say(pick(BILL_THANKS), "good", 2);
    return true;
  }

  giveUp() {
    if (this.gaveUp) return;
    this.gaveUp = true;
    const hasTea = this.lines.some((l) => l.id === "chaya" || l.id === "kattan");
    this.say(pick(hasTea ? GIVE_UP_TEA : GIVE_UP_ANY), "bad", Infinity);
    this.state = "leaving";
    this.path = leavePath(this.spot, this.group.position);
    this.person.setDrinking(false);
    this.onEvent?.("giveUp", this);
  }

  leave() {
    if (this.state === "leaving" || this.state === "gone") return;
    this.state = "leaving";
    this.path = leavePath(this.spot, this.group.position);
    this.person.setDrinking(false);
    this.person.setUmbrella(false);
  }

  setUmbrella(on) {
    this.person.setUmbrella(on);
  }

  update(dt, elapsed, raining) {
    this.person.update(dt, elapsed);

    if (this.state === "waving") {
      this.timer -= dt;
      this.person.setPose("wave");
      if (this.timer <= 0) {
        this.state = "arriving";
        this.person.setPose("walk");
        this.person.walking = true;
        this.path = entryPath(this.spot, FIRST_WAVE);
        this.say(pick(GREETINGS), "good", 3.8);
      }
      this._updateAnchor();
      return;
    }

    if (this.state === "arriving") {
      this.person.setUmbrella(raining);
      if (this._walk(dt)) {
        this.person.setUmbrella(false);
        this.arrived = true;
        this.group.position.copy(this.spot.pos);
        this.group.rotation.y = this.spot.yaw;
        this.person.setPose(this.spot.sit ? "sit" : "idle");
        this.person.walking = false;
        this.state = "ordering";

        if (this.kid) {
          this.state = "kidPrice";
          this.timer = 30;
          this.say(KID.askPrice, "good", Infinity);
          this.onEvent?.("kidPrice", this);
        } else {
          const orderLine = spokenOrder(this.lines);
          const greeting = raining ? `${pick(RAIN_COMMENTS)}\n${orderLine}` : orderLine;
          this.say(greeting, "good", raining ? 6.4 : 4.6);
          this.onEvent?.("ready", this);
        }
      }
      this._updateAnchor();
      return;
    }

    if (this.state === "kidPrice") {
      this.person.setUmbrella(false);
      this.timer -= dt;
      if (this.timer <= 0) {
        this.say(pick([KID.shortMoney, KID.noMoney]), "bad", 2.6);
        this.leave();
      }
      this._updateAnchor();
      return;
    }

    if (this.state === "ordering" || this.state === "complained") {
      this.person.setUmbrella(false);
      this.patience = Math.max(0, this.patience - dt);

      if (!this.complained && this.patience <= GIVE_UP_AT - COMPLAIN_AT) {
        this.complained = true;
        this.state = "complained";
        this.say(this._complaintLine(), "bad", Infinity);
        this.onEvent?.("complaint", this);
      }

      if (this.patience <= 0) {
        this.giveUp();
      }
      this._updateAnchor();
      return;
    }

    if (this.state === "served") {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.kid) this.leave();
        else this.requestBill();
      }
      this._updateAnchor();
      return;
    }

    if (this.state === "billing") {
      this.timer -= dt;
      if (this.timer <= 0) {
        // The customer quietly settles up and goes; the shift is cozy, not cruel.
        this.state = "paid";
        this.payTimer = 0.5;
      }
      this._updateAnchor();
      return;
    }

    if (this.state === "paid") {
      this.payTimer -= dt;
      if (this.payTimer <= 0) this.leave();
      this._updateAnchor();
      return;
    }

    if (this.state === "leaving") {
      this.person.setUmbrella(raining);
      if (this._walk(dt, 1.55)) {
        this.state = "gone";
        this.onEvent?.("gone", this);
      }
      this._updateAnchor();
      return;
    }

    this._updateAnchor();
  }

  _complaintLine() {
    if (this.lines.some((l) => l.id === "samoosa" && l.served < l.qty)) return pick(COMPLAINTS_SAMOSA);
    if (this.lines.some((l) => l.id === "pazhampori" && l.served < l.qty)) return pick(COMPLAINTS_PAZHAMPORI);
    if (this.drinkServed && !this.allServed) return pick(COMPLAINTS_PARTIAL);
    if (this.lines.some((l) => itemById(l.id)?.kind === "drink")) return pick(COMPLAINTS_TEA);
    return pick(COMPLAINTS_GENERAL);
  }

  _walk(dt, speed = this.speed) {
    if (!this.path.length) return true;
    const target = this.path[0];
    const pos = this.group.position;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.12) {
      this.path.shift();
      if (!this.path.length) return true;
    } else {
      this.person.setPose("walk");
      this.person.walking = true;
      const step = Math.min(dist, speed * dt);
      pos.x += (dx / dist) * step;
      pos.z += (dz / dist) * step;
      const yaw = Math.atan2(dx, dz);
      this.group.rotation.y = dampAngle(this.group.rotation.y, yaw, 9, dt);
    }
    return false;
  }

  _updateAnchor() {
    const base = this.spot?.sit && this.arrived ? 1.28 : 1.66;
    const scale = this.kid ? 0.72 : 1;
    this.labelAnchor.set(
      this.group.position.x,
      this.group.position.y + base * scale + 0.34,
      this.group.position.z
    );
  }

  dispose() {
    this.group.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.geometry?.dispose?.();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) m?.dispose?.();
    });
  }
}

/* ================================================================== */
/*  Paths                                                             */
/* ================================================================== */

function entryPath(spot, from = null) {
  const path = [];
  if (from) {
    path.push(from.clone());
    path.push(STREET_WALK.clone());
  } else {
    path.push(SPAWN.clone());
    path.push(STREET_WALK.clone());
  }

  if (spot.kind === "outside") {
    path.push(new THREE.Vector3(spot.pos.x * 0.82, 0, -7.05));
    path.push(new THREE.Vector3(spot.pos.x, 0, spot.pos.z));
    return path;
  }

  path.push(DOOR.clone());
  path.push(AISLE.clone());
  if (spot.kind === "counter") {
    path.push(new THREE.Vector3(spot.pos.x, 0, -0.5));
  } else {
    path.push(new THREE.Vector3(spot.pos.x * 0.42, 0, -1.15));
  }
  path.push(new THREE.Vector3(spot.pos.x, 0, spot.pos.z));
  return path;
}

function leavePath(spot, from) {
  const path = [from.clone()];
  if (spot.kind === "outside") {
    path.push(new THREE.Vector3(spot.pos.x, 0, -7.1));
    path.push(STREET_WALK.clone());
  } else {
    path.push(new THREE.Vector3(spot.pos.x * 0.45, 0, -1.2));
    path.push(AISLE.clone());
    path.push(DOOR.clone());
    path.push(new THREE.Vector3(0.4, 0, -7.3));
  }
  path.push(new THREE.Vector3(0.2, 0, -12.6));
  path.push(new THREE.Vector3(-2.4, 0, -19.0));
  return path;
}

/* ================================================================== */
/*  Manager                                                           */
/* ================================================================== */

export class CustomerManager {
  constructor({ scene, onEvent }) {
    this.scene = scene;
    this.onEvent = onEvent;
    this.customers = [];
    this.occupied = new Set();
    this.selected = null;

    this.marker = new THREE.Group();
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshBasicMaterial({ color: 0xffc46b }));
    gem.position.y = 0;
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.012, 6, 28),
      new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.75, depthWrite: false })
    );
    halo.rotation.x = Math.PI / 2;
    this.marker.add(gem, halo);
    this.marker.visible = false;
    this.marker.userData.gem = gem;
    this.marker.userData.halo = halo;
    scene.add(this.marker);
  }

  get activeCount() {
    return this.customers.filter((c) => c.state !== "gone" && c.state !== "leaving").length;
  }

  getById(id) {
    return this.customers.find((c) => c.id === id) ?? null;
  }

  freeSpots(kid = false) {
    const order = kid
      ? [SPOTS.counterA, SPOTS.counterB, SPOTS.outsideStand]
      : [...SEATS, SPOTS.counterA, SPOTS.counterB, SPOTS.outsideStand];
    return order.filter((s) => !this.occupied.has(s.id));
  }

  pickSpot(kid = false) {
    if (kid) {
      const counters = [SPOTS.counterA, SPOTS.counterB].filter((s) => !this.occupied.has(s.id));
      if (counters.length) return counters[Math.floor(Math.random() * counters.length)];
      return !this.occupied.has(SPOTS.outsideStand.id) ? SPOTS.outsideStand : null;
    }

    const roll = Math.random();
    const wantsBench = roll < 0.52;
    const wantsCounter = roll >= 0.52 && roll < 0.74;
    const pools = [
      wantsBench ? SEATS.filter((s) => !this.occupied.has(s.id)) : [],
      wantsCounter ? WAIT_SPOTS.filter((s) => s.kind === "counter" && !this.occupied.has(s.id)) : [],
      !wantsBench && !wantsCounter ? WAIT_SPOTS.filter((s) => !this.occupied.has(s.id)) : [],
    ];
    for (const pool of pools) {
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
    }
    const all = [...SEATS, ...WAIT_SPOTS].filter((s) => !this.occupied.has(s.id));
    return all.length ? all[Math.floor(Math.random() * all.length)] : null;
  }

  spawn({ order, kid = false, first = false, spot = null } = {}) {
    const assigned = spot ?? this.pickSpot(kid);
    if (!assigned) return null;

    this.occupied.add(assigned.id);
    const customer = new Customer({
      spot: assigned,
      order,
      kid,
      first,
      onEvent: (type, payload) => {
        this.onEvent?.(type, payload);
      },
    });
    this.scene.add(customer.group);
    this.customers.push(customer);
    return customer;
  }

  update(dt, elapsed, raining = false) {
    for (const customer of this.customers) customer.update(dt, elapsed, raining);

    const gone = this.customers.filter((c) => c.state === "gone");
    for (const customer of gone) {
      this.scene.remove(customer.group);
      customer.dispose();
      this.occupied.delete(customer.spot.id);
      this.onEvent?.("gone", customer);
    }
    if (gone.length) this.customers = this.customers.filter((c) => c.state !== "gone");

    if (this.selected && this.selected.state === "gone") this.setSelected(null);

    // Expire simple replies.
    const now = performance.now() / 1000;
    for (const customer of this.customers) {
      if (!customer.reply) continue;
      if (customer.replyUntil > now) continue;
      customer.reply = null;
    }

    if (this.marker.visible && this.selected) {
      this.marker.position.set(
        this.selected.labelAnchor.x,
        this.selected.labelAnchor.y + 0.28,
        this.selected.labelAnchor.z
      );
      this.marker.rotation.y += dt * 1.6;
      this.marker.userData.gem.rotation.y += dt * 2.4;
      this.marker.userData.halo.rotation.z += dt * 1.1;
    }
  }

  setSelected(customer) {
    this.selected = customer ?? null;
    this.marker.visible = Boolean(customer);
    if (customer) {
      this.marker.position.set(
        customer.labelAnchor.x,
        customer.labelAnchor.y + 0.28,
        customer.labelAnchor.z
      );
    }
  }

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
