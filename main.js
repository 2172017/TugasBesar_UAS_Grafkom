import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();

/*JANGAN SENTUH!
/*SKYBOX (PNG)*/
const cubeTextureLoader = new THREE.CubeTextureLoader();
// scene.background = cubeTextureLoader.load([
//   '/skybox/px.png',
//   '/skybox/nx.png',
//   '/skybox/py.png',
//   '/skybox/ny.png',
//   '/skybox/pz.png',
//   '/skybox/nz.png'
// ]);

const skyTexture = cubeTextureLoader.load([
   '/skybox/px.png',
   '/skybox/nx.png',
   '/skybox/py.png',
   '/skybox/ny.png',
   '/skybox/pz.png',
   '/skybox/nz.png'
 ]);

const skyShader = THREE.ShaderLib.cube;
const skyMaterial = new THREE.ShaderMaterial({
  fragmentShader: skyShader.fragmentShader,
  vertexShader: skyShader.vertexShader,
  uniforms: THREE.UniformsUtils.clone(skyShader.uniforms),
  side: THREE.DoubleSide, // <--- INI KUNCINYA (Render Dalam & Luar)
  depthWrite: false       // Agar langit selalu di belakang objek lain
});

// Masukkan texture yang sudah di-load ke material
skyMaterial.uniforms.tCube.value = skyTexture;

// 3. Buat Kotak Raksasa untuk Langit
const skyBox = new THREE.Mesh(new THREE.BoxGeometry(1000, 1000, 1000), skyMaterial);
scene.add(skyBox);

/*CAMERA*/
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

/* --- TAMBAHAN: REAR CAMERA (KACA SPION) --- */
const rearCamera = new THREE.PerspectiveCamera(
   40, 
   2.5,
   0.1, 
   1000
 );

/*RENDERER*/
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// /*CONTROLS*/
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;
// controls.maxPolarAngle = Math.PI / 2.2;

/*MAU UBAH SOK DIMANGGA
/*LIGHTING*/
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
sunLight.position.set(10, 20, 10);
scene.add(sunLight);

/*JANGAN SENTUH!
/*FLOOR TEXTURE (FORMAT FILE AVIF - SINGLE IMAGE)*/
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load('/parking_space/parking-space.avif');
groundTexture.colorSpace = THREE.SRGBColorSpace;

/* ======================================================
   FLOOR (RATIO DIMENSI TEXTURE 1000x786 ≈ 1.27)
   Fungsi: Menampilkan lantai parkiran menggunakan
   1 texture utuh (tanpa repeat) agar sesuai citra asli
====================================================== */

/*
   MATERIAL LANTAI PARKIR
   - map        → texture lantai (aspal / parkiran)
   - roughness  → tingkat kekasaran permukaan
   - metalness  → tingkat reflektif logam

   LAMUN DIUBAH:
   - roughness kecil → lantai terlihat licin / basah
   - metalness besar → lantai tampak seperti logam */
const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  roughness: 1,
  metalness: 0,
  side: THREE.DoubleSide
});

/*
   GEOMETRY LANTAI (PLANE)
   PlaneGeometry(width, height)

   Rasio disesuaikan dengan texture:
   1000 / 786 ≈ 1.27

   76 x 60 dipilih agar:
   - texture tidak stretch
   - area parkir cukup luas
   - slot parkir pas di dalamnya

   LAMUN DIUBAH:
   - width lebih besar → lantai melebar ke samping
   - height lebih besar → lantai memanjang ke depan */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(76, 60), // rasio sesuai gambar
  groundMaterial
);

/*
   ROTASI LANTAI
   -Math.PI / 2 → memutar plane agar horizontal
   (default plane menghadap kamera)

   LAMUN DIUBAH / DIHAPUS:
   - lantai akan berdiri vertikal */
ground.rotation.x = -Math.PI / 2;

/*
   MENAMBAHKAN LANTAI KE SCENE */
scene.add(ground);


