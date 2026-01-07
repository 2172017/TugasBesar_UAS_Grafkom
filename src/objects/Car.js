import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBB } from 'three/examples/jsm/math/OBB.js';

export class Car {
    constructor(scene, camera, rearCamera, showDebug = false) {
        this.scene = scene;
        this.camera = camera;
        this.rearCamera = rearCamera;
        
        this.model = null;
        this.wheels = [];
        this.speed = 0;
        this.maxSpeed = 0.15;
        this.acceleration = 0.002;
        this.friction = 0.96;
        this.turnSpeed = 0.02;

        this.keys = { w:false, a:false, s:false, d:false };
        
        // ==========================================
        // 1. SETUP LOGIKA KAMERA BARU
        // ==========================================
        this.mainCameraMode = 0; // Mode utama (0=Normal, 1=Jauh, 2=FPS)
        this.cameraMode = 0;     // Mode aktif saat ini (bisa 3/4 kalau shift/ctrl ditekan)

        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();

            // Tombol C: Ganti Mode Utama (Hanya 0, 1, 2)
            if(key === 'c') {
                this.mainCameraMode = (this.mainCameraMode + 1) % 3; 
                this.cameraMode = this.mainCameraMode; // Update kamera aktif
                console.log("Main Camera Mode:", this.mainCameraMode);
            }

            // Tombol SHIFT: Tahan untuk lihat Kiri (Mode 3)
            if (e.key === 'Shift') {
                this.cameraMode = 3;
            }

            // Tombol CONTROL: Tahan untuk lihat Kanan (Mode 4)
            if (e.key === 'Control') {
                this.cameraMode = 4;
            }

            // Simpan status tombol gerakan (wsad)
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();

            // Jika Shift atau Control dilepas, KEMBALI ke mode utama
            if (e.key === 'Shift' || e.key === 'Control') {
                this.cameraMode = this.mainCameraMode;
            }

            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = false;
            }
        });

        // OBB Setup
        this.obb = new OBB(); 
        
        // Debug Hitbox
        this.showDebug = showDebug;
        const debugGeo = new THREE.BoxGeometry(1, 1, 1);
        const debugMat = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });
        this.debugMesh = new THREE.Mesh(debugGeo, debugMat);
        this.debugMesh.visible = false; 
        if (this.showDebug) this.debugMesh.visible = true;
        this.scene.add(this.debugMesh);
        
        // Smoke Setup
        this.smokeParticles = [];
        this.smokeEmissionCounter = 0;
        this.setupSmokeSystem();

        this.loadModel();
    }

    setupSmokeSystem() {
        const textureLoader = new THREE.TextureLoader();
        this.smokeTexture = textureLoader.load('./assets/img/gray_smoke.png'); 

        this.smokeGeometry = new THREE.PlaneGeometry(1, 1);
        this.smokeMaterial = new THREE.MeshBasicMaterial({
            map: this.smokeTexture,
            transparent: true,
            opacity: 0.4, 
            depthWrite: false, 
            side: THREE.DoubleSide
        });
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.load('./assets/car_model/GLB format/sedan-sports.glb', (gltf) => {
            this.model = gltf.scene;
            this.model.rotation.y = Math.PI; 
            this.model.position.set(0, 0, 16);
            this.model.scale.set(1.3, 1.3, 1.3);

            this.model.traverse(c => {
                if(c.isMesh) {
                    c.castShadow = true; c.receiveShadow = true;
                    if(c.material) c.material.side = THREE.DoubleSide;
                    if(c.name.toLowerCase().includes('wheel')) this.wheels.push(c);
                }
            });
            this.scene.add(this.model);

            const box = new THREE.Box3().setFromObject(this.model);
            const size = new THREE.Vector3();
            box.getSize(size);
            this.obb.halfSize.copy(size).multiplyScalar(0.5);
            this.debugMesh.scale.copy(size);

            console.log("Mobil Loaded");
        });
    }

    setDebug(isVisible) {
        if (this.debugMesh) {
            this.debugMesh.visible = isVisible;
        }
    }

    update(obstacleOBB) { 
        if (!this.model) return;
        this.updatePhysics(obstacleOBB); 
        this.updateSmoke();
        this.updateCameras();
    }

    updateSmoke() {
        if (this.speed > 0.01) {
            this.smokeEmissionCounter++;
            if (this.smokeEmissionCounter % 5 === 0) {
                const particle = new THREE.Mesh(this.smokeGeometry, this.smokeMaterial.clone());
                const offset = new THREE.Vector3(0, 0.5, -2.5).applyMatrix4(this.model.matrixWorld);
                particle.position.copy(offset);
                particle.rotation.z = Math.random() * Math.PI;
                particle.scale.set(0.5, 0.5, 0.5);
                particle.userData = { life: 1.0, driftX: (Math.random() - 0.5) * 0.02 };
                this.scene.add(particle);
                this.smokeParticles.push(particle);
            }
        }

        this.smokeParticles.forEach((p, index) => {
            p.position.y += 0.03; 
            p.translateZ(-0.02); 
            p.position.x += p.userData.driftX;
            p.scale.multiplyScalar(1.03);
            p.userData.life -= 0.015; 
            p.material.opacity = p.userData.life * 0.4; 
            p.lookAt(this.camera.position);

            if (p.userData.life <= 0) {
                this.scene.remove(p);
                p.material.dispose();
                p.geometry.dispose();
                this.smokeParticles.splice(index, 1); 
            }
        });
    }

    updatePhysics(obstacleOBB) {
        const oldPosition = this.model.position.clone();
        const oldRotation = this.model.rotation.y;

        if (this.keys.w) this.speed += this.acceleration;
        if (this.keys.s) this.speed -= this.acceleration;
        
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed/2) this.speed = -this.maxSpeed/2;
        
        if (!this.keys.w && !this.keys.s) {
            this.speed *= this.friction;
            if (Math.abs(this.speed) < 0.001) this.speed = 0;
        }

        this.model.translateZ(this.speed);

        if (this.speed !== 0) {
            const ratio = Math.abs(this.speed) / this.maxSpeed;
            const turn = this.turnSpeed * Math.max(ratio, 0.1);
            if (this.keys.a) this.model.rotation.y += turn * (this.speed > 0 ? 1 : -1);
            if (this.keys.d) this.model.rotation.y -= turn * (this.speed > 0 ? 1 : -1);
        }

        this.wheels.forEach(w => {
            w.rotation.x += this.speed * 5;
            if(w.name.includes('front')) {
                let steer = 0;
                if(this.keys.a) steer = 0.4;
                if(this.keys.d) steer = -0.4;
                w.rotation.y += (steer - w.rotation.y) * 0.1;
            }
        });

        // OBB & Debug Update
        this.obb.center.copy(this.model.position);
        this.obb.center.y += 1; 

        // Fix rotation matrix error
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(this.model.rotation.y);
        this.obb.rotation.setFromMatrix4(rotationMatrix);

        this.debugMesh.position.copy(this.obb.center);
        this.debugMesh.rotation.y = this.model.rotation.y;

        if (obstacleOBB) {
            if (this.obb.intersectsOBB(obstacleOBB)) {
                this.model.position.copy(oldPosition);
                this.model.rotation.y = oldRotation;
                this.speed = -this.speed * 0.5;

                this.obb.center.copy(this.model.position);
                this.obb.center.y += 1;
                
                const undoRotMatrix = new THREE.Matrix4();
                undoRotMatrix.makeRotationY(this.model.rotation.y);
                this.obb.rotation.setFromMatrix4(undoRotMatrix);
                
                this.debugMesh.position.copy(this.obb.center);
                this.debugMesh.rotation.y = this.model.rotation.y;
            }
        }
    }

    // ==========================================
    // 2. POSISI KAMERA YANG DIPERBARUI
    // ==========================================
    updateCameras() {
        let relativeOffset = new THREE.Vector3();
        let lookAtTarget = new THREE.Vector3();
        
        // Kita gunakan 'this.cameraMode' yang bisa berubah jadi 3 atau 4 saat tombol ditekan
        switch (this.cameraMode) {
            case 0: // Normal (Belakang)
                relativeOffset.set(0, 2.5, -5);
                lookAtTarget.copy(this.model.position);
                break;

            case 1: // Jauh (Belakang Long)
                relativeOffset.set(0, 5, -10); 
                lookAtTarget.copy(this.model.position);
                break;

            case 2: // First Person (Driver)
                relativeOffset.set(0, 1.1, 0.3); 
                lookAtTarget = new THREE.Vector3(0, 1, 20).applyMatrix4(this.model.matrixWorld);
                break;

            case 3: // SHIFT: Sisi Kiri (Melihat dari kiri ke body mobil)
                // Posisi: Kiri (x negatif), agak tinggi, sejajar body
                relativeOffset.set(-6, 2, 0); 
                lookAtTarget.copy(this.model.position);
                break;

            case 4: // CONTROL: Sisi Kanan (Melihat dari kanan ke body mobil)
                // Posisi: Kanan (x positif), agak tinggi
                relativeOffset.set(6, 2, 0);
                lookAtTarget.copy(this.model.position);
                break;
        }

        const cameraPos = relativeOffset.applyMatrix4(this.model.matrixWorld);

        // Jika mode FPS (2) atau Side View (3 & 4), gerakan instan agar responsif
        if (this.cameraMode >= 2) {
            this.camera.position.copy(cameraPos);
        } else {
            // Mode normal pakai lerp biar smooth
            this.camera.position.lerp(cameraPos, 0.1);
        }

        this.camera.lookAt(lookAtTarget);

        // Kamera Spion
        const rearPos = new THREE.Vector3(0, 2.2, 1.5).applyMatrix4(this.model.matrixWorld);
        this.rearCamera.position.copy(rearPos);
        const rearLook = new THREE.Vector3(0, 1, -20).applyMatrix4(this.model.matrixWorld);
        this.rearCamera.lookAt(rearLook);
    }
}