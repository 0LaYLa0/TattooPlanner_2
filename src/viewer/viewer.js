import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { initTattoos3D } from "./tattoos3d.js";

export function initViewer() {
  const container = document.getElementById("viewer-container");

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
  camera.position.set(0, 1, 3.5);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;

  container.prepend(renderer.domElement);

  const ambientLight = new THREE.HemisphereLight(0xffffff, 0x777788, 2.5);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 3);
  mainLight.position.set(3, 5, 4);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
  fillLight.position.set(-3, 2, -4);
  scene.add(fillLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.minDistance = 0.4;
  controls.maxDistance = 8;

  const loader = new GLTFLoader();

  let defaultDistance = 3.5;
  let modelLoaded = false;

  loader.load(
    "/models/man.glb",
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      if (size.y <= 0) {
        console.error("Model ma nieprawidłowe wymiary.");
        return;
      }

      const scale = 1.8 / size.y;
      model.scale.multiplyScalar(scale);

      box.setFromObject(model);
      box.getCenter(center);

      model.position.sub(center);

      controls.target.set(0, 0, 0);

      const fittedBox = new THREE.Box3().setFromObject(model);
      const fittedSize = fittedBox.getSize(new THREE.Vector3());

      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov =
        2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);

      const distance =
        Math.max(
          fittedSize.y / (2 * Math.tan(verticalFov / 2)),
          fittedSize.x / (2 * Math.tan(horizontalFov / 2)),
        ) * 1.35;

      defaultDistance = distance;
      modelLoaded = true;

      camera.position.set(0, 0, distance);
      camera.near = 0.01;
      camera.far = Math.max(100, distance * 10);
      camera.updateProjectionMatrix();

      controls.update();
      initTattoos3D(scene, camera, renderer, model, controls);
      console.log("Model załadowany!", model);
    },
    undefined,
    (error) => {
      console.error("Nie udało się załadować man.glb:", error);
    },
  );

  const viewButtons = document.querySelectorAll(".view-buttons [data-view]");

  function changeView(view) {
    if (!modelLoaded) return;

    const distance = defaultDistance;

    const target = new THREE.Vector3(0, 0, 0);
    const position = new THREE.Vector3(0, 0, distance);

    switch (view) {
      case "arm":
        target.set(0.45, 0.35, 0);
        position.set(0.45, 0.35, distance * 0.35);
        break;

      case "back":
        position.set(0, 0, -distance);
        break;

      case "leg":
        target.set(0.18, -0.5, 0);
        position.set(0.18, -0.5, distance * 0.4);
        break;

      case "reset":
        position.set(0, 0, distance);
        break;
    }

    camera.position.copy(position);
    controls.target.copy(target);
    controls.update();
  }

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      changeView(button.dataset.view);
    });
  });

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}
