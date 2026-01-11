import * as THREE from 'three';
import { Environment } from '../world/Environment.js';
import { ParkingSystem } from '../objects/ParkingSystem.js';
import { Car } from '../objects/Car.js';
import { MissionManager } from '../managers/MissionManager.js';
// 1. IMPORT CLASS OBSTACLE BARU
import { Obstacle } from '../objects/Obstacle.js'; 

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        
        // Main Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 20000);
        
        // Rear Camera (Spion)
        this.rearCamera = new THREE.PerspectiveCamera(60, 2.5, 0.1, 20000);

        // Minimap Camera
        this.miniMapCamera = new THREE.OrthographicCamera(-30, 30, 30, -30, 1, 100);
        this.miniMapCamera.position.set(0, 50, 0);
        this.miniMapCamera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setScissorTest(true);
        document.body.appendChild(this.renderer.domElement);

        // Init Components
        this.env = new Environment(this.scene);
        this.parking = new ParkingSystem(this.scene);

        // Masukkan flag debug ke mobil
        this.car = new Car(this.scene, this.camera, this.rearCamera);

        // Buat Obstacle manual (bukan dari environment)
        // Posisi X=5, Z=0
        this.obstacleObject = new Obstacle(this.scene, 5, 0);

        // =========================================

        // Setup Level Parkir
        this.parking.createRow(8, 20, 0.5, -1); 
        this.targetSlot = this.parking.createRow(-8, 20, 0.5, 3); 

        // Init Mission
        this.mission = new MissionManager(this.car, this.targetSlot);

        this.setupDebugButton();

        window.addEventListener('resize', () => this.onResize());
        this.animate();
    }

    setupDebugButton() {
        const btn = document.getElementById('debugBtn');
        let isDebugOn = false;

        if (btn) {
            btn.addEventListener('click', () => {
                isDebugOn = !isDebugOn; // Toggle status
                
                // Ubah Teks Tombol
                btn.innerText = isDebugOn ? "Hitbox: ON" : "Hitbox: OFF";
                btn.style.color = isDebugOn ? "#00ff00" : "white";
                btn.style.borderColor = isDebugOn ? "#00ff00" : "white";

                // Aktifkan visualisasi di Mobil & Obstacle
                this.car.setDebug(isDebugOn);
                if (this.obstacleObject) {
                    this.obstacleObject.setDebug(isDebugOn);
                }
            });
        }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // =========================================
        // 3. UPDATE LOGIC DENGAN OBSTACLE BARU
        // =========================================
        // Kita ambil collider dari this.obstacleObject, BUKAN this.env
        if (this.obstacleObject && this.obstacleObject.obb) {
            this.car.update(this.obstacleObject.obb);
        } else {
            this.car.update();
        }
        
        this.mission.check();

        // 1. BERSIHKAN LAYAR
        this.renderer.setScissorTest(false);
        this.renderer.clear(); 
        this.renderer.setScissorTest(true);

        const w = window.innerWidth;
        const h = window.innerHeight;

        // 2. RENDER MAIN CAMERA
        this.renderer.setViewport(0, 0, w, h);
        this.renderer.setScissor(0, 0, w, h);
        this.renderer.render(this.scene, this.camera);

        // 3. RENDER SPION
        const mw = w * 0.25;      
        const mh = h * 0.15;      
        const mx = (w/2) - (mw/2); 
        const my = h - mh - 20;    

        this.rearCamera.aspect = mw / mh;
        this.rearCamera.updateProjectionMatrix();
        this.rearCamera.projectionMatrix.scale(new THREE.Vector3(-1, 1, 1)); 
        
        this.renderer.setViewport(mx, my, mw, mh);
        this.renderer.setScissor(mx, my, mw, mh);
        this.renderer.render(this.scene, this.rearCamera);

        // 4. RENDER MINIMAP
        this.renderer.setViewport(20, 20, 200, 200);
        this.renderer.setScissor(20, 20, 200, 200);
        this.renderer.render(this.scene, this.miniMapCamera);

        this.renderer.setScissorTest(false);
    }
}