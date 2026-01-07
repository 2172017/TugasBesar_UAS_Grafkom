import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.setupSkybox();
        this.setupLights();
        this.setupGround();
    }

    setupSkybox() {
        // 1. SETUP KABUT (FOG)
        this.scene.fog = new THREE.Fog(0xcccccc, 30, 150);

        // 2. LOAD TEXTURE
        const loader = new THREE.TextureLoader();
        loader.setPath('./assets/textures/skybox/');

        const materials = [
            'px.png', 'nx.png',
            'py.png', 'ny.png',
            'pz.png', 'nz.png'
        ].map(filename => {
            return new THREE.MeshBasicMaterial({
                map: loader.load(filename),
                
                // ========================================================
                // PERBAIKAN: GANTI BackSide JADI DoubleSide
                // ========================================================
                side: THREE.DoubleSide, // Agar terlihat walau kamera dibalik (spion)
                
                fog: false 
            });
        });

        // 3. BUAT KOTAK RAKSASA
        const geometry = new THREE.BoxGeometry(10000, 10000, 10000);
        const skyboxMesh = new THREE.Mesh(geometry, materials);

        this.scene.add(skyboxMesh);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        
        this.scene.add(dirLight);
    }

    setupGround() {
        const loader = new THREE.TextureLoader();
        
        // ====================================================
        // PERBAIKAN PATH: floor -> asphalt
        // ====================================================
        const path = './assets/textures/asphalt/'; // Path dasar

        // Fungsi helper untuk load dan cek error di console
        const loadTex = (fileName) => {
            return loader.load(path + fileName, 
                () => {}, // OnLoad
                undefined, 
                (err) => console.error(`Gagal memuat texture: ${fileName}`, err) // OnError
            );
        };

        const colorMap = loadTex('Asphalt025C_1K-JPG_Color.jpg');
        const normalMap = loadTex('Asphalt025C_1K-JPG_NormalGL.jpg');
        const roughnessMap = loadTex('Asphalt025C_1K-JPG_Roughness.jpg');
        const aoMap = loadTex('Asphalt025C_1K-JPG_AmbientOcclusion.jpg'); 

        // --- ATUR REPEAT / TILING ---
        const repeatSize = 15; 

        [colorMap, normalMap, roughnessMap, aoMap].forEach(tex => {
            if(tex) {
                tex.wrapS = THREE.RepeatWrapping; 
                tex.wrapT = THREE.RepeatWrapping; 
                tex.repeat.set(repeatSize, repeatSize); 
            }
        });

        const material = new THREE.MeshStandardMaterial({ 
            map: colorMap,
            normalMap: normalMap,     
            normalScale: new THREE.Vector2(1, 1), 
            roughnessMap: roughnessMap, 
            roughness: 1, 
            aoMap: aoMap,
            aoMapIntensity: 1, 
            side: THREE.DoubleSide
        });

        const geometry = new THREE.PlaneGeometry(200, 200);
        geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));

        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2; 
        ground.position.y = 0;
        ground.receiveShadow = true; 
        
        this.scene.add(ground);
    }
}