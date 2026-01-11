import * as THREE from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class DummyCar {
    constructor(scene, x, z, rotationY) {
        this.scene = scene;
        this.mesh = null; 

        // =========================================================
        // 1. DAFTAR MOBIL (Sesuai Request)
        // =========================================================
        const carModels = [
            'ferrari.glb',
            'police.glb',
            'suv.glb',
            'firetruck.glb',
            'ambulance.glb',
            'delivery.glb'
        ];

        const randomModel = carModels[Math.floor(Math.random() * carModels.length)];
        
        // Pastikan path ini sesuai dengan struktur folder Anda
        const path = `./assets/car_model/glb/${randomModel}`;

        // =========================================================
        // 2. BUAT HITBOX (OBB)
        // =========================================================
        const width = 1.8;
        const height = 1.5;
        const length = 4.2;

        this.obb = new OBB();
        this.obb.center.set(x, height / 2, z); 
        this.obb.halfSize.set(width / 2, height / 2, length / 2);
        
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(rotationY); 
        this.obb.rotation.setFromMatrix4(rotationMatrix);

        // =========================================================
        // 3. LOAD MODEL VISUAL
        // =========================================================
        const loader = new GLTFLoader();
        
        loader.load(path, (gltf) => {
            this.mesh = gltf.scene;
            
            // Setup Posisi
            this.mesh.position.set(x, 0, z); 
            
            // Rotasi sesuai slot
            this.mesh.rotation.y = rotationY; 
            
            this.mesh.scale.set(1.3, 1.3, 1.3);

            this.mesh.traverse((c) => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                    if (c.material) {
                        c.material.side = THREE.DoubleSide;
                    }
                }
            });

            this.scene.add(this.mesh);

        }, undefined, (error) => {
            // JIKA GAGAL LOAD
            console.warn(`Gagal load: ${path}. Objek ini akan diabaikan/dihapus.`);
            
            // Kita set mesh ke null agar logika update di main loop bisa tahu kalau ini kosong
            this.mesh = null;
            
            // Tidak memanggil createFallbackMesh, jadi tidak ada kotak abu-abu.
        });
    }

    destroy() {
        // Hapus dari scene jika mesh berhasil di-load sebelumnya
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.traverse((c) => {
                if (c.isMesh) {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) {
                        if (Array.isArray(c.material)) {
                            c.material.forEach(m => m.dispose());
                        } else {
                            c.material.dispose();
                        }
                    }
                }
            });
        }
        // Bersihkan referensi
        this.mesh = null;
        this.obb = null;
    }
}