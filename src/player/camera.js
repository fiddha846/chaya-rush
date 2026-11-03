import * as THREE from "three";
import { OWNER_EYE } from "../config/layout.js";
import { C, mat, addCyl, addCapsule, addSphere, addTorus } from "../world/art.js";
import { createFoodMesh } from "../world/people.js";

/**
 * Camera rig for the chaiwala.
 *
 * - seat:            free look from behind the counter.
 * - intro:           exterior establishing shot drifting in to the seat.
 * - carry / return:  first-person walk to a customer with a tray in hand.
 *
 * The tray and forearms live in camera space, so they always sit at the bottom
 * of the frame exactly like first-person hands.
 */

const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * Sample a Catmull-Rom curve defensively. Three's centripetal variant can
 * throw at the exact endpoints for very short or repeated point lists, and a
 * camera crash is not worth the elegance — fall back to a straight segment.
 */
function sampleCurve(curve, t, target) {
  const pts = curve.points;
  if (!pts.length) return target.set(0, 0, 0);
  if (pts.length === 1 || t <= 0) return target.copy(pts[0]);
  if (t >= 1) return target.copy(pts[pts.length - 1]);
  try {
    return curve.getPointAt(t, target);
  } catch {
    const span = t * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(span));
    return target.copy(pts[i]).lerp(pts[i + 1], span - i);
  }
}

export class CameraRig {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;

    this.mode = "seat";
    this.seatPos = OWNER_EYE.clone();
    this.seatYaw = 0;
    this.seatPitch = -0.035;
    this.yaw = this.seatYaw;
    this.pitch = this.seatPitch;
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
    this.sensitivity = 0.0025;
    this.keySpeed = 1.5;
    this.damping = 14;

    this.dragging = false;
    this.pointerId = null;
    this.lastX = 0;
    this.lastY = 0;
    this.pressX = 0;
    this.pressY = 0;
    this.dragDistance = 0;

    this.keys = new Set();
    this.elapsed = 0;

