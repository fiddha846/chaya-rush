import * as THREE from "three";
import { MENU_ITEMS, earningsFor, formatRupees } from "../config/menu.js";
import { MENU_LABELS_ML } from "../config/strings.ml.js";

/**
 * CHAYA RUSH — order cards + serving dock (Stage 2).
 *
 * Order cards are plain DOM anchored to each customer's 3D head position. DOM
 * (rather than canvas sprites) keeps Malayalam shaping and ₹ rendering crisp at
 * every distance. All labels and prices come from config; nothing is hard-coded.
 */

const CARD_HALF_WIDTH = 118;
const EDGE_PAD = 12;
const TOP_MARGIN = 188;
const BOTTOM_MARGIN = 196;

export class OrderOverlay {
  constructor({ onSelect, onServe }) {
    this.onSelect = onSelect;
    this.onServe = onServe;
    this.layer = document.getElementById("order-layer");
    this.grid = document.getElementById("serve-grid");
    this.selectionLabel = document.getElementById("serve-selected");
    this.dock = document.getElementById("serve-dock");
    this.cards = new Map();
    this.selectedId = null;
    this._projected = new THREE.Vector3();

    this._buildDock();
  }

  /* ------------------------------------------------------------------ */
  /*  Serving dock                                                       */
  /* ------------------------------------------------------------------ */

  _buildDock() {
    if (!this.grid) return;
    this.grid.replaceChildren();

    for (const item of MENU_ITEMS) {
      const label = MENU_LABELS_ML[item.id] ?? item.id;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "serve-btn";
      button.dataset.itemId = item.id;
      button.setAttribute("aria-label", `Serve ${label}, ${formatRupees(item.price)}`);

      const name = document.createElement("span");
      name.className = "serve-name ml";
      name.textContent = label;

      const price = document.createElement("span");
      price.className = "serve-price";
      price.textContent = formatRupees(item.price);

      button.append(name, price);
      button.addEventListener("click", () => this.onServe?.(item.id));
      this.grid.append(button);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Cards                                                              */
  /* ------------------------------------------------------------------ */

  add(customer) {
    if (!this.layer || this.cards.has(customer.id)) return;

    const el = document.createElement("article");
    el.className = "order-card";
    el.dataset.customerId = customer.id;
    el.tabIndex = 0;
    el.setAttribute("role", "button");

    const head = document.createElement("header");
    head.className = "order-head";
    const name = document.createElement("span");
    name.className = "order-name";
    name.textContent = `Guest #${customer.id.replace("customer-", "")}`;
    const total = document.createElement("span");
    total.className = "order-total";
    head.append(name, total);

    const list = document.createElement("ul");
    list.className = "order-list";

    const track = document.createElement("div");
    track.className = "patience-track";
    const fill = document.createElement("span");
    fill.className = "patience-fill";
    track.append(fill);

    const note = document.createElement("p");
    note.className = "order-note ml";

    el.append(head, list, track, note);

    const select = () => {
      if (customer.isServable) this.onSelect?.(customer);
    };
    el.addEventListener("click", select);
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    });

    this.layer.append(el);
    const card = {
      el,
      name,
      total,
      list,
      fill,
      note,
      signature: "",
      hidden: false,
    };
    this.cards.set(customer.id, card);
    this._render(customer, card);
  }

  remove(customer) {
    const card = this.cards.get(customer.id);
    if (!card) return;
    card.el.remove();
    this.cards.delete(customer.id);
    if (this.selectedId === customer.id) this.selectedId = null;
  }

  clear() {
    for (const card of this.cards.values()) card.el.remove();
    this.cards.clear();
    this.selectedId = null;
    this.setSelected(null);
    if (this.layer) this.layer.removeAttribute("data-round-over");
  }

  setSelected(customer) {
    this.selectedId = customer?.id ?? null;

    for (const [id, card] of this.cards) {
      card.el.classList.toggle("is-selected", id === this.selectedId);
    }

    if (this.selectionLabel) {
      if (customer) {
        const n = customer.order.length;
        this.selectionLabel.textContent = `Guest #${customer.id.replace(
          "customer-",
          ""
        )} · ${n} item${n === 1 ? "" : "s"}`;
      } else {
        this.selectionLabel.textContent = "No guest selected";
      }
    }

    this.dock?.classList.toggle("has-selection", Boolean(customer));
  }

  setRoundOver() {
    this.layer?.setAttribute("data-round-over", "true");
    for (const card of this.cards.values()) {
      card.el.hidden = true;
      card.hidden = true;
    }
    this.setSelected(null);
  }

  /* ------------------------------------------------------------------ */
  /*  Per-frame sync                                                     */
  /* ------------------------------------------------------------------ */

