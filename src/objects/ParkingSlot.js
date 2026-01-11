import * as THREE from 'three';
import { DummyCar } from './DummyCar.js';

export class ParkingSlot {
    constructor(scene, x, z, width, depth, rotationY, lineMaterial) {
        this.scene = scene;
        this.width = width;
        this.depth = depth;
        
        // Posisi & Rotasi disimpan untuk spawn nanti
        this.posX = x;
        this.posZ = z;
        this.rotY = rotationY;

        // State
        this.isTarget = false;
        this.dummyCar = null; // Menyimpan object DummyCar jika ada
        this.hologramMesh = null;

        // Visual Garis
        this.group = new THREE.Group();
        this.group.position.set(x, 0.05, z);
        this.group.rotation.y = rotationY;
        this.createLines(lineMaterial);
        this.scene.add(this.group);
    }

    createLines(material) {
        const lineWidth = 0.15;
        // Kiri
        const left = new THREE.Mesh(new THREE.PlaneGeometry(lineWidth, this.depth), material);
        left.rotation.x = -Math.PI / 2;
        left.position.set(-this.width / 2, 0, 0);
        this.group.add(left);
        // Kanan
        const right = left.clone();
        right.position.set(this.width / 2, 0, 0);
        this.group.add(right);
        // Belakang
        const back = new THREE.Mesh(new THREE.PlaneGeometry(this.width, lineWidth), material);
        back.rotation.x = -Math.PI / 2;
        back.position.set(0, 0, -this.depth / 2);
        this.group.add(back);
    }

    // --- FUNGSI DUMMY CAR ---
    spawnDummy() {
        if (!this.dummyCar) {
            this.dummyCar = new DummyCar(this.scene, this.posX, this.posZ, this.rotY);
        }
    }

    removeDummy() {
        if (this.dummyCar) {
            this.dummyCar.destroy();
            this.dummyCar = null;
        }
    }

    // --- FUNGSI TARGET ---
    setTarget(isActive, hologramMat, wireframeMat) {
        this.isTarget = isActive;
        if (isActive) {
            // Jika jadi target, pastikan tidak ada dummy
            this.removeDummy(); 

            if (!this.hologramMesh) {
                const height = 2;
                const geo = new THREE.BoxGeometry(this.width - 0.4, height, this.depth - 0.4);
                geo.translate(0, height / 2, 0);
                this.hologramMesh = new THREE.Mesh(geo, hologramMat);
                const wireframe = new THREE.LineSegments(new THREE.EdgesGeometry(geo), wireframeMat);
                this.hologramMesh.add(wireframe);
                this.group.add(this.hologramMesh);
            }
            this.hologramMesh.visible = true;
        } else {
            if (this.hologramMesh) this.hologramMesh.visible = false;
        }
    }

    getWorldPosition() {
        const vec = new THREE.Vector3();
        this.group.getWorldPosition(vec);
        return vec;
    }

    getRotationY() {
        return this.group.rotation.y;
    }
}