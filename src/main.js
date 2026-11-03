import * as THREE from "three";
import { createRenderer, createWorld } from "./world/scene.js";
import { buildShop } from "./world/shop.js";
import { CameraRig } from "./player/camera.js";
import { GameSession } from "./game/session.js";
import { Hud } from "./ui/hud.js";
import { UI } from "./config/strings.ml.js";

/**
 * ചായക്കട — entry point.
 *
 * Boots the renderer and the little street, seats the chaiwala behind the
 * counter, then opens a continuous evening shift: customers order in
 * Malayalam, the owner prepares and carries their tray, and the bill is settled
 * at the end.
 */

async function loadMalayalamFont() {
  if (!document.fonts) return;
  try {
    await document.fonts.load('700 64px "Noto Sans Malayalam"', "ചായ");
    await document.fonts.load('600 34px "Noto Sans Malayalam"', "ചായ");
    await document.fonts.ready;
  } catch (err) {
    console.warn("[ചായക്കട] Malayalam font did not load; signs may fall back.", err);
  }
}

const nextFrame = () =>
  new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    window.setTimeout(finish, 900);
    requestAnimationFrame(() => requestAnimationFrame(finish));
  });

function modalOpen() {
  return Boolean(document.querySelector(".modal.is-visible"));
}

async function boot() {
  const hud = new Hud();
  try {
    hud.setLoading(UI.loadingFont, 8);
    await loadMalayalamFont();

    const app = document.getElementById("app");
    if (!app) throw new Error("Missing #app container.");

    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2")) {
      throw new Error("WebGL2 is not available in this browser.");
    }

    hud.setLoading(UI.loadingWorld, 26);
    const renderer = createRenderer(app);
    const world = createWorld();
    const { scene, camera } = world;

    hud.setLoading(UI.loadingShop, 58);
    const shop = buildShop({ scene, renderer });

    const rig = new CameraRig(camera, renderer.domElement);
    rig.showExterior();

    let session = null;
    let started = false;
    let shiftOpen = false;

    hud.cb.onSelect = (customer) => session?.select(customer);
    hud.cb.onDeselect = () => session?.deselect();
    hud.cb.onCarry = () => session?.startCarry();
    hud.cb.onBill = () => session?.openBill();
    hud.cb.onGive = () => session?.give();
    hud.cb.onPay = () => session?.payBill();
    hud.cb.onPrepare = (customer, lineId) => session?.prepare(customer, lineId);
    hud.cb.onKidPrice = (customer, price) => session?.answerKidPrice(customer, price);

    session = new GameSession({ scene, camera, rig, hud, world });

    hud.setLoading(UI.loadingLights, 84);
    renderer.render(scene, camera);
    await nextFrame();

    hud.setLoading(UI.ready, 100);
    hud.hideLoading();
    hud.showStart();

    /* ---------------------------------------------------------------- */
    /*  Intro + start                                                    */
    /* ---------------------------------------------------------------- */

    const introCaption = document.getElementById("intro-caption");

    function beginGame() {
      if (started) return;
      started = true;
      hud.hideStart();
      if (introCaption) {
        introCaption.hidden = false;
        void introCaption.offsetWidth;
        introCaption.classList.add("is-visible");
      }

      rig.playIntro(() => {
        if (introCaption) {
          introCaption.classList.remove("is-visible");
          window.setTimeout(() => {
            if (introCaption) introCaption.hidden = true;
          }, 800);
        }
        hud.reveal();
        session.startShift();
        shiftOpen = true;
      });
    }

    document.getElementById("start-button")?.addEventListener("click", beginGame);
    window.addEventListener("keydown", (event) => {
      if (started) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        beginGame();
      }
    });

    /* ---------------------------------------------------------------- */
    /*  Pointing at customers                                           */
    /* ---------------------------------------------------------------- */

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const canvas = renderer.domElement;
    let press = null;

    canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      press = { x: event.clientX, y: event.clientY };
    });

    window.addEventListener("pointerup", (event) => {
      if (!press) return;
      const dx = event.clientX - press.x;
      const dy = event.clientY - press.y;
      press = null;

      if (dx * dx + dy * dy > 64) return;
      if (!shiftOpen || modalOpen() || rig.pointerLocked) return;
      if (session.carry) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);

      const customer = session.customers.pick(raycaster);
      if (customer) session.select(customer);
      else session.deselect();
    });

    /* ---------------------------------------------------------------- */
    /*  Keys                                                             */
    /* ---------------------------------------------------------------- */

    window.addEventListener("keydown", (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === "Escape") {
        if (modalOpen()) {
          hud.closeBill();
          hud.closeMenu();
          hud.hideKidPrice();
          return;
        }
        if (rig.pointerLocked) {
          document.exitPointerLock?.();
          return;
        }
        session.deselect();
        return;
      }

      if (!shiftOpen || modalOpen()) return;

      if (key === " ") {
        event.preventDefault();
        if (session.carry?.phase === "arrived") session.give();
        return;
      }

      if (key === "m") {
        hud.openMenu();
      }
    });

    /* ---------------------------------------------------------------- */
    /*  Frame loop                                                       */
    /* ---------------------------------------------------------------- */

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);

    const timer = new THREE.Timer();
    timer.connect(document);
    let frames = 0;
    let fpsAccum = 0;
    let fps = 0;

    renderer.setAnimationLoop((timeMs) => {
      timer.update(timeMs);
      const dt = Math.min(timer.getDelta(), 0.05);
      const elapsed = timer.getElapsed();

      world.update(dt, elapsed);
      shop.update(dt, elapsed);
      rig.update(dt, elapsed);
      if (shiftOpen) session.update(dt, elapsed);
      renderer.render(scene, camera);

      frames += 1;
      fpsAccum += dt;
      if (fpsAccum >= 0.5) {
        fps = frames / fpsAccum;
        hud.setFps(fps);
        frames = 0;
        fpsAccum = 0;
      }
    });

    window.__CHAYA_RUSH__ = {
      ready: true,
      THREE,
      renderer,
      scene,
      camera,
      rig,
      world,
      shop,
      hud,
      session,
      start: beginGame,
      skipIntro: () => {
        rig.skipScript();
        shiftOpen = true;
      },
      getState: () => session.getState(),
      getFps: () => fps,
      forceRain: (on) => world.weather.forceRain(on),
      spawn: (opts = {}) => session.customers.spawn(opts),
      selectById: (id) => session.selectById(id),
      prepare: (lineId) => session.prepare(session.selected, lineId),
      startCarry: () => session.startCarry(),
      give: () => session.give(),
      openBill: () => session.openBill(),
      payBill: () => session.payBill(),
      answerKidPrice: (customer, price) => session.answerKidPrice(customer, price),
    };
    document.body.dataset.chayaReady = "true";
    console.info("[ചായക്കട] ചായക്കട തയ്യാർ.");
  } catch (err) {
    console.error("[ചായക്കട] boot stack:", err && err.stack ? err.stack : err);
    hud.showError(UI.errorText);
  }
}

boot();