  update(customers, camera, elapsed) {
    // Keep projection matrices current even when called before the renderer.
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    const queue = [];
    const over = this.layer?.dataset.roundOver === "true";

    for (const customer of customers) {
      let card = this.cards.get(customer.id);
      if (!card) {
        this.add(customer);
        card = this.cards.get(customer.id);
        if (!card) continue;
      }

      this._render(customer, card);

      if (
        over ||
        customer.state === "leaving" ||
        customer.state === "gone"
      ) {
        this._hide(card);
        continue;
      }

      const target = this._target(customer, camera);
      if (!target) {
        this._hide(card);
        continue;
      }

      // Measure while visible so collision resolution knows the real height.
      card.height = card.el.offsetHeight || card.height || 96;
      card.width = card.el.offsetWidth || 236;
      queue.push({ card, ...target });
    }

    // Greedy vertical de-overlap: sort top-first, then push a colliding card
    // below the one it would cover. Keeps every order readable and clickable.
    queue.sort((a, b) => a.y - b.y);
    const placed = [];
    const maxY = window.innerHeight - BOTTOM_MARGIN;

    for (const item of queue) {
      const { card } = item;
      let y = item.y;
      for (let guard = 0; guard < 6; guard++) {
        const hit = placed.find((p) => {
          const sameColumn = Math.abs(p.x - item.x) < (p.w + card.width) / 2 + 8;
          const overlapsY = y - card.height < p.y && y > p.y - p.h;
          return sameColumn && overlapsY;
        });
        if (!hit) break;
        y = hit.y + 8 + card.height;
      }

      y = Math.max(TOP_MARGIN, Math.min(maxY, y));
      card.el.style.transform = `translate(${item.x.toFixed(1)}px, ${y.toFixed(
        1
      )}px) translate(-50%, -100%)`;
      card.el.hidden = false;
      card.hidden = false;
      placed.push({ x: item.x, y, w: card.width, h: card.height });
    }
  }

  _hide(card) {
    card.el.hidden = true;
    card.hidden = true;
  }

  _target(customer, camera) {
    this._projected.copy(customer.labelAnchor).project(camera);
    const v = this._projected;

    // NDC z outside [-1, 1] means the anchor is clipped/behind the camera.
    if (v.z < -1 || v.z > 1) return null;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const x = (v.x * 0.5 + 0.5) * width;
    const y = (-v.y * 0.5 + 0.5) * height;

    if (x < -160 || x > width + 160 || y < -80 || y > height + 80) return null;

    return {
      x: Math.max(
        CARD_HALF_WIDTH + EDGE_PAD,
        Math.min(width - CARD_HALF_WIDTH - EDGE_PAD, x)
      ),
      y: Math.max(TOP_MARGIN, Math.min(height - BOTTOM_MARGIN, y)),
    };
  }

  _render(customer, card) {
    const reply = customer.reply?.text ?? "";
    const signature = `${customer.order.join("|")}::${customer.state}::${reply}::${
      customer.reply?.tone ?? ""
    }`;
    if (signature === card.signature) {
      this._updatePatience(customer, card);
      return;
    }
    card.signature = signature;

    card.name.textContent = `Guest #${customer.id.replace("customer-", "")}`;
    card.total.textContent = formatRupees(
      customer.order.reduce((sum, id) => sum + earningsFor(id), 0)
    );

    card.list.replaceChildren();
    for (const id of customer.order) {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.className = "order-item ml";
      label.textContent = MENU_LABELS_ML[id] ?? id;
      const price = document.createElement("span");
      price.className = "order-price";
      price.textContent = formatRupees(earningsFor(id));
      li.append(label, price);
      card.list.append(li);
    }

    card.el.classList.toggle("is-complaining", customer.state === "complained");
    card.el.classList.toggle("is-completing", customer.state === "completing");

    if (reply) {
      card.note.textContent = reply;
      card.note.hidden = false;
      card.note.classList.toggle("is-bad", customer.reply?.tone === "bad");
      card.note.classList.toggle("is-good", customer.reply?.tone === "good");
    } else {
      card.note.textContent = "";
      card.note.hidden = true;
      card.note.classList.remove("is-bad", "is-good");
    }

    this._updatePatience(customer, card);
  }

  _updatePatience(customer, card) {
    const max = customer.patienceMax || 1;
    const ratio = Math.max(0, Math.min(1, customer.patience / max));
    card.fill.style.width = `${(ratio * 100).toFixed(1)}%`;
    card.el.classList.toggle("is-low", ratio < 0.28 && customer.state === "waiting");
    card.el.setAttribute(
      "aria-label",
      `Guest ${customer.id.replace("customer-", "")}, ${customer.order.length} items waiting`
    );
  }
}
