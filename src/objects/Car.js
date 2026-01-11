import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBB } from 'three/examples/jsm/math/OBB.js';

export class Car {
    // 1. TERIMA loadingManager di parameter terakhir
    constructor(scene, camera, rearCamera, x = 0, z = 0, rotationY = 0, audioManager, loadingManager) {
        this.scene = scene;
        this.camera = camera;
        this.rearCamera = rearCamera;
        this.audioManager = audioManager;
        
        // 2. Simpan Loading Manager
        this.loadingManager = loadingManager;

        // Simpan posisi spawn
        this.spawnX = x;
        this.spawnZ = z;
        this.spawnRotation = rotationY;

        this.model = null;
        this.wheels = []; 
        
        // Physics
        this.speed = 0;
        this.maxSpeed = 0.12;           
        this.maxReverseSpeed = 0.04;   
        this.baseAcceleration = 0.002; 
        this.friction = 0.98;           
        this.brakeForce = 0.003;       
        
        this.maxSteeringAngle = 0.55; 
        this.currentSteering = 0;
        this.wheelBase = 2.8;
        this.stoppedFrameCount = 0; 
        this.gearShiftDelay = 60;   
        
        this.keys = { w:false, a:false, s:false, d:false, space:false };
        
        this.brakeLights = [];   
        this.reverseLights = []; 

        this.setupInput();
        this.setupPhysics();
        this.setupSmokeSystem(); // <-- Di dalam sini kita pakai loadingManager
        this.loadModel();        // <-- Di dalam sini kita pakai loadingManager
    }