    this.script = null;
    this.tray = buildTray();
    this.camera.add(this.tray.group);
    this.tray.group.visible = false;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onDoubleClick = this._onDoubleClick.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    this.dom.addEventListener("pointerdown", this._onPointerDown);
    this.dom.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
    window.addEventListener("pointercancel", this._onPointerUp);
    this.dom.addEventListener("dblclick", this._onDoubleClick);
    this.dom.addEventListener("contextmenu", this._onContextMenu);
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);

    this.applySeat();
  }

  get pointerLocked() {
    return document.pointerLockElement === this.dom;
  }

  get isBusy() {
    return this.mode !== "seat";
  }

  get isCarrying() {
    return this.mode === "carrying";
  }

  get hasTray() {
    return this.tray.group.visible;
  }

  /* ------------------------------------------------------------------ */
  /*  Input                                                              */
  /* ------------------------------------------------------------------ */

  _onPointerDown(e) {
    if (this.mode !== "seat") return;
    if (this.pointerLocked) return;
    this.dragging = true;
    this.pointerId = e.pointerId;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.pressX = e.clientX;
    this.pressY = e.clientY;
    this.dragDistance = 0;
    try {
      this.dom.setPointerCapture?.(e.pointerId);
    } catch {
      /* synthetic test pointer */
    }
  }

  _onPointerMove(e) {
    if (this.mode !== "seat") return;
    if (this.pointerLocked) {
      this.targetYaw -= (e.movementX || 0) * this.sensitivity;
      this.targetPitch -= (e.movementY || 0) * this.sensitivity;
      this._clampPitch();
      return;
    }
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.dragDistance = Math.max(
      this.dragDistance,
      Math.hypot(e.clientX - this.pressX, e.clientY - this.pressY)
    );
    this.targetYaw -= dx * this.sensitivity;
    this.targetPitch -= dy * this.sensitivity;
    this._clampPitch();
  }

  _onPointerUp(e) {
    if (this.pointerId !== null && e.pointerId !== this.pointerId) return;
    this.dragging = false;
    this.pointerId = null;
  }

  _onDoubleClick() {
    if (this.mode !== "seat") return;
    if (this.pointerLocked) document.exitPointerLock?.();
    else this.dom.requestPointerLock?.();
  }

  _onKeyDown(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const watched = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "w", "a", "s", "d"];
    if (!watched.includes(k)) return;
    e.preventDefault();
    this.keys.add(k);
  }

  _onKeyUp(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    this.keys.delete(k);
  }

  _clampPitch() {
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch, -1.0, 0.72);
  }

  /* ------------------------------------------------------------------ */
  /*  Seat view                                                          */
  /* ------------------------------------------------------------------ */

  applySeat() {
    this.mode = "seat";
    this.script = null;
    this.tray.group.visible = false;
    this.yaw = this.seatYaw;
    this.pitch = this.seatPitch;
    this.targetYaw = this.seatYaw;
    this.targetPitch = this.seatPitch;
    this.camera.position.copy(this.seatPos);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  /** Reset to the owner's seat (used on a fresh shift). */
  reset() {
    this.applySeat();
  }

  /** The dusk exterior seen behind the start screen. */
  showExterior() {
    this.mode = "preview";
    this.script = null;
    this.tray.group.visible = false;
    this.camera.position.set(-9.0, 3.0, -15.0);
    this.camera.lookAt(0.2, 2.25, -5.4);
  }

  /** Jump to the end of the current scripted move (used by automated checks). */
  skipScript() {
    if (!this.script) return;
    const done = this.script.onDone;
    this.script = null;
    done?.();
  }

  /* ------------------------------------------------------------------ */
  /*  Scripted flights                                                   */
  /* ------------------------------------------------------------------ */

  playIntro(onDone) {
    const points = [
      new THREE.Vector3(-9.0, 3.0, -15.0),
      new THREE.Vector3(-6.4, 2.8, -12.4),
      new THREE.Vector3(-3.2, 2.45, -9.4),
      new THREE.Vector3(-0.8, 2.15, -7.0),
      new THREE.Vector3(0.35, 1.95, -5.2),
      new THREE.Vector3(0.4, 1.78, -2.6),
      new THREE.Vector3(0.35, 1.62, 0.4),
      OWNER_EYE.clone(),
    ];
    const look = [
      new THREE.Vector3(0.2, 2.25, -5.4),
      new THREE.Vector3(0.2, 2.2, -5.4),
      new THREE.Vector3(0.3, 2.0, -5.6),
      new THREE.Vector3(0.4, 1.75, -6.6),
      new THREE.Vector3(0.3, 1.45, -11.0),
      new THREE.Vector3(0.2, 1.25, -20.0),
      new THREE.Vector3(0.2, 1.2, -26.0),
      new THREE.Vector3(0.2, 1.18, -30.0),
    ];
    this._startScript({
      mode: "intro",
      points,
      look,
      duration: 7.4,
      onDone: () => {
        this.seatYaw = this.yaw;
        this.seatPitch = this.pitch;
        this.applySeat();
        onDone?.();
      },
    });
  }

  /**
   * Walk from the seat to a customer with a tray. `spot` is a layout spot,
   * `customer` supplies the final look target.
   */
  startCarry(spot, customer, items, onArrive) {
    const points = carryPath(spot);
    const end = customer
      ? new THREE.Vector3(customer.group.position.x, 1.22, customer.group.position.z)
      : (spot.serviceLook?.clone() ?? new THREE.Vector3(0, 1.2, -6));
    const start = new THREE.Vector3(0.2, 1.2, -12);
    const look = [
      start.clone(),
      start.clone(),
      new THREE.Vector3(
        (points[Math.min(points.length - 1, 3)].x + end.x) / 2,
        1.35,
        (points[Math.min(points.length - 1, 3)].z + end.z) / 2
      ),
      end.clone(),
      end.clone(),
    ];
    this._showTray(items);
    this._startScript({
      mode: "carry",
      points,
      look,
      duration: THREE.MathUtils.clamp(new THREE.CatmullRomCurve3(points).getLength() / 1.9, 2.2, 5.2),
      onDone: () => {
        this.mode = "carrying";
        this.script = null;
        onArrive?.();
      },
    });
  }

  /** Walk back to the seat, tray fading out. */
  returnToSeat(onDone) {
    if (this.mode === "seat") {
      onDone?.();
      return;
    }
    const from = this.camera.position.clone();
    const points = [
      from,
      new THREE.Vector3(from.x, 1.52, from.z + 0.4),
      new THREE.Vector3(2.8, 1.52, 0.6),
      new THREE.Vector3(3.05, 1.52, 3.2),
      OWNER_EYE.clone(),
    ];
    const look = [
      new THREE.Vector3(this.camera.position.x, 1.2, -12),
      new THREE.Vector3(0.3, 1.2, -12),
      new THREE.Vector3(0.2, 1.2, -14),
      new THREE.Vector3(0.2, 1.2, -18),
      new THREE.Vector3(0.2, 1.2, -24),
    ];
    this.tray.group.visible = false;
    this._startScript({
      mode: "return",
      points,
      look,
      duration: THREE.MathUtils.clamp(new THREE.CatmullRomCurve3(points).getLength() / 2.1, 1.8, 4.2),
      onDone: () => {
        this.applySeat();
        onDone?.();
      },
    });
  }

  _startScript({ mode, points, look, duration, onDone }) {
    this.mode = mode;
    this.dragging = false;
    this.script = {
      mode,
      curve: new THREE.CatmullRomCurve3(points, false, "centripetal"),
      lookCurve: new THREE.CatmullRomCurve3(look, false, "centripetal"),
      duration,
      t: 0,
      onDone,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Tray                                                               */
  /* ------------------------------------------------------------------ */

  _showTray(items = []) {
    this.tray.group.visible = true;
    this.tray.items.clear();
    const n = items.length;
    for (let i = 0; i < n; i++) {
      const item = items[i];
      if (!item) continue;
      const mesh = createFoodMesh(item.id, { scale: 0.88 });
      const col = n === 1 ? 0 : (i % 3) - 1;
      const row = n <= 3 ? 0 : Math.floor(i / 3) - 0.5;
      mesh.position.set(col * 0.15, 0.022, row * 0.14 + 0.02);
      mesh.rotation.y = (i / Math.max(1, n)) * Math.PI;
      this.tray.items.add(mesh);
    }
    this.tray.group.visible = true;
  }

  hideTray() {
    this.tray.group.visible = false;
    this.tray.items.clear();
  }

  /** Quick hand-over at the counter: the tray rises, then clears. */
  flashTray(items) {
    window.clearTimeout(this._trayTimer);
    this._showTray(items);
    this._trayTimer = window.setTimeout(() => {
      if (this.mode === "seat") this.hideTray();
    }, 1100);
  }

  /* ------------------------------------------------------------------ */
  /*  Frame update                                                      */
  /* ------------------------------------------------------------------ */

  update(dt, elapsed) {
    this.elapsed = elapsed;

    if (this.script) {
      const s = this.script;
      s.t = Math.min(1, s.t + dt / s.duration);
      const t = smoother(clamp01(s.t));
      sampleCurve(s.curve, t, this.camera.position);
      const look = sampleCurve(s.lookCurve, t, new THREE.Vector3());
      this.camera.lookAt(look);
      if (s.t >= 1) {
        const done = s.onDone;
        this.script = null;
        done?.();
      }
    } else if (this.mode === "seat") {
      const lookLeft = this.keys.has("ArrowLeft") || this.keys.has("a");
      const lookRight = this.keys.has("ArrowRight") || this.keys.has("d");
      const lookUp = this.keys.has("ArrowUp") || this.keys.has("w");
      const lookDown = this.keys.has("ArrowDown") || this.keys.has("s");

      if (lookLeft) this.targetYaw += this.keySpeed * dt;
      if (lookRight) this.targetYaw -= this.keySpeed * dt;
      if (lookUp) this.targetPitch += this.keySpeed * dt;
      if (lookDown) this.targetPitch -= this.keySpeed * dt;
      this._clampPitch();

      const alpha = 1 - Math.exp(-this.damping * dt);
      this.yaw += (this.targetYaw - this.yaw) * alpha;
      this.pitch += (this.targetPitch - this.pitch) * alpha;

      const bx = Math.sin(elapsed * 0.7) * 0.0035;
      const by = Math.sin(elapsed * 1.35) * 0.005;
      this.camera.position.set(this.seatPos.x + bx, this.seatPos.y + by, this.seatPos.z);
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
      this.camera.rotation.z = 0;
    } else if (this.mode === "carrying") {
      // Subtle handheld sway while waiting to hand the tray over.
      const sway = Math.sin(elapsed * 1.1) * 0.01;
      this.tray.group.position.x = sway;
      this.tray.group.position.y = -0.34 + Math.sin(elapsed * 1.7) * 0.006;
      this.tray.group.rotation.z = sway * 0.6;
    }

    // Tray bob while walking.
    if (this.mode === "carry" || this.mode === "return") {
      this.tray.group.position.y = -0.34 + Math.sin(elapsed * 8.5) * 0.012;
      this.tray.group.rotation.z = Math.sin(elapsed * 8.5) * 0.02;
    }
  }

  dispose() {
    this.dom.removeEventListener("pointerdown", this._onPointerDown);
    this.dom.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
    window.removeEventListener("pointercancel", this._onPointerUp);
    this.dom.removeEventListener("dblclick", this._onDoubleClick);
    this.dom.removeEventListener("contextmenu", this._onContextMenu);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  }
}

function carryPath(spot) {
  const eye = 1.5;
  const service = spot.service ?? new THREE.Vector3(0, 0, 0);
  if (spot.instantServe) {
    return [
      OWNER_EYE.clone(),
      new THREE.Vector3(OWNER_EYE.x, 1.52, OWNER_EYE.z - 0.4),
      new THREE.Vector3(service.x, eye, OWNER_EYE.z - 0.6),
    ];
  }

  if (spot.kind === "outside") {
    return [
      OWNER_EYE.clone(),
      new THREE.Vector3(3.1, eye, 3.2),
      new THREE.Vector3(3.1, eye, 0.7),
      new THREE.Vector3(2.8, eye, -2.0),
      new THREE.Vector3(2.45, eye, -4.25),
      new THREE.Vector3(service.x, eye, service.z + 0.2),
    ];
  }

  if ((spot.pos?.x ?? 0) > 3) {
    return [
      OWNER_EYE.clone(),
      new THREE.Vector3(3.1, eye, 3.2),
      new THREE.Vector3(3.1, eye, 0.8),
      new THREE.Vector3(3.05, eye, -0.9),
      new THREE.Vector3(2.7, eye, service.z),
      new THREE.Vector3(service.x, eye, service.z),
    ];
  }

  return [
    OWNER_EYE.clone(),
    new THREE.Vector3(3.1, eye, 3.2),
    new THREE.Vector3(3.1, eye, 0.8),
    new THREE.Vector3(2.6, eye, -1.0),
    new THREE.Vector3(0.4, eye, -2.2),
    new THREE.Vector3(service.x, eye, service.z),
  ];
}

function buildTray() {
  const group = new THREE.Group();
  group.position.set(0, -0.34, -0.62);
  group.renderOrder = 5;

  const trayMat = new THREE.MeshLambertMaterial({ color: "#c9a26a" });
  addCyl(group, 0.29, 0.29, 0.025, 22, trayMat, 0, 0, 0, { cast: false, receive: false });
  addTorus(group, 0.287, 0.016, mat("#9c7440"), 0, 0.014, 0, { rx: Math.PI / 2, cast: false });
  addTorus(group, 0.29, 0.008, mat("#e0c18c"), 0, 0.0, 0, { rx: Math.PI / 2, cast: false });

  // Two forearms reaching in from the bottom of the frame.
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.33, -0.27, 0.24);
    arm.rotation.x = -0.95;
    arm.rotation.z = side * 0.14;
    group.add(arm);
    addCapsule(arm, 0.062, 0.3, "#d9a870", 0, 0.08, 0, { capSeg: 6, radialSeg: 10, cast: false });
    addCapsule(arm, 0.078, 0.16, "#f0e6d2", 0, -0.16, 0, { capSeg: 6, radialSeg: 10, cast: false });
    addSphere(arm, 0.068, "#e2b98a", 0, 0.28, 0, { widthSeg: 12, heightSeg: 10, cast: false });
    addSphere(arm, 0.042, "#e2b98a", -side * 0.055, 0.3, 0.03, {
      widthSeg: 8,
      heightSeg: 6,
      cast: false,
    });
  }

  const items = new THREE.Group();
  group.add(items);

  return { group, items };
}