/*WES ORA PERLU DIUTAK-UTAK LAGI
/*PARKING SLOT CREATOR (ALIGNED TO TEXTURE)*/
function createParkingSlot(x, z, isObjective = false) {

  /*
     GEOMETRY SLOT PARKIR
     BoxGeometry(width, height, depth)

     width  = lebar slot (arah X / kiri-kanan)
     height = ketebalan slot (arah Y / atas-bawah)
     depth  = panjang slot (arah Z / depan-belakang)

     LAMUN DIUBAH:
     - width lebih besar  → slot melewati garis parkir
     - depth lebih besar  → slot terlalu panjang
     - height lebih besar → slot terlihat "mengambang"
 */
  const geometry = new THREE.BoxGeometry(2, 0.05, 4);

  /*
     MATERIAL SLOT PARKIR
     - Slot biasa: abu-abu
     - Slot objektif: hijau + emissive (glow)

     emissive = warna cahaya semu
     emissiveIntensity = seberapa kuat glow-nya

     LAMUN DIUBAH:
     - color → warna visual slot
     - emissive → warna glow
     - emissiveIntensity terlalu besar → slot terlalu silau
 */
  const material = new THREE.MeshStandardMaterial({
    color: isObjective ? 0x00ff00 : 0x555555,
    emissive: isObjective ? 0x00ff00 : 0x000000,
    emissiveIntensity: isObjective ? 1.5 : 0,
    side: THREE.DoubleSide
  });

  const slot = new THREE.Mesh(geometry, material);
  /*
     POSISI SLOT PARKIR
     x → posisi horizontal (kolom slot)
     z → posisi baris slot
     y = 0.03 → sedikit di atas lantai

     LAMUN DIUBAH:
     - y = 0 → slot bisa z-fighting dengan lantai
     - y terlalu besar → slot terlihat melayang
 */

  slot.position.set(x, 0.03, z);
  scene.add(slot);

  return slot;
}

/* ======================================================
   SLOT CONFIGURATION (MATCH TEXTURE)
   Konfigurasi tata letak slot parkir agar sejajar
   dengan marking pada texture lantai
====================================================== */

/*
   JUMLAH SLOT PER BARIS
   Menentukan berapa banyak slot parkir dalam 1 baris

   LAMUN DIUBAH:
   - lebih kecil → slot lebih sedikit
   - lebih besar → slot bisa keluar area texture */
const slotCount = 10;

/*
   JARAK ANTAR SLOT (ARAH X)
   Mengatur jarak kiri-kanan antar slot parkir

   LAMUN DIUBAH:
   - lebih kecil → slot saling berhimpitan
   - lebih besar → slot terlalu renggang / keluar garis */
const spacingX = 7;

/*
   POSISI BARIS ATAS (ARAH Z)
   Nilai positif = ke arah atas texture

   LAMUN DIUBAH:
   - terlalu besar → slot mendekati tepi lantai
   - terlalu kecil → slot masuk ke jalur tengah */
const rowTopZ = 7;

/*
   POSISI BARIS BAWAH (ARAH Z)
   Nilai negatif = ke arah bawah texture

   LAMUN DIUBAH:
   - terlalu besar (mendekati 0) → menabrak jalur
   - terlalu kecil → keluar area texture */
const rowBottomZ = -12;

/*
   INDEX SLOT OBJEKTIF
   Menentukan slot mana yang menjadi target utama
   (dimulai dari 0)

   Contoh:
   targetIndex = 0 → slot paling kiri
   targetIndex = 3 → slot tengah

   LAMUN DIUBAH:
   - objektif berpindah posisi */
const targetIndex = 3;

/*
   REFERENSI SLOT OBJEKTIF
   Disimpan agar:
   - bisa dianimasikan (pulsing)
   - bisa dicek status parkir nanti */
let targetSlot = null;


