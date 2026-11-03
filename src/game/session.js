import { CustomerManager } from "./customers.js";
import { MENU_ITEMS, itemById } from "../config/menu.js";
import { UI, OWNER, AMBIENT, KID, pick } from "../config/strings.ml.js";

/**
 * The cozy evening shift: customers walk in, order in Malayalam, the chaiwala
 * prepares their items, carries them over and settles the bill. There is no
 * timer or score — just a warm shop and a street that keeps living around it.
 */

const FIRST_SPAWN_DELAY = 2.4;
const MAX_CUSTOMERS = 3;
const PREP_TIME = { drink: 2.2, snack: 1.8, sweet: 0.9 };

function makeOrder() {
  const ids = MENU_ITEMS.map((item) => item.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const roll = Math.random();
  const count = roll < 0.45 ? 1 : roll < 0.9 ? 2 : 3;
  return ids.slice(0, count).map((id) => ({
    id,
    qty: Math.random() < 0.16 ? 2 : 1,
  }));
}

function spotName(spot) {
  if (!spot) return UI.benchSpot;
  if (spot.kind === "counter") return UI.counterSpot;
  if (spot.kind === "outside") return spot.sit ? UI.outsideBench : UI.outsideSpot;
  return UI.benchSpot;
}

export class GameSession {
  constructor({ scene, camera, rig, hud, world }) {
    this.scene = scene;
    this.camera = camera;
    this.rig = rig;
    this.hud = hud;
    this.world = world;

    this.customers = new CustomerManager({
      scene,
      onEvent: (type, customer) => this._onCustomerEvent(type, customer),
    });

    this.phase = "ready"; // ready | running
    this.earnings = 0;
    this.itemsServed = 0;
    this.ordersServed = 0;
    this.spawnCount = 0;
    this.spawnTimer = FIRST_SPAWN_DELAY;
    this.selected = null;
    this.prepQueue = [];
    this.carry = null;
    this.kidCustomer = null;
    this.elapsed = 0;
    this._hint = "";
    this._weatherKey = "";
    this._hudTick = 0;

    this.world.weather.onChange = (kind) => {
      if (kind === "rain") {
        this.hud.toast(AMBIENT.rainStart, "good");
        this.hud.ownerSay(OWNER.rain);
      } else if (kind === "dry") {
        this.hud.toast(AMBIENT.rainStop, "good");
      }
    };

    this.world.events.onEvent = (type) => this._onWorldEvent(type);
  }

  /* ------------------------------------------------------------------ */
  /*  Shift lifecycle                                                    */
  /* ------------------------------------------------------------------ */

  startShift() {
    this.customers.reset();
    this.hud.reset();
    this.phase = "running";
    this.earnings = 0;
    this.itemsServed = 0;
    this.ordersServed = 0;
    this.spawnCount = 0;
    this.spawnTimer = FIRST_SPAWN_DELAY;
    this.selected = null;
    this.prepQueue = [];
    this.carry = null;
    this.kidCustomer = null;
    this.elapsed = 0;
    this._hint = "";
    this._weatherKey = "";

    this.rig.reset();
    this.hud.setEarnings(0);
    this.hud.setServed(0);
    this.hud.setSelected(null);
    this.hud.setCarryState(null);
    this.hud.setHint(UI.firstGuest);
    this.hud.ownerSay(UI.introCaption);
  }

  /* ------------------------------------------------------------------ */
  /*  Selection                                                          */
  /* ------------------------------------------------------------------ */

  select(customer) {
    if (this.carry) return null;
    if (customer && (customer.state === "leaving" || customer.state === "gone")) {
      customer = null;
    }
    this.selected = customer ?? null;
    this.customers.setSelected(this.selected);
    this.hud.setSelected(this.selected);

    if (this.selected) {
      this.hud.updateOrder(this.selected, { carrying: false });
      if (this.selected.state === "kidPrice") this.hud.showKidPrice(this.selected);
      else this.hud.hideKidPrice();
      this._setHint(
        this.selected.state === "billing"
          ? UI.billAsk
          : this.selected.state === "kidPrice"
            ? UI.kidWait
            : this.selected.isServable
              ? UI.prepHint
              : UI.arrivingHint
      );
    } else {
      this._setHint(this.customers.activeCount ? UI.nextCustomer : UI.selectHint);
    }
    return this.selected;
  }

  selectById(id) {
    const customer = this.customers.getById(id);
    return customer ? this.select(customer) : null;
  }

  deselect() {
    if (this.selected?.state === "kidPrice") this.hud.hideKidPrice();
    this.select(null);
  }

  /* ------------------------------------------------------------------ */
  /*  Preparing                                                          */
  /* ------------------------------------------------------------------ */

  prepare(customer, lineId) {
    if (this.phase !== "running") return { ok: false, reason: "not-running" };
    if (!customer || !customer.isServable) return { ok: false, reason: "not-orderable" };
    if (this.carry) return { ok: false, reason: "carrying" };

    // One tap on a line prepares every unit still outstanding for it, so a
    // "ബോണ്ട ×2" never ends up half-served.
    let started = 0;
    while (customer.startPrep(lineId)) started += 1;
    if (started === 0) {
      return { ok: false, reason: "nothing-to-prepare" };
    }

    const item = itemById(lineId);
    const kind = item?.kind ?? "snack";
    const base = PREP_TIME[kind] ?? 1.8;
    for (let i = 0; i < started; i += 1) {
      this.prepQueue.push({
        customer,
        lineId,
        remaining: base + i * 0.45,
      });
    }
    this.hud.toast(`${item?.label ?? lineId} · ${UI.preparing}`, "good");
    this.hud.updateOrder(customer, { carrying: false });
    return { ok: true, started };
  }

  _tickPreps(dt) {
    for (let i = this.prepQueue.length - 1; i >= 0; i--) {
      const job = this.prepQueue[i];
      if (job.customer.state === "leaving" || job.customer.state === "gone") {
        job.customer.cancelPrep(job.lineId);
        this.prepQueue.splice(i, 1);
        continue;
      }
      job.remaining -= dt;
      if (job.remaining > 0) continue;

      job.customer.finishPrep(job.lineId);
      this.prepQueue.splice(i, 1);
      this.hud.toast(`${itemById(job.lineId)?.label ?? job.lineId} · ${UI.readyItem}`, "good");
      if (!this.selected) this.select(job.customer);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Carrying + giving                                                  */
  /* ------------------------------------------------------------------ */

  startCarry() {
    if (this.phase !== "running") return { ok: false, reason: "not-running" };
    const customer = this.selected;
    if (!customer || !customer.isServable) return { ok: false, reason: "no-customer" };
    if (customer.preparedCount <= 0) {
      this.hud.toast(UI.prepHint, "bad");
      return { ok: false, reason: "nothing-ready" };
    }
    if (this.carry) return { ok: false, reason: "already-carrying" };

    const items = customer.preparedItems();

    if (customer.spot?.instantServe) {
      this._handOver(customer, items);
      return { ok: true, instant: true };
    }

    this.carry = { customer, items, phase: "walking" };
    this.hud.setCarryState("walking");
    this._setHint(UI.carryWalk);
    this.hud.updateOrder(customer, { carrying: true });

    this.rig.startCarry(customer.spot, customer, items, () => {
      if (!this.carry || this.carry.customer !== customer) return;
      this.carry.phase = "arrived";
      this.hud.setCarryState("arrived");
      this._setHint(UI.giveHint);
    });

    return { ok: true };
  }

  give() {
    if (!this.carry) return { ok: false, reason: "not-carrying" };
    if (this.carry.phase !== "arrived") return { ok: false, reason: "not-arrived" };

    const { customer, items } = this.carry;
    this.carry.phase = "giving";
    this.hud.setCarryState(null);
    this._setHint(UI.returning);

    const result = this._handOver(customer, items, { instant: false });

    this.rig.returnToSeat(() => {
      this.carry = null;
      this.hud.updateOrder(this.selected ?? customer, { carrying: false });
    });

    return result;
  }

  _handOver(customer, items, { instant = true } = {}) {
    const servedBefore = new Map(customer.lines.map((line) => [line.id, line.served]));
    const delivered = customer.deliver(items);
    if (!delivered) {
      this.hud.toast(UI.busy, "bad");
      return { ok: false, reason: "nothing-delivered" };
    }

    // Money follows what actually left the counter, measured as a delta so a
    // second trip for the missing half of an order cannot be charged twice.
    let earned = 0;
    const unique = [];
    for (const line of customer.lines) {
      const gained = line.served - (servedBefore.get(line.id) ?? 0);
      if (gained <= 0) continue;
      earned += line.price * gained;
      const info = itemById(line.id);
      if (info) unique.push({ id: line.id, label: info.label, count: gained });
    }
    this.earnings += earned;
    this.itemsServed += delivered;

    if (instant) this.rig.flashTray(items);

    if (customer.allServed) {
      customer.completeServe();
      this.ordersServed += 1;
      this.hud.ownerSay(customer.kid ? OWNER.kid : OWNER.serve);
      this._setHint(UI.nextCustomer);
    } else {
      customer.partialAck();
      this.hud.ownerSay(OWNER.partial);
      this._setHint(UI.prepHint);
    }

    const label = unique
      .map((u) => (u.count > 1 ? `${u.label} ×${u.count}` : u.label))
      .join(" · ");
    this.hud.toast(`${label} · ${UI.servedItem}`, "good");
    this.hud.setEarnings(this.earnings);
    this.hud.setServed(this.itemsServed);
    this.hud.updateOrder(customer, { carrying: false });
    return { ok: true, earned, delivered };
  }

  /* ------------------------------------------------------------------ */
  /*  Bill                                                               */
  /* ------------------------------------------------------------------ */

  openBill() {
    const customer = this.selected;
    if (!customer || customer.state !== "billing") return { ok: false, reason: "no-bill" };
    this.hud.showBill(customer);
    this._setHint(UI.billAsk);
    return { ok: true };
  }

  payBill() {
    const customer = this.selected;
    if (!customer || customer.state !== "billing") return { ok: false, reason: "no-bill" };
    customer.payBill();
    this.hud.closeBill();
    this.hud.toast(UI.billPaid, "good");
    this.hud.ownerSay(OWNER.paid);
    this._setHint(this.customers.activeCount ? UI.nextCustomer : UI.selectHint);
    return { ok: true };
  }

  /* ------------------------------------------------------------------ */
  /*  Kids' chocolate price                                              */
  /* ------------------------------------------------------------------ */

  answerKidPrice(customer, price) {
    if (!customer || customer.state !== "kidPrice") return { ok: false, reason: "no-kid" };
    const right = price === itemById("chocolate")?.price;
    customer.answerKidPrice(right);
    this.hud.hideKidPrice();
    this.kidCustomer = null;

    if (right) {
      this.hud.toast(KID.two, "good");
      this._setHint(UI.prepHint);
      if (this.selected !== customer) this.select(customer);
    } else {
      this.hud.toast(KID.wrongPrice, "bad");
      this.hud.setSelected(null);
      this.selected = null;
      this.customers.setSelected(null);
      this._setHint(this.customers.activeCount ? UI.nextCustomer : UI.selectHint);
    }
    return { ok: right };
  }

  /* ------------------------------------------------------------------ */
  /*  Events                                                             */
  /* ------------------------------------------------------------------ */

  _onCustomerEvent(type, customer) {
    if (!customer) return;

    if (type === "ready") {
      if (!this.selected) this.select(customer);
      this._setHint(UI.prepHint);
    }

    if (type === "kidPrice") {
      this.kidCustomer = customer;
      this.select(customer);
      this.hud.showKidPrice(customer);
      this._setHint(UI.kidWait);
    }

    if (type === "complaint") {
      this.hud.toast(customer.reply?.text ?? UI.wait, "bad");
    }

    if (type === "giveUp") {
      if (this.carry?.customer === customer) this._cancelCarry();
      this.hud.toast(customer.reply?.text ?? UI.orderLost, "bad");
      if (this.selected === customer) this.select(null);
    }

    if (type === "billRequest") {
      if (this.selected === customer) {
        this.hud.setSelected(customer);
        this.openBill();
      } else {
        this.hud.toast(customer.reply?.text ?? UI.billRequested, "good");
      }
    }

    if (type === "gone") {
      if (this.selected === customer) this.select(null);
    }
  }

  _onWorldEvent(type) {
    if (type === "dogFight") {
      this.hud.toast(pick(AMBIENT.dogBark), "bad");
    } else if (type === "dogShoo") {
      this.hud.ownerSay(pick(AMBIENT.dogShoo));
    }
  }

  _cancelCarry() {
    this.carry = null;
    this.hud.setCarryState(null);
    this.rig.returnToSeat();
    this._setHint(this.customers.activeCount ? UI.nextCustomer : UI.selectHint);
  }

  /* ------------------------------------------------------------------ */
  /*  Spawning                                                           */
  /* ------------------------------------------------------------------ */

  _updateSpawning(dt) {
    if (this.customers.activeCount >= MAX_CUSTOMERS) {
      this.spawnTimer = Math.max(this.spawnTimer, 1.2);
      return;
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    const first = this.spawnCount === 0;
    const kid = !first && this.spawnCount >= 2 && Math.random() < 0.22;
    const order = kid ? [{ id: "chocolate", qty: 2 }] : makeOrder();

    const customer = this.customers.spawn({ order, kid, first });
    if (!customer) {
      this.spawnTimer = 1.6;
      return;
    }

    this.spawnCount += 1;
    this.spawnTimer = (first ? 4.5 : 5.4) + Math.random() * 4.2;
    if (!this.selected && this.spawnCount === 1) {
      this._setHint(UI.firstGuest);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Frame update                                                       */
  /* ------------------------------------------------------------------ */

  update(dt, elapsed) {
    this.elapsed = elapsed;
    if (this.phase !== "running") return;

    this._tickPreps(dt);
    this._updateSpawning(dt);

    const raining = this.world.weather.raining;
    this.customers.update(dt, elapsed, raining);

    if (this.carry) {
      const customer = this.carry.customer;
      if (customer.state === "leaving" || customer.state === "gone") this._cancelCarry();
    }

    if (this.selected && (this.selected.state === "gone" || this.selected.state === "leaving")) {
      this.select(null);
    }

    if (this.selected) {
      this.hud.updateOrder(this.selected, { carrying: Boolean(this.carry) });
    }

    this.hud.updateBubbles(this.customers.customers, this.camera, this.selected?.id ?? null);

    const weatherKey = `${raining}|${this.world.weather.wetness > 0.35}`;
    if (weatherKey !== this._weatherKey) {
      this._weatherKey = weatherKey;
      this.hud.setWeather(raining, this.world.weather.wetness);
    }

    if (!this.selected && !this.carry) {
      this._setHint(this.spawnCount === 0 ? UI.firstGuest : UI.selectHint);
    }
  }

  _setHint(text) {
    if (!text || text === this._hint) return;
    this._hint = text;
    this.hud.setHint(text);
  }

  /* ------------------------------------------------------------------ */
  /*  Debug snapshot                                                     */
  /* ------------------------------------------------------------------ */

  getState() {
    return {
      phase: this.phase,
      earnings: this.earnings,
      itemsServed: this.itemsServed,
      ordersServed: this.ordersServed,
      spawnCount: this.spawnCount,
      selectedId: this.selected?.id ?? null,
      carrying: this.carry
        ? { customerId: this.carry.customer.id, phase: this.carry.phase, items: this.carry.items.length }
        : null,
      weather: {
        raining: Boolean(this.world.weather.raining),
        wetness: Number((this.world.weather.wetness ?? 0).toFixed(2)),
      },
      customers: this.customers.customers.map((c) => ({
        id: c.id,
        state: c.state,
        spot: c.spot?.id ?? null,
        spotKind: c.spot?.kind ?? null,
        kid: c.kid,
        patience: Number(c.patience.toFixed(2)),
        lines: c.lines.map((l) => ({
          id: l.id,
          qty: l.qty,
          served: l.served,
          prepared: l.prepared,
          preparing: l.preparing,
          price: l.price,
        })),
        total: c.total(),
        reply: c.reply?.text ?? null,
      })),
    };
  }
}
