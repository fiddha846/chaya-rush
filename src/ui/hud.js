import { MENU_ITEMS, CHOCOLATE, CHOCOLATE_PRICE_CHOICES, formatMoney, itemById } from "../config/menu.js";
import { UI, KID, pick } from "../config/strings.ml.js";

/**
 * ചായക്കട HUD — all player-facing copy is Malayalam, sourced from
 * src/config/strings.ml.js. This module only builds and updates DOM.
 */

const $ = (id) => document.getElementById(id);
const ml = (tag = "span", className = "") => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.classList.add("ml");
  return el;
};

export class Hud {
  constructor(callbacks = {}) {
    this.cb = callbacks;
    this.bubbles = new Map();
    this.panelSignature = "";
    this.toastTimer = 0;
    this.ownerTimer = 0;
    this.menuBuilt = false;
    this.selected = null;
    this.carryState = null;

    this.$orderPanel = $("order-panel");
    this.$orderName = $("order-name");
    this.$orderSpot = $("order-spot");
    this.$orderList = $("order-list");
    this.$carryBtn = $("carry-btn");
    this.$billBtn = $("bill-btn");
    this.$panelNote = $("panel-note");
    this.$patienceFill = $("patience-fill");
    this.$patienceLabel = $("patience-label");
    this.$bubbleLayer = $("bubble-layer");
    this.$carryBar = $("carry-bar");
    this.$giveButton = $("give-button");
    this.$carryHint = $("carry-hint");
    this.$hintLine = $("hint-line");
    this.$ownerLine = $("owner-line");
    this.$ownerText = $("owner-text");
    this.$toast = $("toast");
    this.$weather = $("weather-chip");
    this.$billModal = $("bill-modal");
    this.$billList = $("bill-list");
    this.$billTotal = $("bill-total");
    this.$kidModal = $("kid-modal");
    this.$kidMessage = $("kid-message");
    this.$kidOptions = $("kid-options");
    this.$menuModal = $("menu-modal");
    this.$menuList = $("menu-list");

    this.$orderPanel?.querySelectorAll("[data-close-order]").forEach((b) =>
      b.addEventListener("click", () => this.cb.onDeselect?.())
    );
    $("order-close")?.addEventListener("click", () => this.cb.onDeselect?.());
    this.$carryBtn?.addEventListener("click", () => this.cb.onCarry?.());
    this.$billBtn?.addEventListener("click", () => this.cb.onBill?.());
    this.$giveButton?.addEventListener("click", () => this.cb.onGive?.());
    $("menu-button")?.addEventListener("click", () => this.openMenu());
    $("menu-close")?.addEventListener("click", () => this.closeMenu());
    $("bill-close")?.addEventListener("click", () => this.closeBill());
    $("bill-pay")?.addEventListener("click", () => this.cb.onPay?.());
    this.$menuModal?.addEventListener("click", (e) => {
      if (e.target === this.$menuModal) this.closeMenu();
    });
    this.$billModal?.addEventListener("click", (e) => {
      if (e.target === this.$billModal) this.closeBill();
    });
    this.$kidModal?.addEventListener("click", (e) => {
      if (e.target === this.$kidModal) this.hideKidPrice();
    });

    this.buildMenu();
  }

  /* ------------------------------------------------------------------ */
  /*  Boot / overlays                                                    */
  /* ------------------------------------------------------------------ */

  setLoading(text, percent) {
    const status = $("loading-status");
    if (status && text) status.textContent = text;
    const bar = $("loading-bar-fill");
    if (bar && typeof percent === "number") bar.style.width = `${Math.max(4, Math.min(100, percent))}%`;
  }

  hideLoading() {
    const loading = $("loading");
    if (loading) {
      loading.classList.add("is-hidden");
      window.setTimeout(() => loading.setAttribute("hidden", ""), 900);
    }
  }

  showStart() {
    const start = $("start");
    if (start) {
      start.hidden = false;
      void start.offsetWidth;
      start.classList.add("is-visible");
    }
  }

  hideStart() {
    const start = $("start");
    if (start) {
      start.classList.remove("is-visible");
      window.setTimeout(() => start.setAttribute("hidden", ""), 700);
    }
  }

  reveal() {
    const hud = $("hud");
    if (!hud) return;
    hud.hidden = false;
    void hud.offsetWidth;
    hud.classList.add("is-visible");
  }

