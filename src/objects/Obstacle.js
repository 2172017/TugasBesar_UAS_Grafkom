import * as THREE from 'three';
// 1. Import OBB
import { OBB } from 'three/examples/jsm/math/OBB.js';

export class Obstacle {
    constructor(scene, x, z) {
        this.scene = scene;

        // Mesh
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            side: THREE.DoubleSide
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, 1, z); 
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);

        // 2. SETUP OBB
        this.obb = new OBB();
        // Set ukuran (Half Size dari 2x2x2 adalah 1x1x1)
        this.obb.halfSize.set(1, 1, 1);
        // Set posisi tengah
        this.obb.center.copy(this.mesh.position);
        // Rotasi (Obstacle diam, jadi identity matrix aman)
        this.obb.rotation.identity();

        // 3. DEBUG VISUAL (Kotak Merah)
        const debugGeo = new THREE.BoxGeometry(2, 2, 2);
        const debugMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        this.debugMesh = new THREE.Mesh(debugGeo, debugMat);
        this.debugMesh.position.copy(this.mesh.position);
        this.debugMesh.visible = false;
        this.scene.add(this.debugMesh);
    }

    setDebug(isVisible) {
        if (this.debugMesh) {
            this.debugMesh.visible = isVisible;
        }
    }
}