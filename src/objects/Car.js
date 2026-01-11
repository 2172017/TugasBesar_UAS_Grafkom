// ======================================================
// IMPORT LIBRARY THREE.JS DAN MODULE TAMBAHAN
// ======================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBB } from 'three/examples/jsm/math/OBB.js';

// ======================================================
// CLASS CAR
// ======================================================
export class Car {

    // ==================================================
    // CONSTRUCTOR
    // ==================================================
    constructor(scene, camera, rearCamera, showDebug = false) {

        // ---------- Referensi scene & kamera ----------
        this.scene = scene;
        this.camera = camera;           // Kamera utama
        this.rearCamera = rearCamera;   // Kamera spion / rear view

        // ---------- Model & komponen ----------
        this.model = null;
        this.wheels = [];

        // ---------- Parameter fisika mobil ----------
        this.speed = 0;
        this.maxSpeed = 0.15;
        this.acceleration = 0.002;
        this.friction = 0.96;
        this.turnSpeed = 0.02;

        // ---------- Input keyboard ----------
        this.keys = { w:false, a:false, s:false, d:false };

        // ==================================================
        // MODE KAMERA
        // 0 = Belakang normal
        // 1 = Belakang jauh
        // 2 = First Person / Driver view
        // 3 = Samping kiri (Shift)
        // 4 = Samping kanan (Ctrl)
        // ==================================================
        this.mainCameraMode = 0;
        this.cameraMode = 0;

        // ---------- Event keyboard ----------
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();

            // Tombol C → ganti mode kamera utama
            if (key === 'c') {
                this.mainCameraMode = (this.mainCameraMode + 1) % 3;
                this.cameraMode = this.mainCameraMode;
            }

            // Kamera samping (tahan tombol)
            if (e.key === 'Shift') this.cameraMode = 3;
            if (e.key === 'Control') this.cameraMode = 4;

            // Input gerakan mobil
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();

            // Lepas tombol samping → kembali ke kamera utama
            if (e.key === 'Shift' || e.key === 'Control') {
                this.cameraMode = this.mainCameraMode;
            }

            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = false;
            }
        });

        // ==================================================
        // HITBOX (OBB)
        // ==================================================
        this.obb = new OBB();

        // ---------- Debug hitbox ----------
        this.showDebug = showDebug;
        const debugGeo = new THREE.BoxGeometry(1, 1, 1);
        const debugMat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            wireframe: true
        });
        this.debugMesh = new THREE.Mesh(debugGeo, debugMat);
        this.debugMesh.visible = showDebug;
        this.scene.add(this.debugMesh);

        // ==================================================
        // SISTEM AUDIO
        // ==================================================
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);

        this.engineIdle = new THREE.Audio(this.listener); // suara idle
        this.engineRun  = new THREE.Audio(this.listener); // suara jalan
        this.crashSound = new THREE.Audio(this.listener); // suara tabrakan

        this.audioLoader = new THREE.AudioLoader();
        this.isCrashed = false; // mencegah crash sound berulang

        this.loadAudio();

        // ==================================================
        // SISTEM ASAP / SMOKE
        // ==================================================
        this.smokeParticles = [];
        this.smokeEmissionCounter = 0;
        this.setupSmokeSystem();

        // Load model mobil
        this.loadModel();
    }

    // ==================================================
    // LOAD AUDIO FILE
    // ==================================================
    loadAudio() {

        // Suara mesin idle
        this.audioLoader.load('./assets/sounds/engine_idle.mp3', buffer => {
            this.engineIdle.setBuffer(buffer);
            this.engineIdle.setLoop(true);
            this.engineIdle.setVolume(0.4);
        });

        // Suara mesin berjalan
        this.audioLoader.load('./assets/sounds/engine_run.mp3', buffer => {
            this.engineRun.setBuffer(buffer);
            this.engineRun.setLoop(true);
            this.engineRun.setVolume(1.0);
        });

        // Suara tabrakan
        this.audioLoader.load('./assets/sounds/crash.mp3', buffer => {
            this.crashSound.setBuffer(buffer);
            this.crashSound.setLoop(false);
            this.crashSound.setVolume(1.0);
        });
    }

    // ==================================================
    // SETUP ASAP / SMOKE
    // ==================================================
    setupSmokeSystem() {
        const texLoader = new THREE.TextureLoader();
        this.smokeTexture = texLoader.load('./assets/img/gray_smoke.png');

        this.smokeGeometry = new THREE.PlaneGeometry(1, 1);
        this.smokeMaterial = new THREE.MeshBasicMaterial({
            map: this.smokeTexture,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
            side: THREE.DoubleSide
        });
    }

    // ==================================================
    // LOAD MODEL MOBIL
    // ==================================================
    loadModel() {
        const loader = new GLTFLoader();
        loader.load('./assets/car_model/GLB format/sedan-sports.glb', (gltf) => {

            this.model = gltf.scene;
            this.model.rotation.y = Math.PI;
            this.model.position.set(0, 0, 16);
            this.model.scale.set(1.3, 1.3, 1.3);

            // Cari roda & aktifkan shadow
            this.model.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                    if (c.material) c.material.side = THREE.DoubleSide;
                    if (c.name.toLowerCase().includes('wheel')) {
                        this.wheels.push(c);
                    }
                }
            });

            // Tempelkan audio ke mobil (3D sound)
            this.model.add(this.engineIdle);
            this.model.add(this.engineRun);
            this.model.add(this.crashSound);

            // Mulai suara idle
            if (!this.engineIdle.isPlaying) this.engineIdle.play();

            this.scene.add(this.model);

            // Hitung ukuran OBB
            const box = new THREE.Box3().setFromObject(this.model);
            const size = new THREE.Vector3();
            box.getSize(size);
            this.obb.halfSize.copy(size).multiplyScalar(0.5);
            this.debugMesh.scale.copy(size);
        });
    }

    // ==================================================
    // UPDATE LOOP (dipanggil tiap frame)
    // ==================================================
    update(obstacleOBB) {
        if (!this.model) return;
        this.updatePhysics(obstacleOBB);   // fisika & collision
        this.updateSmoke();                // asap
        this.updateEngineSound();          // audio mesin
        this.updateCameras();              // kamera
    }

    // ==================================================
    // LOGIKA SUARA MESIN
    // ==================================================
    updateEngineSound() {
        const s = Math.abs(this.speed);

        // Mobil diam → idle
        if (s < 0.01) {
            if (!this.engineIdle.isPlaying) this.engineIdle.play();
            if (this.engineRun.isPlaying) this.engineRun.pause();
        }
        // Mobil bergerak
        else {
            if (!this.engineRun.isPlaying) this.engineRun.play();
            if (this.engineIdle.isPlaying) this.engineIdle.pause();

            const ratio = s / this.maxSpeed;
            this.engineRun.setVolume(THREE.MathUtils.clamp(ratio, 0.3, 1));
            this.engineRun.setPlaybackRate(
                THREE.MathUtils.lerp(0.8, 1.4, ratio)
            );
        }
    }

    // ==================================================
    // FISIKA, GERAKAN & COLLISION
    // ==================================================
    updatePhysics(obstacleOBB) {

        const oldPos = this.model.position.clone();
        const oldRot = this.model.rotation.y;

        // Akselerasi
        if (this.keys.w) this.speed += this.acceleration;
        if (this.keys.s) this.speed -= this.acceleration;

        // Batas kecepatan
        this.speed = THREE.MathUtils.clamp(
            this.speed,
            -this.maxSpeed / 2,
            this.maxSpeed
        );

        // Gesekan saat tidak gas/rem
        if (!this.keys.w && !this.keys.s) {
            this.speed *= this.friction;
            if (Math.abs(this.speed) < 0.001) this.speed = 0;
        }

        // Gerakkan mobil
        this.model.translateZ(this.speed);

        // Belok
        if (this.speed !== 0) {
            const t = this.turnSpeed * Math.max(Math.abs(this.speed) / this.maxSpeed, 0.1);
            if (this.keys.a) this.model.rotation.y += t * (this.speed > 0 ? 1 : -1);
            if (this.keys.d) this.model.rotation.y -= t * (this.speed > 0 ? 1 : -1);
        }

        // Rotasi roda
        this.wheels.forEach(w => w.rotation.x += this.speed * 5);

        // Update OBB
        this.obb.center.copy(this.model.position);
        this.obb.center.y += 1;
        this.obb.rotation.setFromMatrix4(
            new THREE.Matrix4().makeRotationY(this.model.rotation.y)
        );

        // Update debug hitbox
        this.debugMesh.position.copy(this.obb.center);
        this.debugMesh.rotation.y = this.model.rotation.y;

        // Collision detection
        if (obstacleOBB && this.obb.intersectsOBB(obstacleOBB)) {

            // Mainkan suara crash sekali
            if (!this.isCrashed) {
                this.crashSound.stop();
                this.crashSound.play();
                this.isCrashed = true;
            }

            // Batalkan pergerakan
            this.model.position.copy(oldPos);
            this.model.rotation.y = oldRot;
            this.speed = -this.speed * 0.5;

        } else {
            this.isCrashed = false;
        }
    }

    // ==================================================
    // UPDATE ASAP / SMOKE
    // ==================================================
    updateSmoke() {
        if (this.speed > 0.01 && ++this.smokeEmissionCounter % 5 === 0) {
            const p = new THREE.Mesh(
                this.smokeGeometry,
                this.smokeMaterial.clone()
            );
            p.position.copy(
                new THREE.Vector3(0, 0.5, -2.5)
                    .applyMatrix4(this.model.matrixWorld)
            );
            p.userData = { life: 1 };
            this.scene.add(p);
            this.smokeParticles.push(p);
        }

        // Update partikel asap
        this.smokeParticles.forEach((p, i) => {
            p.position.y += 0.03;
            p.userData.life -= 0.02;
            p.material.opacity = p.userData.life * 0.4;
            p.lookAt(this.camera.position);

            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.smokeParticles.splice(i, 1);
            }
        });
    }

    // ==================================================
    // UPDATE KAMERA (UTAMA & REAR VIEW)
    // ==================================================
    updateCameras() {
        let relativeOffset = new THREE.Vector3();
        let lookAtTarget = new THREE.Vector3();

        // Kamera utama
        switch (this.cameraMode) {

            case 0: // Belakang normal
                relativeOffset.set(0, 2.5, -5);
                lookAtTarget.copy(this.model.position);
                break;

            case 1: // Belakang jauh
                relativeOffset.set(0, 5, -10);
                lookAtTarget.copy(this.model.position);
                break;

            case 2: // First Person / Driver view
                relativeOffset.set(0, 1.1, 0.3);
                lookAtTarget = new THREE.Vector3(0, 1, 20)
                    .applyMatrix4(this.model.matrixWorld);
                break;

            case 3: // Samping kiri
                relativeOffset.set(-6, 2, 0);
                lookAtTarget.copy(this.model.position);
                break;

            case 4: // Samping kanan
                relativeOffset.set(6, 2, 0);
                lookAtTarget.copy(this.model.position);
                break;
        }

        // Hitung posisi kamera utama
        const cameraPos = relativeOffset.applyMatrix4(this.model.matrixWorld);

        // Smooth hanya untuk mode belakang
        if (this.cameraMode >= 2) {
            this.camera.position.copy(cameraPos);
        } else {
            this.camera.position.lerp(cameraPos, 0.1);
        }

        this.camera.lookAt(lookAtTarget);

        // ------------------------------
        // KAMERA REAR VIEW (SPION)
        // ------------------------------
        const rearPos = new THREE.Vector3(0, 2.2, 1.5)
            .applyMatrix4(this.model.matrixWorld);
        this.rearCamera.position.copy(rearPos);

        const rearLook = new THREE.Vector3(0, 1, -20)
            .applyMatrix4(this.model.matrixWorld);
        this.rearCamera.lookAt(rearLook);
    }
}