  showError(message) {
    $("loading")?.classList.add("is-hidden");
    const hud = $("hud");
    if (hud) hud.hidden = true;
    const error = $("error");
    if (error) {
      error.hidden = false;
      const text = $("error-text");
      if (text) text.textContent = String(message);
    }
  }

  setFps(value) {
    const el = $("fps");
    if (el) el.textContent = `${UI.fpsLabel} ${Math.round(value)}`;
  }

  /* ------------------------------------------------------------------ */
  /*  Top bar                                                            */
  /* ------------------------------------------------------------------ */

  setEarnings(amount) {
    const el = $("hud-earnings");
    if (el) el.textContent = formatMoney(amount);
  }

  setServed(count) {
    const el = $("hud-served");
    if (el) el.textContent = String(count);
  }

  setWeather(raining, wetness = 0) {
    if (!this.$weather) return;
    this.$weather.textContent = raining ? UI.weatherRain : wetness > 0.35 ? UI.weatherWet : UI.weatherDry;
    this.$weather.dataset.rain = raining ? "true" : "false";
  }

  setHint(text) {
    if (this.$hintLine) this.$hintLine.textContent = text;
  }

  toast(text, tone = "good") {
    if (!this.$toast || !text) return;
    window.clearTimeout(this.toastTimer);
    this.$toast.textContent = text;
    this.$toast.dataset.tone = tone;
    this.$toast.classList.add("is-visible");
    this.toastTimer = window.setTimeout(() => this.$toast.classList.remove("is-visible"), 2400);
  }

  ownerSay(text) {
    if (!this.$ownerLine || !this.$ownerText || !text) return;
    window.clearTimeout(this.ownerTimer);
    this.$ownerText.textContent = text;
    this.$ownerLine.classList.add("is-visible");
    this.ownerTimer = window.setTimeout(() => this.$ownerLine.classList.remove("is-visible"), 4600);
  }

  /* ------------------------------------------------------------------ */
  /*  Selected order                                                     */
  /* ------------------------------------------------------------------ */

  setSelected(customer) {
    this.selected = customer ?? null;
    if (!customer) {
      this.$orderPanel?.classList.add("is-hidden");
      this.panelSignature = "";
      return;
    }
    this.$orderPanel?.classList.remove("is-hidden");
  }

  updateOrder(customer, flags = {}) {
    if (!customer || !this.$orderPanel) return;

    const spotLabel =
      customer.spot?.kind === "counter"
        ? UI.counterSpot
        : customer.spot?.kind === "outside"
          ? customer.spot?.sit
            ? UI.outsideBench
            : UI.outsideSpot
          : UI.benchSpot;
    if (this.$orderName) {
      this.$orderName.textContent = `${UI.guest} ${customer.id.replace("customer-", "")}`;
    }
    if (this.$orderSpot) this.$orderSpot.textContent = spotLabel;

    const patienceRatio = Math.max(0, Math.min(1, customer.patience / (customer.patienceMax || 60)));
    if (this.$patienceFill) {
      this.$patienceFill.style.width = `${(patienceRatio * 100).toFixed(1)}%`;
      this.$patienceFill.dataset.low = patienceRatio < 0.3 ? "true" : "false";
    }
    if (this.$patienceLabel) {
      const seconds = Math.max(0, Math.ceil(customer.patience));
      this.$patienceLabel.textContent =
        customer.state === "billing" ? UI.billAsk : `${UI.wait} ${seconds} ${UI.seconds}`;
    }

    const structure = [
      customer.id,
      customer.state,
      customer.lines.map((l) => `${l.id}:${l.served}:${l.prepared}:${l.preparing}`).join(","),
      flags.carrying ? 1 : 0,
    ].join("|");

    if (structure !== this.panelSignature) {
      this.panelSignature = structure;
      this._renderLines(customer);
      this._renderActions(customer, flags);
    }

    if (this.$orderPanel) {
      this.$orderPanel.classList.toggle("is-billing", customer.state === "billing");
      this.$orderPanel.classList.toggle("is-complaining", customer.state === "complained");
    }

    const note = this.$panelNote;
    if (note) {
      if (customer.state === "billing") note.textContent = UI.billAsk;
      else if (flags.carrying) note.textContent = UI.carryWalk;
      else if (customer.preparingCount > 0) note.textContent = UI.preparing;
      else if (customer.preparedCount > 0) note.textContent = `${UI.carryReady} · ${customer.preparedCount}`;
      else note.textContent = UI.prepHint;
    }
  }