/* ======================================================
   TOP ROW (DECORATION)
   Baris slot parkir bagian atas
   Hanya sebagai visual / hiasan
   Tidak memiliki objektif
====================================================== */
for (let i = 0; i < slotCount; i++) {

  /*
     PERHITUNGAN POSISI X SLOT
     - i                     → index slot
     - (slotCount - 1) / 2   → memusatkan slot ke tengah
     - spacingX              → jarak antar slot

     LAMUN DIUBAH:
     - rumus diubah → slot tidak lagi simetris
     - spacingX diubah → jarak slot berubah
 */
  const x = (i - (slotCount - 1) / 2) * spacingX;

  /*
     MEMBUAT SLOT PARKIR
     - rowTopZ → posisi baris atas
     - false   → slot ini BUKAN objektif
 */
  createParkingSlot(x, rowTopZ, false);
}

/* ======================================================
   BOTTOM ROW (WITH OBJECTIVE)
   Baris slot parkir bagian bawah
   Mengandung 1 slot objektif (target)
====================================================== */
for (let i = 0; i < slotCount; i++) {

  /*
     PERHITUNGAN POSISI X SLOT
     (sama seperti baris atas agar sejajar)
 */
  const x = (i - (slotCount - 1) / 2) * spacingX;

  /*
     MENENTUKAN SLOT OBJEKTIF
     - true hanya LAMUN i === targetIndex

     LAMUN DIUBAH:
     - targetIndex berubah → posisi objektif pindah
 */
  const isObjective = i === targetIndex;

  /*
     MEMBUAT SLOT PARKIR
     - rowBottomZ → posisi baris bawah
     - isObjective → menentukan warna & glow
 */
  const slot = createParkingSlot(x, rowBottomZ, isObjective);

  /*
     MENYIMPAN REFERENSI SLOT OBJEKTIF
     Digunakan untuk:
     - animasi pulsing
     - logika parkir di tahap lanjut
 */
  if (isObjective) targetSlot = slot;
}

/* ======================================================
   CAR MODEL
====================================================== */

let playerCar = null;
let carWheels = []; // Array untuk menyimpan mesh roda

const gltfLoader = new GLTFLoader();
gltfLoader.load(
   'car_model/GLB format/sedan-sports.glb', // GANTI DENGAN NAMA FILE KAMU
   (gltf) => {
     playerCar = gltf.scene;
 
     /* 1. ATUR POSISI & UKURAN */
     // Kenney models biasanya hadap ke sumbu Z positif atau negatif, kita putar balik
     playerCar.rotation.y = Math.PI; 
     
     playerCar.position.set(0, 0, 16); // Posisi awal di aspal
     playerCar.scale.set(3, 3, 3); // Kenney models itu KECIL SEKALI (Low Poly), jadi harus di-scale besar
 
     /* 2. ENABLE BAYANGAN & CARI RODA */
     playerCar.traverse((child) => {
       if (child.isMesh) {
         child.castShadow = true;
         child.receiveShadow = true;

         if (child.material) {
            child.material.side = THREE.DoubleSide;
         }

         if (child.name.toLowerCase().includes('wheel')) {
            carWheels.push(child);
         }
         
         // Cek Nama Mesh untuk Roda (Debugging)
         // Buka Console Browser (F12) untuk melihat nama-nama bagian mobilmu
         console.log("Nama Bagian: ", child.name);
 
         // Kenney biasanya menamai roda dengan kata "wheel"
         if (child.name.toLowerCase().includes('wheel')) {
           carWheels.push(child);
         }
       }
     });
 
     scene.add(playerCar);
     console.log("Mobil Kenney berhasil dimuat!");
   },
   undefined,
   (error) => {
     console.error('Error loading car:', error);
   }
 );

/* ======================================================
   CAR CONTROLS & PHYSICS
   Variable untuk mengatur pergerakan mobil
====================================================== */

