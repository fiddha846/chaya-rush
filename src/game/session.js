import { MENU_BY_ID, MENU_ITEMS, earningsFor, formatRupees } from "../config/menu.js";
import { GAME_RULES } from "../config/game.js";
import {
  COMPLAINT_ML,
  THANK_YOU_BY_ITEM_ML,
  THANK_YOU_GENERIC_ML,
  MENU_LABELS_ML,
} from "../config/strings.ml.js";
import { CustomerManager } from "./customers.js";

/**
 * CHAYA RUSH — round + serving logic (Stage 2).
 *
 * All money and item validation comes from src/config/menu.js. Nothing in this
 * file hard-codes a price. All player-facing customer lines come from
 * src/config/strings.ml.js (owner-approved text).
 */

const SPAWN_FIRST_DELAY = 0.9;
const SPAWN_GAP_MIN = 5.5;
const SPAWN_GAP_MAX = 8.0;

function pickLine(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return "";
  return lines[Math.floor(Math.random() * lines.length)];
}

function pickOrder() {
  const ids = MENU_ITEMS.map((item) => item.id);
  // Fisher–Yates shuffle, then take 1–3 distinct items.
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const roll = Math.random();
  const count = roll < 0.45 ? 1 : roll < 0.85 ? 2 : 3;
  return ids.slice(0, count);
}

function orderTotal(order) {
  return order.reduce((sum, id) => sum + earningsFor(id), 0);
}

export class GameSession {
  constructor({ scene, camera, overlay, hud }) {
    this.scene = scene;
    this.camera = camera;
    this.overlay = overlay;
    this.hud = hud;

    this.customers = new CustomerManager({
      scene,
      onEvent: (type, customer) => this._onCustomerEvent(type, customer),
    });

    this.phase = "ready"; // ready | running | ended
    this.timeLeft = GAME_RULES.roundDurationSec;
    this.earnings = GAME_RULES.startingEarnings;
    this.itemsServed = 0;
    this.ordersServed = 0;
    this.elapsed = 0;
    this.spawnTimer = SPAWN_FIRST_DELAY;
    this.selected = null;

    this._publishHud();
  }

  /* ------------------------------------------------------------------ */
  /*  Round lifecycle                                                    */
  /* ------------------------------------------------------------------ */

  start() {
    this.customers.reset();
    this.overlay.clear();
    this.hud.hideResults();

    this.phase = "running";
    this.timeLeft = GAME_RULES.roundDurationSec;
    this.earnings = GAME_RULES.startingEarnings;
    this.itemsServed = 0;
    this.ordersServed = 0;
    this.elapsed = 0;
    this.spawnTimer = SPAWN_FIRST_DELAY;
    this.selected = null;

    this._publishHud();
    this.overlay.setSelected(null);
    this.hud.setServeHint("Waiting for the first customer…");
    this.hud.setRoundActive(true);
  }

  restart() {
    this.start();
  }

  end() {
    if (this.phase === "ended") return;
    this.phase = "ended";
    this.timeLeft = 0;
    this.select(null);
    this.overlay.setRoundOver();
    this.hud.setRoundActive(false);
    this.hud.showResults({
      earnings: this.earnings,
      ordersServed: this.ordersServed,
      itemsServed: this.itemsServed,
    });
    this._publishHud();
  }

  /* ------------------------------------------------------------------ */
  /*  Selection + serving                                                */
  /* ------------------------------------------------------------------ */

  select(customer, { silent = false } = {}) {
    if (customer && !customer.isServable) customer = null;
    this.selected = customer ?? null;
    this.customers.setSelected(this.selected);
    this.overlay.setSelected(this.selected);

    if (!silent) {
      if (this.selected) {
        const n = this.selected.order.length;
        this.hud.setServeHint(
          `Guest #${this.selected.id.replace("customer-", "")} · ${n} item${n === 1 ? "" : "s"}`
        );
      } else {
        this.hud.setServeHint("Click a customer or an order card to select.");
      }
    }
  }

  selectById(id) {
    const customer = this.customers.getById(id);
    if (customer) this.select(customer);
    return customer;
  }

