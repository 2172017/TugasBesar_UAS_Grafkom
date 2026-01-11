import * as THREE from 'three';
import { DummyCar } from './DummyCar.js';

export class ParkingSlot {
    // 1. TERIMA PARAMETER parkingSystem
    constructor(scene, x, z, width, depth, rotationY, lineMaterial, parkingSystem) {
        this.scene = scene;
        this.parkingSystem = parkingSystem; // Simpan referensi

        this.width = width;
        this.depth = depth;
        
        this.posX = x;
        this.posZ = z;
        this.rotY = rotationY;

        this.isTarget = false;
        this.dummyCar = null; 
        this.hologramMesh = null;

        this.group = new THREE.Group();
        this.group.position.set(x, 0.05, z);
        this.group.rotation.y = rotationY;
        
        this.createLines(lineMaterial);
        this.scene.add(this.group);
    }

    createLines(material) {
        material.side = THREE.DoubleSide; 

        const lineWidth = 0.15;
        const left = new THREE.Mesh(new THREE.PlaneGeometry(lineWidth, this.depth), material);
        left.rotation.x = -Math.PI / 2; left.position.set(-this.width / 2, 0, 0);
        this.group.add(left);
        
        const right = left.clone();
        right.position.set(this.width / 2, 0, 0);
        this.group.add(right);
        
        const back = new THREE.Mesh(new THREE.PlaneGeometry(this.width, lineWidth), material);
        back.rotation.x = -Math.PI / 2; back.position.set(0, 0, -this.depth / 2);
        this.group.add(back);
    }

    spawnDummy() {
        if (!this.dummyCar && this.parkingSystem) {
            // Minta template dari ParkingSystem (yang sudah diload saat loading screen)
            const template = this.parkingSystem.getRandomTemplate();
            
            if (template) {
                // Cloning instan, tidak perlu download lagi
                this.dummyCar = new DummyCar(this.scene, this.posX, this.posZ, this.rotY, template);
            }
        }
    }

    removeDummy() {
        if (this.dummyCar) {
            this.dummyCar.destroy();
            this.dummyCar = null;
        }
    }

    setTarget(isActive, hologramMat, wireframeMat) {
        this.isTarget = isActive;
        if (isActive) {
            this.removeDummy(); 

            if (!this.hologramMesh) {
                hologramMat.side = THREE.DoubleSide; 
                wireframeMat.side = THREE.DoubleSide;

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