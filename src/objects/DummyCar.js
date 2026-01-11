import * as THREE from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';

export class DummyCar {
    // Constructor sekarang menerima 'modelTemplate' (Model 3D yang sudah di-load)
    constructor(scene, x, z, rotationY, modelTemplate) {
        this.scene = scene;
        this.mesh = null; 

        // 1. CLONE MODEL DARI TEMPLATE (INSTAN & CEPAT)
        if (modelTemplate) {
            this.mesh = modelTemplate.clone(); // Clone model agar independen
            
            // Setup Posisi
            this.mesh.position.set(x, 0, z); 
            this.mesh.rotation.y = rotationY; 
            this.mesh.scale.set(1.3, 1.3, 1.3);

            // Aktifkan Shadow & DoubleSide pada hasil clone
            this.mesh.traverse((c) => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                    if (c.material) c.material.side = THREE.DoubleSide;
                }
            });

            this.scene.add(this.mesh);
        } else {
            console.warn("DummyCar: Template model belum siap/gagal diload.");
        }

        // 2. BUAT HITBOX (OBB)
        const width = 1.8;
        const height = 1.5;
        const length = 4.2;

        this.obb = new OBB();
        this.obb.center.set(x, height / 2, z); 
        this.obb.halfSize.set(width / 2, height / 2, length / 2);
        
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(rotationY); 
        this.obb.rotation.setFromMatrix4(rotationMatrix);
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            // Kita tidak perlu dispose geometry/material karena ini hasil clone
            // dari aset utama (template) yang masih dipakai mobil lain.
        }
        this.mesh = null;
        this.obb = null;
    }
}