    setupInput() {
        this.mainCameraMode = 0; 
        this.cameraMode = 0;     
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if(key === 'c') {
                this.mainCameraMode = (this.mainCameraMode + 1) % 3; 
                this.cameraMode = this.mainCameraMode; 
            }
            if (e.key === 'Shift') this.cameraMode = 3;
            if (e.key === 'Control') this.cameraMode = 4;
            if (e.code === 'Space') this.keys.space = true;
            if (this.keys.hasOwnProperty(key)) this.keys[key] = true;
        });
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (e.key === 'Shift' || e.key === 'Control') this.cameraMode = this.mainCameraMode;
            if (e.code === 'Space') this.keys.space = false;
            if (this.keys.hasOwnProperty(key)) this.keys[key] = false;
        });
    }

    setupPhysics() {
        this.obb = new OBB(); 
        const debugGeo = new THREE.BoxGeometry(1, 1, 1);
        const debugMat = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });
        this.debugMesh = new THREE.Mesh(debugGeo, debugMat);
        this.debugMesh.visible = false; 
        this.scene.add(this.debugMesh);
    }

    setupSmokeSystem() {
        // 3. GUNAKAN loadingManager di TextureLoader
        const textureLoader = new THREE.TextureLoader(this.loadingManager);
        
        this.smokeTexture = textureLoader.load('./assets/img/gray_smoke.png'); 
        this.smokeGeometry = new THREE.PlaneGeometry(1, 1);
        this.smokeMaterial = new THREE.MeshBasicMaterial({
            map: this.smokeTexture,
            transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide
        });
        this.smokeParticles = [];
        this.smokeEmissionCounter = 0;
    }

    loadModel() {
        // 4. GUNAKAN loadingManager di GLTFLoader
        const loader = new GLTFLoader(this.loadingManager);
        
        loader.load('./assets/car_model/glb/sedan-sports.glb', (gltf) => {
            this.model = gltf.scene;
            
            this.model.position.set(this.spawnX, 0, this.spawnZ);
            this.model.rotation.y = this.spawnRotation; 
            this.model.scale.set(1.3, 1.3, 1.3);

            const wheelsFound = [];
            this.model.traverse(c => {
                if(c.isMesh) {
                    c.castShadow = true; c.receiveShadow = true;
                    if(c.material) c.material.side = THREE.DoubleSide;
                    if(c.name.toLowerCase().includes('wheel')) wheelsFound.push(c);
                }
            });

            wheelsFound.forEach(wheelMesh => {
                const parent = wheelMesh.parent;
                const wheelGroup = new THREE.Group();
                wheelGroup.position.copy(wheelMesh.position);
                wheelGroup.rotation.copy(wheelMesh.rotation);
                wheelGroup.scale.copy(wheelMesh.scale);
                parent.add(wheelGroup);
                wheelMesh.position.set(0, 0, 0);
                wheelMesh.rotation.set(0, 0, 0);
                wheelMesh.scale.set(1, 1, 1);
                wheelGroup.add(wheelMesh);
                this.wheels.push({
                    mesh: wheelMesh,    
                    group: wheelGroup,  
                    isFront: wheelMesh.name.toLowerCase().includes('front')
                });
            });

            this.setupRearLights();
            this.scene.add(this.model);

            const box = new THREE.Box3().setFromObject(this.model);
            const size = new THREE.Vector3();
            box.getSize(size);
            this.obb.halfSize.copy(size).multiplyScalar(0.5);
            this.debugMesh.scale.copy(size);
        });
    }

    setupRearLights() {
        const createLightMesh = (color, x, y, z) => {
            const material = new THREE.MeshStandardMaterial({
                color: color, emissive: color, emissiveIntensity: 0, toneMapped: false
            });
            const geometry = new THREE.BoxGeometry(0.12, 0.08, 0.02);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, y, z); 
            const light = new THREE.PointLight(color, 0, 3); 
            light.position.set(0, 0, -0.1); 
            mesh.add(light);
            this.model.add(mesh); 
            return { mesh, light };
        };
        const zPos = -1.25; const yPos = 0.33; const xOuter = 0.45; const xInner = 0.30; 
        this.brakeLights.push(createLightMesh(0xff0000, -xOuter, yPos, zPos)); 
        this.brakeLights.push(createLightMesh(0xff0000, xOuter, yPos, zPos));  
        this.reverseLights.push(createLightMesh(0xffffaa, -xInner, yPos, zPos)); 
        this.reverseLights.push(createLightMesh(0xffffaa, xInner, yPos, zPos));  
    }

    updateLightsState(isBraking, isReversing) {
        this.brakeLights.forEach(obj => {
            obj.mesh.material.emissiveIntensity = isBraking ? 2.0 : 0;
            obj.light.intensity = isBraking ? 2 : 0;
        });
        this.reverseLights.forEach(obj => {
            obj.mesh.material.emissiveIntensity = isReversing ? 2.0 : 0;
            obj.light.intensity = isReversing ? 1.5 : 0;
        });
    }

    setDebug(isVisible) { if (this.debugMesh) this.debugMesh.visible = isVisible; }

    getTorqueFactor() {
        const ratio = Math.abs(this.speed) / this.maxSpeed;
        if (ratio < 0.15) return 0.5; 
        else if (ratio < 0.7) return 1.0; 
        else return 0.3; 
    }

    update(dummyCars, borders) { 
        if (!this.model) return;

        const oldPosition = this.model.position.clone();
        const oldRotation = this.model.rotation.y;

        let visualBrake = false;
        let visualReverse = false;
        const currentAccel = this.baseAcceleration * this.getTorqueFactor();

        if (this.audioManager) {
            this.audioManager.updateEngine(this.speed, this.maxSpeed);
        }

        if (Math.abs(this.speed) < 0.0001) {
            this.speed = 0; this.stoppedFrameCount++; 
        } else {
            this.stoppedFrameCount = 0;
        }

        let isBrakingInput = false;

        if (this.keys.space) {
            this.speed *= 0.85; 
            if (Math.abs(this.speed) < 0.0005) this.speed = 0;
            visualBrake = true;
            isBrakingInput = true;
        } else {
            if (this.keys.w) {
                if (this.speed < 0) { 
                    this.speed += this.brakeForce; 
                    isBrakingInput = true;
                    if (this.speed > 0) this.speed = 0;
                    visualBrake = true; visualReverse = true;
                } else { 
                    this.speed += (this.stoppedFrameCount > this.gearShiftDelay || this.speed !== 0) ? currentAccel : 0; 
                }
            }
            if (this.keys.s) {
                if (this.speed > 0) { 
                    this.speed -= this.brakeForce;
                    isBrakingInput = true;
                    if (this.speed < 0) this.speed = 0;
                    visualBrake = true;
                } else { 
                    visualReverse = true;
                    this.speed -= (this.stoppedFrameCount > this.gearShiftDelay || this.speed !== 0) ? (this.baseAcceleration * 0.7) : 0;
                }
            }
            if (!this.keys.w && !this.keys.s) {
                this.speed *= this.friction; 
                if (this.speed < 0) visualReverse = true;
            }
        }

        if (this.audioManager) {
            if (isBrakingInput && Math.abs(this.speed) > 0.01) {
                this.audioManager.playBrake();
            } else {
                this.audioManager.stopBrake();
            }
        }

        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxReverseSpeed) this.speed = -this.maxReverseSpeed;

        this.updateLightsState(visualBrake, visualReverse);

        let targetSteering = 0;
        if (this.keys.a) targetSteering = this.maxSteeringAngle;
        if (this.keys.d) targetSteering = -this.maxSteeringAngle;
        this.currentSteering += (targetSteering - this.currentSteering) * 0.08;

        if (Math.abs(this.speed) > 0.0001) {
            const angularVelocity = (this.speed * Math.tan(this.currentSteering)) / this.wheelBase * 0.8;
            this.model.rotation.y += angularVelocity;
            this.model.translateZ(this.speed);
        }

        const wheelRotationSpeed = this.speed * 8; 
        this.wheels.forEach(w => {
            w.mesh.rotation.x += wheelRotationSpeed;
            if(w.isFront) w.group.rotation.y = this.currentSteering;
        });

        this.obb.center.copy(this.model.position);
        this.obb.center.y += 1; 
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(this.model.rotation.y);
        this.obb.rotation.setFromMatrix4(rotationMatrix);

        if (this.debugMesh) {
            this.debugMesh.position.copy(this.obb.center);
            this.debugMesh.rotation.y = this.model.rotation.y;
        }

        let isCollided = false;

        if (dummyCars && Array.isArray(dummyCars)) {
            for (const dummy of dummyCars) {
                if (dummy.obb && dummy.mesh) {
                    if (this.obb.intersectsOBB(dummy.obb)) {
                        console.log("Nabrak Mobil!");
                        isCollided = true;
                        break;
                    }
                }
            }
        }

        if (!isCollided && borders && Array.isArray(borders)) {
            for (const borderOBB of borders) {
                if (this.obb.intersectsOBB(borderOBB)) {
                    console.log("Nabrak Pagar!");
                    isCollided = true;
                    break;
                }
            }
        }

        if (isCollided) {
            if (this.audioManager) {
                if (Math.abs(this.speed) > 0.005) { 
                   this.audioManager.playCrash();
                }
            }
             this.model.position.copy(oldPosition);
             this.model.rotation.y = oldRotation;

             this.speed = -this.speed * 0.3;
             if(Math.abs(this.speed) < 0.001) this.speed = 0;

             this.obb.center.copy(this.model.position);
             this.obb.center.y += 1;
             const undoRotMatrix = new THREE.Matrix4();
             undoRotMatrix.makeRotationY(this.model.rotation.y);
             this.obb.rotation.setFromMatrix4(undoRotMatrix);
        }

        this.updateSmoke();
        this.updateCameras();
    }
    
    updateCameras() {
        let relativeOffset = new THREE.Vector3();
        let lookAtTarget = new THREE.Vector3();
        switch (this.cameraMode) {
            case 0: relativeOffset.set(0, 2.5, -5); lookAtTarget.copy(this.model.position); break;
            case 1: relativeOffset.set(0, 5, -10); lookAtTarget.copy(this.model.position); break;
            case 2: relativeOffset.set(0, 1.1, 0.3); lookAtTarget = new THREE.Vector3(0, 1, 20).applyMatrix4(this.model.matrixWorld); break;
            case 3: relativeOffset.set(-6, 2, 0); lookAtTarget.copy(this.model.position); break;
            case 4: relativeOffset.set(6, 2, 0); lookAtTarget.copy(this.model.position); break;
        }
        const cameraPos = relativeOffset.applyMatrix4(this.model.matrixWorld);
        if (this.cameraMode >= 2) this.camera.position.copy(cameraPos);
        else this.camera.position.lerp(cameraPos, 0.05);
        this.camera.lookAt(lookAtTarget);
        
        const rearPos = new THREE.Vector3(0, 2.2, 1.5).applyMatrix4(this.model.matrixWorld);
        this.rearCamera.position.copy(rearPos);
        const rearLook = new THREE.Vector3(0, 1, -20).applyMatrix4(this.model.matrixWorld);
        this.rearCamera.lookAt(rearLook);
    }

    updateSmoke() {
        if (Math.abs(this.speed) > 0.002) { 
            this.smokeEmissionCounter++;
            if (this.smokeEmissionCounter % 15 === 0) {
                const particle = new THREE.Mesh(this.smokeGeometry, this.smokeMaterial.clone());
                const offset = new THREE.Vector3(0, 0.3, -2.5).applyMatrix4(this.model.matrixWorld);
                particle.position.copy(offset);
                particle.rotation.z = Math.random() * Math.PI * 2;
                particle.scale.set(0.4, 0.4, 0.4); 
                particle.userData = { life: 1.0, driftX: (Math.random() - 0.5) * 0.02, rotSpeed: (Math.random() - 0.5) * 0.03 };
                this.scene.add(particle);
                this.smokeParticles.push(particle);
            }
        }
        this.smokeParticles.forEach((p, index) => {
            p.position.y += 0.015; p.translateZ(-0.005); p.position.x += p.userData.driftX;
            p.rotation.z += p.userData.rotSpeed; p.scale.multiplyScalar(1.015); 
            p.userData.life -= 0.005; p.material.opacity = p.userData.life * 0.25; 
            p.lookAt(this.camera.position);
            if (p.userData.life <= 0) {
                this.scene.remove(p); p.material.dispose(); p.geometry.dispose();
                this.smokeParticles.splice(index, 1); 
            }
        });
    }
}