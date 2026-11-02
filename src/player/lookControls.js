import * as THREE from "three";

/**
 * Seated look-around controls.
 *
 * The player is seated: the camera never translates. You can:
 *  - drag with mouse / touch to look
 *  - use arrow keys or WASD to look
 *  - double-click the canvas to toggle pointer lock (Esc releases)
 *
 * Yaw is free (you can glance behind at the street); pitch is clamped.
 */
export class LookControls {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.dom = domElement;

    this.sensitivity = options.sensitivity ?? 0.0026;
    this.keySpeed = options.keySpeed ?? 1.7; // radians / second
    this.damping = options.damping ?? 16;
    this.pitchMin = options.pitchMin ?? THREE.MathUtils.degToRad(-58);
    this.pitchMax = options.pitchMax ?? THREE.MathUtils.degToRad(52);

    this.basePosition = camera.position.clone();

    // Seed from the camera's current orientation (set with lookAt in main.js).
    this.yaw = camera.rotation.y;
    this.pitch = camera.rotation.x;
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;

    this.dragging = false;
    this.pointerId = null;
    this.lastX = 0;
    this.lastY = 0;

    this.keys = new Set();
    this.elapsed = 0;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onDoubleClick = this._onDoubleClick.bind(this);
    this._onLockChange = this._onLockChange.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    this.dom.addEventListener("pointerdown", this._onPointerDown);
    this.dom.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
    window.addEventListener("pointercancel", this._onPointerUp);
    this.dom.addEventListener("dblclick", this._onDoubleClick);
    this.dom.addEventListener("contextmenu", this._onContextMenu);
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    document.addEventListener("pointerlockchange", this._onLockChange);
  }

  get pointerLocked() {
    return document.pointerLockElement === this.dom;
  }

  _onPointerDown(e) {
    if (this.pointerLocked) return;
    this.dragging = true;
    this.pointerId = e.pointerId;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    try {
      this.dom.setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic events (tests) have no active pointer to capture.
    }
  }

  _onPointerMove(e) {
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
    if (this.pointerLocked) {
      document.exitPointerLock?.();
    } else {
      this.dom.requestPointerLock?.();
    }
  }

  _onLockChange() {
    // Keep targets stable when locking/unlocking.
    this.lastX = 0;
    this.lastY = 0;
  }

  _onKeyDown(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const watched = [
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "w", "a", "s", "d",
    ];
    if (!watched.includes(k)) return;
    // Only prevent scrolling/navigation for our own keys.
    e.preventDefault();
    this.keys.add(k);
  }

  _onKeyUp(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    this.keys.delete(k);
  }

  _clampPitch() {
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch, this.pitchMin, this.pitchMax);
  }

  update(dt, elapsed = 0) {
    this.elapsed = elapsed;

    const lookLeft = this.keys.has("ArrowLeft") || this.keys.has("a");
    const lookRight = this.keys.has("ArrowRight") || this.keys.has("d");
    const lookUp = this.keys.has("ArrowUp") || this.keys.has("w");
    const lookDown = this.keys.has("ArrowDown") || this.keys.has("s");

    if (lookLeft) this.targetYaw += this.keySpeed * dt;
    if (lookRight) this.targetYaw -= this.keySpeed * dt;
    if (lookUp) this.targetPitch += this.keySpeed * dt;
    if (lookDown) this.targetPitch -= this.keySpeed * dt;
    this._clampPitch();

    // Critically-damped-ish smoothing, frame-rate independent.
    const alpha = 1 - Math.exp(-this.damping * dt);
    this.yaw += (this.targetYaw - this.yaw) * alpha;
    this.pitch += (this.targetPitch - this.pitch) * alpha;

    // Subtle "breathing" so the seated view feels alive (very small).
    const bx = Math.sin(elapsed * 0.7) * 0.0035;
    const by = Math.sin(elapsed * 1.35) * 0.005;
    this.camera.position.set(
      this.basePosition.x + bx,
      this.basePosition.y + by,
      this.basePosition.z
    );

    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
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
    document.removeEventListener("pointerlockchange", this._onLockChange);
  }
}
