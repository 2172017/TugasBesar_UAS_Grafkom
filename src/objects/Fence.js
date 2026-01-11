import * as THREE from 'three';

export class Fence {
    constructor(scene, model, x, y, z, rotationY = 0) {
        this.scene = scene;
        
        // Clone model agar kita bisa membuat banyak copy dari 1 file yang diload
        this.mesh = model.clone();

        // Set Posisi
        this.mesh.position.set(x, y, z);
        
        // Set Rotasi
        this.mesh.rotation.y = rotationY;

        // Aktifkan bayangan (opsional, tapi bagus untuk realisme)
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.scene.add(this.mesh);
    }
}