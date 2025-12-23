// ================= IMPORT =================
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// ================= RENDERER =================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ================= SCENE =================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b2b2b);

// ================= CAMERA =================
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// ================= LIGHT =================
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(20, 30, 10);
sun.castShadow = true;
scene.add(sun);

const floorLight = new THREE.DirectionalLight(0xffffff, 0.6);
floorLight.position.set(0, 15, 0);
scene.add(floorLight);

// ================= TEXTURE PARKIR =================
const texLoader = new THREE.TextureLoader();
const parkingTexture = await texLoader.loadAsync('./img/carpet/parkir.png');

parkingTexture.colorSpace = THREE.SRGBColorSpace;
parkingTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
parkingTexture.wrapS = THREE.ClampToEdgeWrapping;
parkingTexture.wrapT = THREE.ClampToEdgeWrapping;

// ================= MATERIAL LANTAI =================
const parkingMaterial = new THREE.MeshStandardMaterial({
  map: parkingTexture,
  roughness: 0.85,
  metalness: 0.0
});

// ================= FLOOR =================
const parkingFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  parkingMaterial
);
parkingFloor.rotation.x = -Math.PI / 2;
parkingFloor.receiveShadow = true;
scene.add(parkingFloor);


// ================= TARGET PARKIR (PAS SLOT BESAR) =================
const target = new THREE.Mesh(
  new THREE.BoxGeometry(3.5, 0.05, 7.5),
  new THREE.MeshStandardMaterial({
    color: 0x00ff00,
  
  })
);

target.position.set(6, 0.02, -7.2);
scene.add(target);

// ================= GLOBAL =================
let car;
let wheels = [];
let suspensionTime = 0;
let parkingSuccess = false;
const keys = {};

// ================= CAMERA SETTING =================
let camYaw = 0;
const camDistance = 4.5;
const camHeight = 2.2;

// ================= DRACO + GLTF =================
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// ================= LOAD MOBIL =================
loader.load('model/ferrari.glb', (gltf) => {
  car = gltf.scene;

  car.scale.set(1.1, 1.1, 1.1);
  car.position.set(0, 0.05, 10);
  car.rotation.y = Math.PI;

  car.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
    if (
      child.name.toLowerCase().includes('wheel') 
    ) {
      wheels.push(child);
    }
  });

  scene.add(car);
});

// ================= INPUT =================
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// ================= MOUSE CAMERA =================
let mouseDown = false;
window.addEventListener('mousedown', () => mouseDown = true);
window.addEventListener('mouseup', () => mouseDown = false);
window.addEventListener('mousemove', (e) => {
  if (!mouseDown) return;
  camYaw -= e.movementX * 0.003;
});

// ================= MOBIL CONTROL =================
const speed = 0.15;
const rotateSpeed = 0.035;
const baseCarHeight = 0.05;

function updateCar() {
  if (!car || parkingSuccess) return;

  let moving = false;

  if (keys['w']) { car.translateZ(-speed); moving = true; }
  if (keys['s']) { car.translateZ(speed); moving = true; }
  if (keys['a']) car.rotation.y += rotateSpeed;
  if (keys['d']) car.rotation.y -= rotateSpeed;

  if (moving) {
    wheels.forEach(w => w.rotation.x -= speed * 3);
    suspensionTime += 0.15;
    car.position.y = baseCarHeight + Math.sin(suspensionTime) * 0.01;
  } else {
    car.position.y = THREE.MathUtils.lerp(car.position.y, baseCarHeight, 0.1);
  }
}

// ================= CAMERA UPDATE =================
function updateCamera() {
  if (!car) return;

  const camX = Math.sin(camYaw) * camDistance;
  const camZ = Math.cos(camYaw) * camDistance;

  camera.position.lerp(
    new THREE.Vector3(
      car.position.x + camX,
      car.position.y + camHeight,
      car.position.z + camZ
    ),
    0.1
  );

  camera.lookAt(car.position.x, car.position.y + 1, car.position.z);
}

// ================= CEK PARKIR =================
function checkParking() {
  if (!car || parkingSuccess) return;

  const distance = car.position.distanceTo(target.position);
  const angle = Math.abs(
    THREE.MathUtils.euclideanModulo(car.rotation.y, Math.PI * 2)
  );

  if (distance < 1.5 && angle < 0.4) {
    parkingSuccess = true;
    setTimeout(() => {
      alert('🎉 PARKING SUCCESS!');
      window.location.reload();
    }, 300);
  }
}

// ================= LOOP =================
function animate() {
  requestAnimationFrame(animate);
  updateCar();
  updateCamera();
  checkParking();
  renderer.render(scene, camera);
}
animate();

// ================= RESIZE =================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
