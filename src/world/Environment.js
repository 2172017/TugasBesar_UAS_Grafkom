import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { Fence } from '../objects/Fence.js';

export class Environment {
    // 1. Terima loadingManager di sini
    constructor(scene, loadingManager) {
        this.scene = scene;
        this.loadingManager = loadingManager; // Simpan referensi (opsional, tapi good practice)
        
        // 2. Gunakan loadingManager pada GLTFLoader
        this.loader = new GLTFLoader(this.loadingManager);
        
        // VARIABEL ENVIRONMENT (Area Parkir Utama)
        this.worldWidth = 50;  
        this.worldDepth = 100; 
        
        this.borders = [];
        this.debugMeshes = [];

        // SETUP ENVIRONMENT
        this.setupSkybox();
        this.setupLights();
        this.setupGround();
        this.setupFences();

        // BORDER COLLISION
        this.setupBorderCollision();
    }

    setupBorderCollision() {
        const thickness = 2; 
        const height = 5;    

        const halfW = this.worldWidth / 2;
        const halfD = this.worldDepth / 2;

        const createBorderOBB = (x, z, w, d) => {
            const obb = new OBB();
            obb.center.set(x, height / 2, z);
            obb.halfSize.set(w / 2, height / 2, d / 2);
            obb.rotation.identity();
            return obb;
        };

        this.borders.push(createBorderOBB(halfW, 0, thickness, this.worldDepth));
        this.borders.push(createBorderOBB(-halfW, 0, thickness, this.worldDepth));
        this.borders.push(createBorderOBB(0, halfD, this.worldWidth, thickness));
        this.borders.push(createBorderOBB(0, -halfD, this.worldWidth, thickness));

        // VISUALISASI DEBUG
        this.borders.forEach(obb => {
            const geo = new THREE.BoxGeometry(obb.halfSize.x * 2, obb.halfSize.y * 2, obb.halfSize.z * 2);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(obb.center);
            mesh.visible = false; 
            this.scene.add(mesh);
            this.debugMeshes.push(mesh);
        });
    }

    setDebug(isActive) {
        this.debugMeshes.forEach(mesh => {
            mesh.visible = isActive;
        });
    }

    getBorders() {
        return this.borders;
    }

    setupSkybox() {
        this.scene.fog = new THREE.Fog(0xcccccc, 20, 120);
        
        // 3. Gunakan loadingManager pada TextureLoader Skybox
        const loader = new THREE.TextureLoader(this.loadingManager);
        loader.setPath('./assets/textures/skybox/');

        const materials = [
            'px.png', 'nx.png',
            'py.png', 'ny.png',
            'pz.png', 'nz.png'
        ].map(filename => {
            return new THREE.MeshBasicMaterial({
                map: loader.load(filename),
                side: THREE.DoubleSide,
                fog: false 
            });
        });

        const geometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyboxMesh = new THREE.Mesh(geometry, materials);
        this.scene.add(skyboxMesh);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(30, 60, 30);
        dirLight.castShadow = true;
        
        dirLight.shadow.camera.left = -40;
        dirLight.shadow.camera.right = 40;
        dirLight.shadow.camera.top = 60;
        dirLight.shadow.camera.bottom = -60;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        
        this.scene.add(dirLight);
    }

    setupGround() {
        // --- SOLUSI 2: GROUND "INFINITE" ---
        const groundSize = 2000; 

        // 4. Gunakan loadingManager pada TextureLoader Ground
        const loader = new THREE.TextureLoader(this.loadingManager);
        
        const path = './assets/textures/asphalt/';
        const loadTex = (f) => loader.load(path + f);
        const colorMap = loadTex('Asphalt025C_1K-JPG_Color.jpg');
        const normalMap = loadTex('Asphalt025C_1K-JPG_NormalGL.jpg'); 
        
        if(colorMap) { 
            colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping; 
            
            const repeatVal = groundSize / 12.5; 
            colorMap.repeat.set(repeatVal, repeatVal); 
        }
        
        const material = new THREE.MeshStandardMaterial({ 
            map: colorMap, normalMap: normalMap, side: THREE.DoubleSide 
        });

        const geometry = new THREE.PlaneGeometry(groundSize, groundSize);
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2; 
        ground.receiveShadow = true; 
        this.scene.add(ground);
    }

    async setupFences() {
        try {
            // Loader ini (this.loader) sudah menggunakan loadingManager dari constructor
            const gltf = await this.loader.loadAsync('./assets/fence/fence.glb');
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            
            const fenceLength = box.max.x - box.min.x; 
            
            const halfW = this.worldWidth/2; 
            const halfD = this.worldDepth/2;
            
            // A. Pagar Depan & Belakang (Sumbu X)
            const countX = Math.ceil(this.worldWidth / fenceLength);
            const startPosX = -halfW;
            
            for (let i = 0; i < countX; i++) {
                const x = startPosX + (i * fenceLength) + (fenceLength/2);
                if (x > halfW + fenceLength) break;

                new Fence(this.scene, model, x, 0, halfD, Math.PI); 
                new Fence(this.scene, model, x, 0, -halfD, 0);       
            }

            // B. Pagar Kiri & Kanan (Sumbu Z)
            const innerDepth = this.worldDepth - (fenceLength * 1.8); 
            const countZ = Math.ceil(innerDepth / fenceLength);
            
            const startPosZ = -halfD + (fenceLength * 0.9); 

            for (let i = 0; i < countZ; i++) {
                const z = startPosZ + (i * fenceLength) + (fenceLength/2);

                new Fence(this.scene, model, -halfW, 0, z, Math.PI / 2);  
                new Fence(this.scene, model, halfW, 0, z, -Math.PI / 2);  
            }

        } catch (error) {
            console.error("Error loading fence:", error);
        }
    }    
}