import * as dat from "lil-gui";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
// import { LoadingManager } from "three";
import firefliesVertexShader from "./shaders/fireflies/vertex.glsl";
import firefliesFragmentShader from "./shaders/fireflies/fragment.glsl";
import portalVertexShader from "./shaders/portal/vertex.glsl";
import portalFragmentShader from "./shaders/portal/fragment.glsl";

/**
 * Base
 */
// Debug
const debugObject = {};
const gui = new dat.GUI({
  width: 400,
});

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
let areaLightLoaded = false;
const preloaderElement = document.querySelector(".preloader");
const canvasElement = document.querySelector("canvas");

const loadingManager = new THREE.LoadingManager(
  // loaded
  () => {
    if (areaLightLoaded) {
    }
    const loadingInterval = setInterval(() => {
      if (areaLightLoaded) {
        console.log("LOADED");
        window.dispatchEvent(new Event("resize"));
        canvasElement.style.display = "block";
        preloaderElement.style.display = "none";
        clearInterval(loadingInterval);
      } else {
        console.log("Where's the light?");
      }
    }, 3000);
  },
  // progress
  () => {
    console.log("PROGRESS");
    canvasElement.style.display = "none";
  }
);

// Texture loader
const textureLoader = new THREE.TextureLoader(loadingManager);

// Draco loader
const dracoLoader = new DRACOLoader(loadingManager);
dracoLoader.setDecoderPath("draco/");

// GLTF loader
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Textures
 */
const bakedTexture = textureLoader.load("baked-extra.jpg");
// y-coords are inverted, flip to mirror vertically
bakedTexture.flipY = false;
bakedTexture.encoding = THREE.sRGBEncoding;

/**
 * Materials
 */
const lampColor = new THREE.Color("hsla(37, 69%, 81%, 1)");
const poleLightMaterial = new THREE.MeshBasicMaterial({ color: lampColor });
poleLightMaterial.side = THREE.DoubleSide;

const portalColor = new THREE.Color("hsla(157, 100%, 94%, 1)");
// const portalLightMaterial = new THREE.MeshBasicMaterial({ color: portalColor });
const portalLightMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColorStart: { value: new THREE.Color(0xcca3a3) },
    uColorEnd: { value: new THREE.Color(0x7659a1) },
  },
  vertexShader: portalVertexShader,
  fragmentShader: portalFragmentShader,
});
portalLightMaterial.side = THREE.DoubleSide;

debugObject.portalColorStart = "#b2aada";
debugObject.portalColorEnd = "#ffbb00";

gui.addColor(debugObject, "portalColorStart").onChange(() => {
  portalLightMaterial.uniforms.uColorStart.value.set(
    debugObject.portalColorStart
  );
});

gui.addColor(debugObject, "portalColorEnd").onChange(() => {
  portalLightMaterial.uniforms.uColorEnd.value.set(debugObject.portalColorEnd);
});

const light = new THREE.AmbientLight(0x404040); // soft white light
scene.add(light);

// Baked material
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture });

gltfLoader.load("portal-normalized2.glb", (gltf) => {
  let poleLightAMesh;
  let poleLightBMesh;
  let portalLightMesh;

  gltf.scene.traverse((child) => {
    // console.log(child.name);

    child.material = bakedMaterial;
    if (child.name === "Area") {
      // console.log("area light loaded");
      areaLightLoaded = true;
    }

    if (child.name === "portalLight") portalLightMesh = child;
    if (child.name === "poleLightA") poleLightAMesh = child;
    if (child.name === "poleLightB") poleLightBMesh = child;
  });
  scene.add(gltf.scene);

  portalLightMesh.material = portalLightMaterial;
  poleLightAMesh.material = poleLightMaterial;
  poleLightBMesh.material = poleLightMaterial;
});

/**
 * Object
 */
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial()
);

// scene.add(cube);

/**
 * Fireflies
 */
// Geometry
const firefliesGeometry = new THREE.BufferGeometry();
const firefliesCount = 40;
const positionArray = new Float32Array(firefliesCount * 3);
const scaleArray = new Float32Array(firefliesCount);

for (let i = 0; i < firefliesCount; i++) {
  positionArray[i * 3 + 0] = (Math.random() - 0.5) * 4;
  positionArray[i * 3 + 1] = Math.random() * 1.5 * 4;
  positionArray[i * 3 + 2] = (Math.random() - 0.5) * 4;

  scaleArray[i] = Math.random();
}

firefliesGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positionArray, 3)
);

firefliesGeometry.setAttribute(
  "aScale",
  new THREE.BufferAttribute(scaleArray, 1)
);

// const firefliesMaterial = new THREE.PointsMaterial({
//   size: 0.1,
//   sizeAttenuation: true,
// });
const firefliesMaterial = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uSize: { value: 168 },
    uTime: { value: 0 },
  },
  vertexShader: firefliesVertexShader,
  fragmentShader: firefliesFragmentShader,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial);

scene.add(fireflies);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Update fireflies
  firefliesMaterial.uniforms.uPixelRatio.value = Math.min(
    window.devicePixelRatio,
    2
  );
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.x = -5;
camera.position.y = 4;
camera.position.z = -5;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

debugObject.clearColor = "#544054";
renderer.setClearColor(debugObject.clearColor);
gui
  .addColor(debugObject, "clearColor")
  .onChange(() => renderer.setClearColor(debugObject.clearColor));
gui
  .add(firefliesMaterial.uniforms.uSize, "value")
  .min(0)
  .max(500)
  .step(1)
  .name("firefliesSize");

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // Update materials
  firefliesMaterial.uniforms.uTime.value = elapsedTime;
  portalLightMaterial.uniforms.uTime.value = elapsedTime;

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
gui.close();
