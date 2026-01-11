import * as THREE from 'three';
import { Environment } from '../world/Environment.js';
import { ParkingSystem } from '../objects/ParkingSystem.js';
import { Car } from '../objects/Car.js';
import { MissionManager } from '../managers/MissionManager.js';
import { Obstacle } from '../objects/Obstacle.js'; 

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        
        // =========================================
        // SETUP CAMERA
        // =========================================
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

        // =========================================
        // INIT COMPONENTS & WORLD
        // =========================================

        // Environment
        this.env = new Environment(this.scene);

        //Parking System
        this.parking = new ParkingSystem(this.scene);
        this.parking.generateParkingArea();

        // --- UPDATE SPAWN POINT ---
        // Posisi di pojok kanan "depan" (dekat Z=50)
        const startX = 20; 
        const startZ = 45; 
        
        // ROTASI DIPERBAIKI:
        // Gunakan Math.PI (180 derajat) agar berputar menghadap ke dalam area parkir (arah negatif Z)
        const startRot = Math.PI; 

        this.car = new Car(this.scene, this.camera, this.rearCamera, startX, startZ, startRot);

        // Init Mission
        this.mission = new MissionManager(this.car, this.parking);
        this.mission.startMission(1);

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

                // Aktifkan visualisasi di Mobil & Environment
                this.car.setDebug(isDebugOn);
                this.env.setDebug(isDebugOn);

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
        // 1. UPDATE LOGIC
        // =========================================
        const currentObstacles = this.mission.getObstacles();
        const currentBorders = this.env.getBorders();

        if (this.car) {
            this.car.update(currentObstacles, currentBorders);
        }
        
        if (this.mission) {
            this.mission.check();
        }

        // Update Posisi Minimap agar mengikuti mobil
        if (this.car.model) {
            this.miniMapCamera.position.x = this.car.model.position.x;
            this.miniMapCamera.position.z = this.car.model.position.z;
            this.miniMapCamera.lookAt(this.car.model.position.x, 0, this.car.model.position.z);
        }

        // =========================================
        // 2. RENDERING PIPELINE
        // =========================================

        this.renderer.setScissorTest(false);
        this.renderer.clear(); 
        this.renderer.setScissorTest(true);

        const w = window.innerWidth;
        const h = window.innerHeight;

        // RENDER MAIN CAMERA
        this.renderer.setViewport(0, 0, w, h);
        this.renderer.setScissor(0, 0, w, h);
        this.renderer.render(this.scene, this.camera);

        // RENDER SPION (REAR MIRROR)
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

        // RENDER MINIMAP
        this.renderer.setViewport(20, 20, 200, 200);
        this.renderer.setScissor(20, 20, 200, 200);
        this.renderer.render(this.scene, this.miniMapCamera);

        this.renderer.setScissorTest(false);
    }
}