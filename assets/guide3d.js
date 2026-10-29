/* Tess in 3D: the VRoid bust shown in the guide panel (loaded by assets/guide.js on first open).
   three.js + three-vrm come through the import map in index.html (assets/vendor/, copied by the build); the model is guide/tess.glb (VRM 0.x).
   The mouth follows the voice level guide.js passes in; blink, breathing and head sway keep her alive between lines.
   Any failure (no WebGL, no network, bad model) rejects mount(), and guide.js keeps the neon avatar. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

export async function mount(stage, { reduceMotion }) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  // small canvas, capped density: smooth frames matter more than pixels here
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 20);
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x30285a, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1.2, 2, 2.5); scene.add(key);
  const rimA = new THREE.DirectionalLight(0x22d3a6, 1.4); rimA.position.set(-2, 1.6, -1.5); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0x7c5cff, 1.2); rimB.position.set(2, 1.2, -1.5); scene.add(rimB);

  const loader = new GLTFLoader();
  loader.register((p) => new VRMLoaderPlugin(p));
  const gltf = await loader.loadAsync('guide/tess.glb');
  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error('guide/tess.glb is not a VRM model');
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.rotateVRM0(vrm); // VRM 0.x faces -z
  scene.add(vrm.scene);

  const bone = (n) => vrm.humanoid.getNormalizedBoneNode(n);
  const head = bone('head');
  // relaxed arms instead of the T-pose
  bone('leftUpperArm').rotation.z = 1.2; bone('rightUpperArm').rotation.z = -1.2;
  bone('leftLowerArm').rotation.z = 0.15; bone('rightLowerArm').rotation.z = -0.15;
  // chest-up bust: from just above the hair to mid-chest; the eyes follow the camera
  vrm.scene.updateMatrixWorld(true);
  // hair physics starts from this pose, not from the T-pose it was loaded in
  vrm.update(0);
  vrm.springBoneManager?.setInitState();
  vrm.springBoneManager?.reset();
  const hy = head.getWorldPosition(new THREE.Vector3()).y;
  camera.position.set(0, hy + 0.01, 1.45);
  camera.lookAt(0, hy - 0.02, 0);
  if (vrm.lookAt) vrm.lookAt.target = camera;

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = stage;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  stage.append(canvas);
  resize();

  const em = vrm.expressionManager;
  const timer = new THREE.Timer();
  let level = 0, talking = false, mouth = 0, t = 0, nextBlink = 1.5, blinkT = -1;

  function tick() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    t += dt;
    // mouth: open with the voice, with a little shape change so it is not one flat flap
    mouth += (level - mouth) * Math.min(1, dt * 18);
    em.setValue('aa', mouth * 0.9);
    em.setValue('oh', mouth * 0.35 * (0.5 + 0.5 * Math.sin(t * 11)));
    em.setValue('ih', mouth * 0.25 * (0.5 + 0.5 * Math.sin(t * 7 + 1)));
    em.setValue('relaxed', talking ? 0.15 : 0.35);
    // blink every 2–5 s
    if (t > nextBlink && blinkT < 0) blinkT = 0;
    if (blinkT >= 0) {
      blinkT += dt;
      em.setValue('blink', blinkT < 0.08 ? blinkT / 0.08 : Math.max(0, 1 - (blinkT - 0.08) / 0.1));
      if (blinkT > 0.18) { blinkT = -1; nextBlink = t + 2 + Math.random() * 3; }
    }
    // breathe and sway (still under reduced motion), nod a little with the voice
    const m = reduceMotion() ? 0 : 1;
    bone('chest').rotation.x = Math.sin(t * 1.6) * 0.015 * m;
    bone('spine').rotation.z = Math.sin(t * 0.7) * 0.02 * m;
    head.rotation.y = Math.sin(t * 0.5) * 0.08 * m;
    head.rotation.x = (Math.sin(t * 0.9) * 0.025 + mouth * 0.04) * m;
    head.rotation.z = Math.sin(t * 0.37) * 0.04 * m;
    // hair physics in small fixed steps: one big step on a slow frame throws the hair out
    const steps = Math.ceil(dt / (1 / 60));
    for (let i = 0; i < steps; i++) vrm.update(dt / steps);
    renderer.render(scene, camera);
  }

  return {
    /** Voice level 0..1 for this frame, and whether a line is being spoken. */
    set(lvl, isTalking) { level = lvl; talking = isTalking; },
    start() { timer.reset?.(); renderer.setAnimationLoop(tick); },
    stop() { renderer.setAnimationLoop(null); },
    dispose() { ro.disconnect(); renderer.setAnimationLoop(null); renderer.dispose(); VRMUtils.deepDispose(vrm.scene); canvas.remove(); },
  };
}
