import { formatRupees } from "../config/menu.js";

/**
 * CHAYA RUSH — HUD + overlay helpers.
 * Pure DOM: no Three.js here.
 *
 * Elements are looked up lazily (per call) rather than once at module load.
 * Module scripts can be evaluated before a given element exists in some
 * embedding/restore situations; a cached `null` would silently skip the HUD
 * reveal for the rest of the session.
 */

const $ = (id) => document.getElementById(id);
let toastTimer = 0;

/** Update the loading caption and progress bar (0–100). */
export function setLoadingStatus(text, percent) {
  const status = $("loading-status");
  if (status) status.textContent = text;

  const bar = $("loading-bar-fill");
  if (bar && typeof percent === "number") {
    bar.style.width = `${Math.max(4, Math.min(100, percent))}%`;
  }
}

/** Fade the loading overlay away and reveal the HUD. */
export function hideLoading() {
  const loading = $("loading");
  if (loading) {
    loading.classList.add("is-hidden");
    // Remove from the a11y tree once the transition finishes.
    window.setTimeout(() => loading.setAttribute("hidden", ""), 900);
  }

  const hud = $("hud");
  if (!hud) {
    console.warn("[Chaya Rush] #hud not found; skipping HUD reveal.");
    return;
  }
  hud.hidden = false;
  // Force one style flush, then reveal. Avoids depending on rAF, which is
  // paused when the tab is occluded or backgrounded.
  void hud.offsetWidth;
  hud.classList.add("is-visible");
}

/** Show a fatal error overlay. */
export function showError(message) {
  $("loading")?.classList.add("is-hidden");

  const hud = $("hud");
  if (hud) hud.hidden = true;

  const error = $("error");
  if (error) {
    error.hidden = false;
    const text = $("error-text");
    if (text) text.textContent = String(message);
  }
  console.error("[Chaya Rush]", message);
}

/** Update the small FPS readout. */
export function setFps(value) {
  const fps = $("fps");
  if (fps) fps.textContent = `${Math.round(value)} fps`;
}

/** Toggle the FPS readout visibility. */
export function setFpsVisible(visible) {
  const fps = $("fps");
  if (fps) fps.style.display = visible ? "" : "none";
}

/* ------------------------------------------------------------------ */
/*  Round HUD                                                          */
/* ------------------------------------------------------------------ */

export function setRoundTime(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  const timer = $("round-timer");
  if (!timer) return;
  timer.textContent = `${value}s`;
  timer.classList.toggle("is-urgent", value <= 10);
}

export function setEarnings(amount) {
  const earnings = $("earnings");
  if (earnings) earnings.textContent = formatRupees(amount);
}

export function setOrdersServed(count) {
  const served = $("orders-served");
  if (served) served.textContent = String(count);
}

export function setServeHint(text) {
  const hint = $("serve-hint");
  if (hint) hint.textContent = text;
}

export function setRoundActive(active) {
  const dock = $("serve-dock");
  if (!dock) return;
  dock.classList.toggle("is-live", active);
  for (const button of dock.querySelectorAll("button")) {
    button.disabled = !active;
  }
}

/** Short status line above the serve dock (English UI copy, not dialogue). */
export function toast(text, tone = "good") {
  const el = $("toast");
  if (!el) return;

  window.clearTimeout(toastTimer);
  el.textContent = text;
  el.dataset.tone = tone;
  el.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    el.classList.remove("is-visible");
  }, 2200);
}

export function showResults({ earnings, ordersServed, itemsServed }) {
  const overlay = $("results");
  if (overlay) overlay.hidden = false;

  const earningsEl = $("results-earnings");
  if (earningsEl) earningsEl.textContent = formatRupees(earnings);

  const ordersEl = $("results-orders");
  if (ordersEl) {
    ordersEl.textContent = `${ordersServed} order${ordersServed === 1 ? "" : "s"} completed · ${
      itemsServed
    } item${itemsServed === 1 ? "" : "s"} served`;
  }
}

export function hideResults() {
  const overlay = $("results");
  if (overlay) overlay.hidden = true;
}
