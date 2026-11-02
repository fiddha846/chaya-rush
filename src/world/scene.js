import * as THREE from "three";

/**
 * Renderer + baseline world (sky, street, lights).
 *
 * Art direction: SEMI-REALISTIC (owner decision 1:B).
 * Stage 1 uses aim high on lighting/mood, but all geometry is temporary.
 */

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

export function createWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x2a1c14, 0.022);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.08,
    160
  );
  // Seated eye height, near a table, facing the tea station.
  camera.position.set(3.0, 1.18, 2.7);
  camera.rotation.order = "YXZ";
  camera.lookAt(new THREE.Vector3(-0.6, 1.12, -2.8));

  addSky(scene);
  const lights = addLights(scene);
  addStreet(scene);

  return { scene, camera, lights };
}

/* ------------------------------------------------------------------ */
/*  Sky: vertical dusk gradient on an inward-facing sphere.            */
/* ------------------------------------------------------------------ */
function addSky(scene) {
  const uniforms = {
    topColor: { value: new THREE.Color(0x1d2b4d) },
    midColor: { value: new THREE.Color(0x8a4a63) },
    bottomColor: { value: new THREE.Color(0xff9d5c) },
    offset: { value: 0.08 },
    exponent: { value: 0.85 },
  };

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos + vec3(0.0, offset, 0.0)).y;
        float up = pow(clamp(h, 0.0, 1.0), exponent);
        float down = pow(clamp(-h, 0.0, 1.0), 0.6);
        vec3 col = mix(bottomColor, midColor, smoothstep(0.0, 0.45, h));
        col = mix(col, topColor, up);
        col = mix(col, bottomColor * 0.35, down);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 20), skyMat);
  sky.name = "sky";
  sky.frustumCulled = false;
  scene.add(sky);
}

/* ------------------------------------------------------------------ */
/*  Lights                                                             */
/* ------------------------------------------------------------------ */
function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x24150e, 0.45);
  scene.add(hemi);

  // Warm sunset key light coming from the street side.
  const sun = new THREE.DirectionalLight(0xffb26b, 2.4);
  sun.position.set(9, 11, 13);
  sun.target.position.set(0, 1, -1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 45;
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // Cool dusk fill from the open front, so shadows are not pure black.
  const fill = new THREE.DirectionalLight(0x7f9fd0, 0.55);
  fill.position.set(-6, 5, 10);
  fill.target.position.set(0, 1.2, -2);
  scene.add(fill, fill.target);

  // General warm interior bounce. Cheap on this scene and keeps the room from
  // going flat/dark now that the shadow map is baked.
  const bounce = new THREE.PointLight(0xffa552, 6, 12, 2);
  bounce.position.set(0, 2.55, 0.2);
  scene.add(bounce);

  return { hemi, sun, fill, bounce };
}

/* ------------------------------------------------------------------ */
/*  Street outside the shop front                                     */
/* ------------------------------------------------------------------ */
function addStreet(scene) {
  const street = new THREE.Group();
  street.name = "street";

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x2b221c,
    roughness: 0.96,
    metalness: 0.02,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.03, 22);
  ground.receiveShadow = true;
  street.add(ground);

  // A slightly lighter footpath strip right outside the shop.
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0x3a2c22,
    roughness: 0.9,
  });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.5), pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, -0.02, 6.4);
  path.receiveShadow = true;
  street.add(path);

  // Distant tree silhouettes (placeholders).
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x14241a, roughness: 1 });
  const treeSpots = [
    [-9, 14, 4.4],
    [10, 17, 5.2],
    [-13, 22, 4.0],
    [14, 24, 3.6],
  ];
  for (const [x, z, scale] of treeSpots) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16 * scale, 0.24 * scale, 3.2 * scale, 7),
      trunkMat
    );
    trunk.position.y = 1.6 * scale;
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(1.5 * scale, 3.2 * scale, 8),
      leafMat
    );
    crown.position.y = 4.2 * scale;
    tree.add(trunk, crown);
    tree.position.set(x, 0, z);
    street.add(tree);
  }

  // Street lamp with a warm pool of light.
  const lamp = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: 0x161311,
    roughness: 0.6,
    metalness: 0.5,
  });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 5.2, 10), metal);
  post.position.y = 2.6;
  post.castShadow = true;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), metal);
  arm.rotation.z = Math.PI / 2.2;
  arm.position.set(0.42, 5.05, 0);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffd6a0,
      emissive: 0xffa64d,
      emissiveIntensity: 2.4,
      roughness: 0.4,
    })
  );
  head.position.set(0.8, 5.15, 0);
  // Small warm pool on the footpath outside.
  const lampLight = new THREE.PointLight(0xffb066, 18, 16, 2);
  lampLight.position.set(0.8, 5.0, 0);
  lamp.add(post, arm, head, lampLight);
  lamp.position.set(-5.8, 0, 7.5);
  street.add(lamp);

  scene.add(street);
}