  _renderLines(customer) {
    if (!this.$orderList) return;
    this.$orderList.replaceChildren();
    for (const line of customer.lines) {
      const item = itemById(line.id);
      const status = customer.lineStatus(line);
      const li = document.createElement("li");
      li.className = `order-line is-${status}`;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "line-btn";
      button.disabled =
        !customer.isServable ||
        status === "served" ||
        status === "preparing" ||
        status === "ready" ||
        customer.state === "billing";
      button.addEventListener("click", () => this.cb.onPrepare?.(customer, line.id));

      const name = ml("span", "line-name");
      name.textContent = item?.label ?? line.id;
      const qty = document.createElement("span");
      qty.className = "line-qty";
      qty.textContent = `×${line.qty}`;
      const state = ml("span", "line-state");
      state.textContent =
        status === "served"
          ? UI.servedItem
          : status === "ready"
            ? UI.readyItem
            : status === "preparing"
              ? UI.preparing
              : UI.prepare;

      button.append(name, qty, state);
      li.append(button);
      this.$orderList.append(li);
    }
  }

  _renderActions(customer, flags) {
    const bill = customer.state === "billing";
    if (this.$billBtn) this.$billBtn.hidden = !bill;
    if (this.$carryBtn) {
      const canCarry = customer.isServable && customer.preparedCount > 0 && !flags.carrying;
      this.$carryBtn.hidden = bill || !customer.isServable;
      this.$carryBtn.disabled = !canCarry;
      this.$carryBtn.textContent =
        customer.preparedCount > 0
          ? `${customer.spot?.instantServe ? UI.give : UI.carry} (${customer.preparedCount})`
          : UI.carry;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Carry / give                                                       */
  /* ------------------------------------------------------------------ */

  setCarryState(state) {
    this.carryState = state;
    if (!this.$carryBar) return;
    if (!state) {
      this.$carryBar.classList.remove("is-visible", "is-arrived");
      return;
    }
    this.$carryBar.classList.add("is-visible");
    this.$carryBar.classList.toggle("is-arrived", state === "arrived");
    if (this.$carryHint) this.$carryHint.textContent = state === "arrived" ? UI.giveHint : UI.carryWalk;
    if (this.$giveButton) this.$giveButton.hidden = state !== "arrived";
  }

  /* ------------------------------------------------------------------ */
  /*  Bubbles over customers                                             */
  /* ------------------------------------------------------------------ */

  updateBubbles(customers, camera, selectedId = null) {
    if (!this.$bubbleLayer) return;
    camera.updateMatrixWorld();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const seen = new Set();
    const v = new THREE_VECTOR();

    for (const customer of customers) {
      if (customer.state === "gone") continue;
      seen.add(customer.id);

      let bubble = this.bubbles.get(customer.id);
      if (!bubble) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "bubble";
        el.addEventListener("click", () => this.cb.onSelect?.(customer));
        this.$bubbleLayer.append(el);
        bubble = { el, signature: "" };
        this.bubbles.set(customer.id, bubble);
      }

      const text = this._bubbleText(customer);
      const signature = `${text}|${customer.reply?.tone ?? ""}|${selectedId === customer.id ? 1 : 0}|${customer.state}`;
      if (signature !== bubble.signature) {
        bubble.signature = signature;
        bubble.el.replaceChildren();
        bubble.el.classList.toggle("is-selected", selectedId === customer.id);
        bubble.el.classList.toggle("is-bad", customer.reply?.tone === "bad");
        bubble.el.classList.toggle("is-good", customer.reply?.tone === "good");
        bubble.el.classList.toggle("is-faint", !customer.reply);
        const textEl = ml("span", "bubble-text");
        textEl.textContent = text;
        bubble.el.append(textEl);
      }

      v.copy(customer.labelAnchor).project(camera);
      const visible = v.z > -1 && v.z < 1 && Math.abs(v.x) < 1.3 && Math.abs(v.y) < 1.3;
      if (!visible) {
        bubble.el.style.display = "none";
        continue;
      }
      const x = Math.max(100, Math.min(width - 100, (v.x * 0.5 + 0.5) * width));
      const y = Math.max(96, Math.min(height - 250, (-v.y * 0.5 + 0.5) * height));
      bubble.el.style.display = "";
      bubble.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }

    for (const [id, bubble] of this.bubbles) {
      if (seen.has(id)) continue;
      bubble.el.remove();
      this.bubbles.delete(id);
    }
  }

  _bubbleText(customer) {
    if (customer.reply?.text) return customer.reply.text;
    if (customer.state === "ordering" || customer.state === "complained") {
      return customer.lines
        .filter((l) => l.served < l.qty)
        .map((l) => `${itemById(l.id)?.label ?? l.id} ×${l.qty - l.served}`)
        .join(" · ");
    }
    return "";
  }

  /* ------------------------------------------------------------------ */
  /*  Bill                                                               */
  /* ------------------------------------------------------------------ */

  showBill(customer) {
    if (!this.$billModal || !customer) return;
    this.$billList?.replaceChildren();

    for (const line of customer.lines) {
      const item = itemById(line.id);
      const li = document.createElement("li");
      const name = ml("span", "bill-name");
      name.textContent = `${item?.label ?? line.id} ×${line.qty}`;
      const price = document.createElement("span");
      price.className = "bill-price";
      price.textContent = formatMoney(line.price * line.qty);
      li.append(name, price);
      this.$billList?.append(li);
    }

    if (this.$billTotal) this.$billTotal.textContent = formatMoney(customer.total());
    this.$billModal.hidden = false;
    void this.$billModal.offsetWidth;
    this.$billModal.classList.add("is-visible");
  }

  closeBill() {
    if (!this.$billModal) return;
    this.$billModal.classList.remove("is-visible");
    window.setTimeout(() => (this.$billModal.hidden = true), 300);
  }

  /* ------------------------------------------------------------------ */
  /*  Kid price                                                          */
  /* ------------------------------------------------------------------ */

  showKidPrice(customer) {
    if (!this.$kidModal) return;
    this.kidCustomer = customer;
    if (this.$kidMessage) this.$kidMessage.textContent = KID.askPrice;
    this.$kidOptions?.replaceChildren();

    for (const price of CHOCOLATE_PRICE_CHOICES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "kid-price";
      button.textContent = formatMoney(price);
      button.addEventListener("click", () => this.cb.onKidPrice?.(customer, price));
      this.$kidOptions?.append(button);
    }

    this.$kidModal.hidden = false;
    void this.$kidModal.offsetWidth;
    this.$kidModal.classList.add("is-visible");
  }

  kidFeedback(text) {
    if (this.$kidMessage) this.$kidMessage.textContent = text;
  }

  hideKidPrice() {
    if (!this.$kidModal) return;
    this.$kidModal.classList.remove("is-visible");
    window.setTimeout(() => (this.$kidModal.hidden = true), 300);
  }

  /* ------------------------------------------------------------------ */
  /*  Menu                                                              */
  /* ------------------------------------------------------------------ */

  buildMenu() {
    if (!this.$menuList || this.menuBuilt) return;
    const rows = [...MENU_ITEMS, CHOCOLATE];
    for (const item of rows) {
      const row = document.createElement("li");
      const name = ml("span", "menu-name");
      name.textContent = item.label;
      const price = document.createElement("span");
      price.className = "menu-price";
      price.textContent = formatMoney(item.price);
      row.append(name, price);
      this.$menuList.append(row);
    }
    this.menuBuilt = true;
  }

  openMenu() {
    if (!this.$menuModal) return;
    this.$menuModal.hidden = false;
    void this.$menuModal.offsetWidth;
    this.$menuModal.classList.add("is-visible");
  }

  closeMenu() {
    if (!this.$menuModal) return;
    this.$menuModal.classList.remove("is-visible");
    window.setTimeout(() => (this.$menuModal.hidden = true), 300);
  }

  /* ------------------------------------------------------------------ */

  reset() {
    this.setSelected(null);
    this.setCarryState(null);
    this.closeBill();
    this.hideKidPrice();
    this.closeMenu();
    this.panelSignature = "";
    for (const bubble of this.bubbles.values()) bubble.el.remove();
    this.bubbles.clear();
  }
}

/* Tiny allocation-free helper for projecting bubble anchors. */
class THREE_VECTOR {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 1;
    this._v = null;
  }
  copy(anchor) {
    if (!this._v) this._v = anchor.clone();
    this._v.copy(anchor);
    return this;
  }
  project(camera) {
    this._v.project(camera);
    this.x = this._v.x;
    this.y = this._v.y;
    this.z = this._v.z;
    return this;
  }
}