  /**
   * Serve one item to the selected customer.
   * Returns { ok, reason } so automated checks can assert on it.
   */
  serve(itemId) {
    if (this.phase !== "running") return { ok: false, reason: "round-not-running" };
    if (!MENU_BY_ID[itemId]) return { ok: false, reason: "unknown-item" };

    let customer = this.selected && this.selected.isServable ? this.selected : null;

    // Forgiving fallback: if nobody is selected but exactly one customer is
    // waiting, serve them. With two or more, the player must choose.
    if (!customer) {
      const waiting = this.customers.customers.filter((c) => c.isServable);
      if (waiting.length === 1) {
        customer = waiting[0];
        this.select(customer);
      }
    }

    if (!customer) {
      this.hud.toast("Select a customer first.", "bad");
      return { ok: false, reason: "no-customer-selected" };
    }

    if (!customer.takeItem(itemId)) {
      this.hud.toast("That item is not in this order.", "bad");
      return { ok: false, reason: "not-in-order" };
    }

    // Price and earnings both come from the shared menu config.
    const earned = earningsFor(itemId);
    this.earnings += earned;
    this.itemsServed += 1;

    const line =
      pickLine(THANK_YOU_BY_ITEM_ML[itemId]) ||
      pickLine(THANK_YOU_GENERIC_ML) ||
      "";
    customer.reply = { text: line, tone: "good", sticky: false };
    customer.replyUntil = this.elapsed + 2.4;

    const label = MENU_LABELS_ML[itemId] ?? itemId;
    this.hud.toast(`Served ${label} · +${formatRupees(earned)}`, "good");

    if (customer.order.length === 0) {
      this.ordersServed += 1;
      customer.complete();
      this.select(null);
      this.spawnTimer = Math.min(this.spawnTimer, 1.2);
      this.hud.setServeHint("Order complete. The next guest is on the way…");
    } else {
      this.hud.setServeHint(
        `Guest #${customer.id.replace("customer-", "")} · ${customer.order.length} item${
          customer.order.length === 1 ? "" : "s"
        } left`
      );
    }

    this._publishHud();
    return { ok: true, earned, remaining: customer.order.length };
  }

  /* ------------------------------------------------------------------ */
  /*  Frame update                                                       */
  /* ------------------------------------------------------------------ */

  update(dt, elapsed) {
    this.elapsed = elapsed;

    if (this.phase === "running") {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      this._updateSpawning(dt);

      if (this.timeLeft <= 0) this.end();
    }

    if (this.phase !== "ended") {
      this.customers.update(dt, elapsed);
    }

    // Drop a selection that has left or finished serving.
    if (this.selected && !this.selected.isServable) this.select(null, { silent: true });

    // Keep the selection ring glued to the (gently bobbing) customer.
    if (this.selected) {
      this.customers.selectionRing.position.x = this.selected.group.position.x;
      this.customers.selectionRing.position.z = this.selected.group.position.z;
    }

    // Expire short thank-you replies; complaints stay while the customer waits.
    for (const customer of this.customers.customers) {
      if (!customer.reply) continue;
      if (customer.reply.sticky) continue;
      if (this.elapsed > (customer.replyUntil ?? 0)) customer.reply = null;
    }

    this.overlay.update(this.customers.customers, this.camera, this.elapsed);
    this._publishHud();
  }

  _updateSpawning(dt) {
    if (this.customers.activeCount >= 3) {
      this.spawnTimer = 0.8;
      return;
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    const order = pickOrder();
    const customer = this.customers.spawn(order);
    if (!customer) {
      this.spawnTimer = 0.8;
      return;
    }

    this.overlay.add(customer);
    if (!this.selected) this.select(customer);
    this.spawnTimer = SPAWN_GAP_MIN + Math.random() * (SPAWN_GAP_MAX - SPAWN_GAP_MIN);
  }

  _onCustomerEvent(type, customer) {
    if (type === "complaint") {
      customer.reply = {
        text: pickLine(COMPLAINT_ML),
        tone: "bad",
        sticky: true,
      };
      this.hud.toast(
        `Guest #${customer.id.replace("customer-", "")} has been waiting too long.`,
        "bad"
      );
    }

    if (type === "gone") {
      this.overlay.remove(customer);
      if (this.selected === customer) this.select(null, { silent: true });
    }
  }

  _publishHud() {
    this.hud.setRoundTime(this.timeLeft);
    this.hud.setEarnings(this.earnings);
    this.hud.setOrdersServed(this.ordersServed);
  }

  /** Read-only snapshot for automated checks. */
  getState() {
    return {
      phase: this.phase,
      timeLeft: Number(this.timeLeft.toFixed(2)),
      earnings: this.earnings,
      ordersServed: this.ordersServed,
      itemsServed: this.itemsServed,
      selectedId: this.selected?.id ?? null,
      customers: this.customers.customers.map((c) => ({
        id: c.id,
        state: c.state,
        order: [...c.order],
        total: orderTotal(c.order),
        patience: Number(c.patience.toFixed(2)),
        reply: c.reply?.text ?? null,
      })),
    };
  }
}