// Status tombol keyboard
const keys = {
   w: false,
   a: false,
   s: false,
   d: false
 };
 
 // Variabel Fisika Mobil
 let speed = 0;
 let maxSpeed = 0.10;       // Kecepatan maksimum
 let acceleration = 0.002;  // Seberapa cepat mobil ngegas
 let friction = 0.96;      // Seberapa cepat mobil berhenti (0-1)
 let turnSpeed = 0.02;     // Kecepatan belok
 
 // Event Listener untuk mendeteksi tombol ditekan
 window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
 
 // Event Listener untuk mendeteksi tombol dilepas
 window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

 function updateCarMovement() {
   if (!playerCar) return;
 
   // --- 1. LOGIKA GAS & REM ---
   if (keys.w) speed += acceleration;
   if (keys.s) speed -= acceleration;
 
   // Limit Kecepatan
   if (speed > maxSpeed) speed = maxSpeed;
   if (speed < -maxSpeed / 2) speed = -maxSpeed / 2;
 
   // --- 2. LOGIKA GESEKAN (FRICTION) & BERHENTI TOTAL ---
   if (!keys.w && !keys.s) {
     speed *= friction;
     
     // FIX: Kita naikkan ambang batas berhenti agar mobil tidak "meluncur" terlalu lama
     // Kalau speed sudah sangat kecil, langsung set 0 biar mobil diam total.
     if (Math.abs(speed) < 0.005) { 
       speed = 0;
     }
   }
 
   // Pindahkan Mobil
   playerCar.translateZ(speed);
 
   // --- 3. LOGIKA BELOK (DIPERBAIKI) ---
   // Kita hanya belok kalau speed tidak 0
   if (speed !== 0) {
     
     /* FIX UTAMA: DYNAMIC TURN SPEED
        Kita kalikan kecepatan putar dengan rasio kecepatan mobil.
        Rumus: (Kecepatan Saat Ini / Kecepatan Maks)
        
        Efek:
        - Saat ngebut -> Belok tajam (normal)
        - Saat pelan -> Belok pelan
        - Saat hampir berhenti -> Belok sangat sedikit (tidak muter di tempat)
     */
     const speedRatio = Math.abs(speed) / maxSpeed;
     
     // Clamp minimal ratio biar pas parkir (kecepatan rendah) setirnya ngga mati total
     // Jadi minimal beloknya 10% dari kekuatan penuh
     const dynamicTurnSpeed = turnSpeed * Math.max(speedRatio, 0.1);
 
     if (keys.a) playerCar.rotation.y += dynamicTurnSpeed * (speed > 0 ? 1 : -1);
     if (keys.d) playerCar.rotation.y -= dynamicTurnSpeed * (speed > 0 ? 1 : -1);
   }
 
   // --- 4. ANIMASI RODA ---
   carWheels.forEach((wheel) => {
     wheel.rotation.order = 'YXZ';
     
     // Animasi menggelinding (hanya jalan kalau speed != 0)
     wheel.rotation.x += speed * 5; 
 
     // Animasi Setir Belok Visual
     if (wheel.name.toLowerCase().includes('front')) {
        let targetSteer = 0;
        
        // Logika visual: Roda tetap belok walau mobil diam (seperti mobil asli)
        // Tapi mobilnya tidak akan ikut muter karena ditahan logika di atas.
        if (keys.a) targetSteer = 0.4;
        if (keys.d) targetSteer = -0.4;
        
        wheel.rotation.y += (targetSteer - wheel.rotation.y) * 0.1;
     }
   });
 }



/* ======================================================
   CAMERA START POSITION
====================================================== */
// camera.position.set(0, 25, 30);
// controls.target.set(0, 0, 0);
// controls.update();

/*MAU DIAPUS MAU NDAK BEBASSSS, BUAT NANDAIN OBJEKTIFNYA
/*ANIMATION (PULSING OBJECTIVE SLOT)*/
let pulse = 0;

/* ======================================================
   CAMERA FOLLOW LOGIC
   ====================================================== */
