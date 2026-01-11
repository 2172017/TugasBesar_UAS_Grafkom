import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { Fence } from '../objects/Fence.js';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        
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
        const loader = new THREE.TextureLoader();
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
        // Kita buat ukuran ground jauh lebih besar dari worldWidth/Depth
        const groundSize = 2000; 

        const loader = new THREE.TextureLoader();
        const path = './assets/textures/asphalt/';
        const loadTex = (f) => loader.load(path + f);
        const colorMap = loadTex('Asphalt025C_1K-JPG_Color.jpg');
        const normalMap = loadTex('Asphalt025C_1K-JPG_NormalGL.jpg'); 
        
        if(colorMap) { 
            colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping; 
            
            // Hitung repeat agar tekstur tidak melar saat diperbesar
            // Misal: aslinya skala 4x8 untuk area 50x100.
            // Maka rasionya adalah texture per ~12.5 unit.
            // 2000 / 12.5 = 160.
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
            const gltf = await this.loader.loadAsync('./assets/fence/fence.glb');
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            
            // Anggap lebar model pagar ada di sumbu X
            const fenceLength = box.max.x - box.min.x; 
            
            const halfW = this.worldWidth/2; 
            const halfD = this.worldDepth/2;
            
            // --- SOLUSI 1: MENGATASI OVERLAP SUDUT ---
            
            // A. Pagar Depan & Belakang (Sumbu X) - FULL WIDTH
            // Pagar ini akan menutupi sampai ujung kiri dan kanan.
            const countX = Math.ceil(this.worldWidth / fenceLength);
            
            // Geser sedikit startPos agar benar-benar centered jika hasil bagi tidak bulat
            // Atau mulai dari -halfW
            const startPosX = -halfW;
            
            for (let i = 0; i < countX; i++) {
                // Tambahkan fenceLength/2 karena pivot object biasanya di tengah
                const x = startPosX + (i * fenceLength) + (fenceLength/2);
                
                // Pastikan pagar tidak "lewat" jauh dari batas worldWidth (opsional, untuk kerapian)
                if (x > halfW + fenceLength) break;

                new Fence(this.scene, model, x, 0, halfD, Math.PI); // Depan (+Z)
                new Fence(this.scene, model, x, 0, -halfD, 0);       // Belakang (-Z)
            }

            // B. Pagar Kiri & Kanan (Sumbu Z) - INSIDE (Dimasukkan ke dalam)
            // Pagar ini dimulai SETELAH pagar depan, dan berhenti SEBELUM pagar belakang.
            // Kita kurangi panjang total loop sebesar 2x panjang pagar (atas & bawah)
            
            const innerDepth = this.worldDepth - (fenceLength * 1.8); // 1.8 untuk memberi sedikit toleransi overlap agar rapat
            const countZ = Math.ceil(innerDepth / fenceLength);
            
            // Start position dimulai agak menjorok ke dalam (bukan dari -halfD)
            // Start dari: -halfD + (panjang pagar satu blok)
            const startPosZ = -halfD + (fenceLength * 0.9); // 0.9 agar overlap sedikit supaya tidak bolong

            for (let i = 0; i < countZ; i++) {
                const z = startPosZ + (i * fenceLength) + (fenceLength/2);

                new Fence(this.scene, model, -halfW, 0, z, Math.PI / 2);  // Kiri
                new Fence(this.scene, model, halfW, 0, z, -Math.PI / 2);  // Kanan
            }

        } catch (error) {
            console.error(error);
        }
    }    
}