import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();

/*JANGAN SENTUH!
/*SKYBOX (PNG)*/
const cubeTextureLoader = new THREE.CubeTextureLoader();
scene.background = cubeTextureLoader.load([
  '/skybox/px.png',
  '/skybox/nx.png',
  '/skybox/py.png',
  '/skybox/ny.png',
  '/skybox/pz.png',
  '/skybox/nz.png'
]);

/*CAMERA*/
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

/*RENDERER*/
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

/*CONTROLS*/
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.2;

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
  metalness: 0
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
    emissiveIntensity: isObjective ? 1.5 : 0
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
   CAMERA START POSITION
====================================================== */
camera.position.set(0, 25, 30);
controls.target.set(0, 0, 0);
controls.update();

/*MAU DIAPUS MAU NDAK BEBASSSS, BUAT NANDAIN OBJEKTIFNYA
/*ANIMATION (PULSING OBJECTIVE SLOT)*/
let pulse = 0;

function animate() {
  requestAnimationFrame(animate);

  if (targetSlot) {
    pulse += 0.05;
    targetSlot.material.emissiveIntensity = 1.5 + Math.sin(pulse) * 0.8;

    const scale = 1 + Math.sin(pulse) * 0.05;
    targetSlot.scale.set(scale, 1, scale);
  }

  controls.update();
  renderer.render(scene, camera);
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
