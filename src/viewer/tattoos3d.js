import * as THREE from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { project, subscribe, updateTattoo, selectTattoo } from "../state.js";

export function initTattoos3D(scene, camera, renderer, bodyModel, controls) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const textureLoader = new THREE.TextureLoader();

  const bodyMeshes = [];
  const decals = new Map();
  const textures = new Map();
  let selectionBox = null;

  const canvas = renderer.domElement;

  let pointerStart = null;
  let draggingId = null;
  let renderVersion = 0;

  bodyModel.updateMatrixWorld(true);

  bodyModel.traverse((object) => {
    if (object.isMesh && !object.isSkinnedMesh) {
      bodyMeshes.push(object);
    }
  });

  function getTexture(src) {
    if (!textures.has(src)) {
      const promise = new Promise((resolve, reject) => {
        textureLoader.load(
          src,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            resolve(texture);
          },
          undefined,
          reject,
        );
      });

      textures.set(src, promise);
    }

    return textures.get(src);
  }

  function clearDecals() {
    if (selectionBox) {
      scene.remove(selectionBox);
      selectionBox.dispose();
      selectionBox = null;
    }

    for (const decal of decals.values()) {
      scene.remove(decal);
      decal.geometry.dispose();
      decal.material.dispose();
    }

    decals.clear();
  }

  async function renderTattoos() {
    const version = ++renderVersion;

    clearDecals();

    for (const tattoo of project.tattoos) {
      if (version !== renderVersion) return;

      if (!tattoo.placed || !tattoo.visible) continue;

      const mesh = bodyMeshes[tattoo.meshIndex];
      if (!mesh || !tattoo.image) continue;

      let texture;

      try {
        texture = await getTexture(tattoo.image);
      } catch (error) {
        console.error("Błąd tekstury:", error);
        continue;
      }

      if (version !== renderVersion) return;

      const position = new THREE.Vector3(...tattoo.position);
      const normal = new THREE.Vector3(...tattoo.normal).normalize();

      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal,
      );

      quaternion.multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          THREE.MathUtils.degToRad(tattoo.rotation),
        ),
      );

      const orientation = new THREE.Euler().setFromQuaternion(quaternion);

      const width = tattoo.sizeCm / 100;

      const aspect = texture.image.width / texture.image.height || 1;

      const geometry = new DecalGeometry(
        mesh,
        position,
        orientation,
        new THREE.Vector3(width, width / aspect, Math.max(0.05, width * 0.5)),
      );

      if (tattoo.mirrored) {
        const uv = geometry.getAttribute("uv");

        for (let i = 0; i < uv.count; i++) {
          uv.setX(i, 1 - uv.getX(i));
        }

        uv.needsUpdate = true;
      }

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: tattoo.opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        side: THREE.DoubleSide,
      });

      const decal = new THREE.Mesh(geometry, material);

      decal.userData.tattooId = tattoo.id;
      decal.renderOrder = 1;

      scene.add(decal);
      decals.set(tattoo.id, decal);

      if (tattoo.id === project.selectedId) {
        selectionBox = new THREE.BoxHelper(decal, 0xc9a96e);

        selectionBox.renderOrder = 10;

        scene.add(selectionBox);
      }
    }
  }

  function setPointer(event) {
    const rect = canvas.getBoundingClientRect();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;

    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
  }

  function findTattoo(event) {
    setPointer(event);

    const hits = raycaster.intersectObjects([...decals.values()], false);

    if (!hits.length) return null;

    return hits[0].object.userData.tattooId;
  }

  function findBody(event) {
    setPointer(event);

    const hits = raycaster.intersectObjects(bodyMeshes, false);

    return hits[0] || null;
  }

  function placeTattoo(tattooId, hit) {
    if (!hit || !hit.face) return;

    const meshIndex = bodyMeshes.indexOf(hit.object);
    if (meshIndex === -1) return;

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(
      hit.object.matrixWorld,
    );

    const normal = hit.face.normal
      .clone()
      .applyMatrix3(normalMatrix)
      .normalize();

    updateTattoo(tattooId, {
      placed: true,
      meshIndex,
      position: hit.point.toArray(),
      normal: normal.toArray(),
    });
  }

  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;

      pointerStart = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      };

      const tattooId = findTattoo(event);

      if (!tattooId) return;

      const tattoo = project.tattoos.find((t) => t.id === tattooId);

      if (!tattoo) return;

      selectTattoo(tattooId);

      if (tattoo.locked) return;

      draggingId = tattooId;
      controls.enabled = false;
      canvas.style.cursor = "move";
    },
    true,
  );

  canvas.addEventListener("pointermove", (event) => {
    if (!draggingId || !pointerStart) return;
    if (event.pointerId !== pointerStart.id) return;

    const hit = findBody(event);

    if (hit) {
      placeTattoo(draggingId, hit);
    }
  });

  function endPointer(event) {
    if (!pointerStart) return;
    if (event.pointerId !== pointerStart.id) return;

    const moved = Math.hypot(
      event.clientX - pointerStart.x,
      event.clientY - pointerStart.y,
    );

    const wasDragging = draggingId !== null;

    draggingId = null;
    pointerStart = null;

    controls.enabled = true;
    canvas.style.cursor = "";

    if (wasDragging) return;

    if (moved > 5) return;

    const clickedTattoo = findTattoo(event);

    if (clickedTattoo) {
      selectTattoo(clickedTattoo);
      return;
    }

    const tattoo = project.tattoos.find((t) => t.id === project.selectedId);

    if (!tattoo || tattoo.placed || tattoo.locked) return;

    const hit = findBody(event);

    if (hit) {
      placeTattoo(tattoo.id, hit);
    }
  }

  canvas.addEventListener("pointerup", endPointer);

  canvas.addEventListener("pointercancel", (event) => {
    if (pointerStart?.id !== event.pointerId) return;

    draggingId = null;
    pointerStart = null;
    controls.enabled = true;
    canvas.style.cursor = "";
  });

  subscribe(renderTattoos);
  renderTattoos();
}
