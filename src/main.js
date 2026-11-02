import * as THREE from "three";
import { createRenderer, createWorld } from "./world/scene.js";
import { buildShop } from "./world/shop.js";
import { LookControls } from "./player/lookControls.js";
import { GameSession } from "./game/session.js";
import { OrderOverlay } from "./ui/orders.js";
import {
  setLoadingStatus,
  hideLoading,
  showError,
  setFps,
  setRoundTime,
  setEarnings,
  setOrdersServed,
  setServeHint,
  setRoundActive,
  toast,
  showResults,
  hideResults,
} from "./ui/hud.js";

/**
 * CHAYA RUSH — Stage 2 entry point.
 * Boots the renderer, builds the interior, starts the seated look-around, then
 * opens a 60-second round of customers, Malayalam orders and serving.
 */

async function loadMalayalamFont() {
  if (!document.fonts) return;
  try {
    // Wait for the font used by canvas-drawn signs and DOM order cards so
    // shaping is correct on the first frame.
    await document.fonts.load('700 64px "Noto Sans Malayalam"', "ചായ");
    await document.fonts.load('600 34px "Noto Sans Malayalam"', "ചായ");
    await document.fonts.ready;
  } catch (err) {
    console.warn("[Chaya Rush] Malayalam font did not load; signs may fall back.", err);
  }
}

async function boot() {
  try {
    setLoadingStatus("Loading the shop…", 12);
    await loadMalayalamFont();

    setLoadingStatus("Warming the tea…", 40);

    const app = document.getElementById("app");
    if (!app) throw new Error("Missing #app container.");

    // Fail early with a readable message if WebGL is unavailable.
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2")) {
      throw new Error(
        "WebGL2 is not available in this browser. Enable hardware acceleration or use a current Chrome/Edge/Firefox."
      );
    }

    const renderer = createRenderer(app);
    const { scene, camera } = createWorld();

    setLoadingStatus("Arranging tables and lamps…", 68);
    const shop = buildShop({ scene, renderer });

    const controls = new LookControls(camera, renderer.domElement, {
      sensitivity: 0.0026,
      pitchMin: THREE.MathUtils.degToRad(-58),
      pitchMax: THREE.MathUtils.degToRad(52),
    });

    // The overlay's callbacks close over `session`, which is created below.
    let session = null;
    const overlay = new OrderOverlay({
      onSelect: (customer) => session?.select(customer),
      onServe: (itemId) => session?.serve(itemId),
    });

    session = new GameSession({
      scene,
      camera,
      overlay,
      hud: {
        setRoundTime,
        setEarnings,
        setOrdersServed,
        setServeHint,
        setRoundActive,
        toast,
        showResults,
        hideResults,
      },
    });

    // Clicking a customer in the 3D scene selects them. A small drag threshold
    // keeps look-around drags from counting as clicks.
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
      if (controls.pointerLocked) return;
      if (session.phase !== "running") return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);

      const customer = session.customers.pick(raycaster);
      session.select(customer);
    });

    document.getElementById("play-again")?.addEventListener("click", () => {
      hideResults();
      session.start();
    });

    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "r" && session.phase === "ended") {
        hideResults();
        session.start();
      }
    });

    setLoadingStatus("Lighting the lamps…", 90);

    // Render one frame before revealing the scene so there is no flash.
    // The sun and all shadow casters are static, so bake the shadow map once
    // instead of paying for a full shadow pass every frame.
    renderer.render(scene, camera);
    renderer.shadowMap.autoUpdate = false;

    // Give the browser two frames to present the baked image. In a background
    // or occluded tab requestAnimationFrame is throttled (or paused entirely),
    // so fall back to a timer rather than hanging the loading screen forever.
    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      window.setTimeout(finish, 800);
      requestAnimationFrame(() => requestAnimationFrame(finish));
    });

    setLoadingStatus("Ready", 100);
    hideLoading();
    session.start();

    const timer = new THREE.Timer();
    timer.connect(document);
    let frames = 0;
    let fpsAccum = 0;
    let fps = 0;

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);

    renderer.setAnimationLoop((timeMs) => {
      timer.update(timeMs);
      const dt = Math.min(timer.getDelta(), 0.05);
      const elapsed = timer.getElapsed();

      controls.update(dt, elapsed);
      shop.update(dt, elapsed);
      session.update(dt, elapsed);
      renderer.render(scene, camera);

      frames += 1;
      fpsAccum += dt;
      if (fpsAccum >= 0.5) {
        fps = frames / fpsAccum;
        setFps(fps);
        frames = 0;
        fpsAccum = 0;
      }
    });

    // Small debug handle for automated checks (not gameplay).
    window.__CHAYA_RUSH__ = {
      stage: 2,
      ready: true,
      THREE,
      renderer,
      scene,
      camera,
      controls,
      shop,
      session,
      overlay,
      getState: () => session.getState(),
      serve: (itemId) => session.serve(itemId),
      selectById: (id) => session.selectById(id),
      getFps: () => fps,
    };
    document.body.dataset.chayaReady = "true";
    console.info("[Chaya Rush] Stage 2 ready. Placeholder art.");
  } catch (err) {
    console.error("[Chaya Rush] boot stack:", err && err.stack ? err.stack : err);
    showError(err && err.message ? err.message : err);
  }
}

boot();