function updateCamera() {
   if (!playerCar) return;

   /* 1. Tentukan OFFSET (Jarak kamera dari mobil)
      Vector3(X, Y, Z)
      X: 0 (Tengah)
      Y: 8 (Tinggi kamera dari tanah)
      Z: -15 (Jarak di belakang mobil)
      
      TIPS: 
      - Jika kamera malah ada di DEPAN mobil, ubah -15 jadi 15 (positif).
      - Jika kamera terlalu dekat, besarkan angkanya (misal -20).
   */
   const relativeCameraOffset = new THREE.Vector3(0, 2, -4);

   /* 2. Ubah Offset Lokal jadi Posisi World
      Ini akan menghitung posisi kamera berdasarkan rotasi mobil saat ini.
   */
   const cameraOffset = relativeCameraOffset.applyMatrix4(playerCar.matrixWorld);

   /* 3. Pindahkan Kamera secara Smooth (LERP)
      0.1 = Kecepatan kamera mengejar mobil (0.01 lambat, 0.5 cepat, 1 instan)
   */
   camera.position.lerp(cameraOffset, 0.1);

   /* 4. Kamera Selalu Menghadap Mobil
   */
   camera.lookAt(playerCar.position);
}

/* ======================================================
   REAR CAMERA LOGIC (KACA SPION)
   ====================================================== */
   function updateRearCamera() {
      if (!playerCar) return;
    
      /* UBAHAN POINT 1: AGAR MEMPERLIHATKAN MOBIL DARI DEPAN */
      
      /* 1. Posisi Kamera Spion Baru
         Kita taruh di DEPAN mobil, sedikit di atas, agar bisa melihat kap mesin.
         (Berdasarkan orientasi model ini, Z positif adalah arah depan)
         X: 0 (Tengah), Y: 2.5 (Agak tinggi), Z: 6 (Di depan mobil)
      */
      const relativePos = new THREE.Vector3(0, 3, 0);
      const cameraPos = relativePos.applyMatrix4(playerCar.matrixWorld);
      rearCamera.position.copy(cameraPos);
    
      /* 2. Titik Fokus (Menghadap ke Belakang/Ke Arah Mobil)
         Kita buat titik targetnya adalah bagian tengah mobil sedikit ke bawah.
         Ini akan membuat kamera "menunduk" melihat kap mesin dan kaca depan.
      */
      const relativeLookAt = new THREE.Vector3(0, -3, -10); // Lihat ke tengah bodi mobil
      const lookAtPos = relativeLookAt.applyMatrix4(playerCar.matrixWorld);
      rearCamera.lookAt(lookAtPos);
    }

function animate() {
  requestAnimationFrame(animate);

  updateCarMovement();
  updateCamera();
  updateRearCamera();

  if (targetSlot) {
    pulse += 0.05;
    targetSlot.material.emissiveIntensity = 1.5 + Math.sin(pulse) * 0.8;

    const scale = 1 + Math.sin(pulse) * 0.05;
    targetSlot.scale.set(scale, 1, scale);
  }

//   controls.update();
//   renderer.render(scene, camera);

/* --- RENDER LOGIC BARU (DUA KAMERA) --- */
  
  // 1. Bersihkan layar
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);

  // 2. RENDER VIEWPORT 1: MAIN CAMERA (FULL SCREEN)
  // Menggunakan seluruh layar
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);

  // 3. RENDER VIEWPORT 2: REAR CAMERA (KACA SPION)
  const width = window.innerWidth;
  const height = window.innerHeight;

  const mirrorW = width * 0.25; 
  const mirrorH = height * 0.08; 
  const x = (width / 2) - (mirrorW / 2);
  const y = height - mirrorH - 10; 

  // Update aspect ratio kamera spion
  rearCamera.aspect = mirrorW / mirrorH;
  
  // Reset matriks proyeksi agar kalkulasi ulang bersih
  rearCamera.updateProjectionMatrix();

  /* --- TAMBAHAN: EFEK MIRROR --- */
  // Kita "scale" sumbu X menjadi -1 pada matriks proyeksi.
  // Ini akan membalik gambar secara horizontal (kanan jadi kiri).
  rearCamera.projectionMatrix.scale(new THREE.Vector3(-1, 1, 1));

  renderer.setViewport(x, y, mirrorW, mirrorH);
  renderer.setScissor(x, y, mirrorW, mirrorH);

  // Render scene dengan kamera yang sudah dibalik
  renderer.render(scene, rearCamera);

  renderer.setScissorTest(false);
}



animate();

/* ======================================================
   RESPONSIVE
====================================================== */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
