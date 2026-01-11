import * as THREE from 'three';
import { Environment } from '../world/Environment.js';
import { ParkingSystem } from '../objects/ParkingSystem.js';
import { Car } from '../objects/Car.js';
import { MissionManager } from '../managers/MissionManager.js';
import { AudioManager } from '../../js/audio.js';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        
        // 1. SETUP LOADING MANAGER (BARU)
        // ==============================
        this.loadingManager = new THREE.LoadingManager();
        this.setupLoadingUI(); // Fungsi untuk mengatur update tampilan HTML

        // =========================================
        // SETUP CAMERA & RENDERER (Sama seperti sebelumnya)
        // =========================================
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 20000);
        this.rearCamera = new THREE.PerspectiveCamera(60, 2.5, 0.1, 20000);
        
        this.miniMapCamera = new THREE.OrthographicCamera(-30, 30, 30, -30, 1, 100);
        this.miniMapCamera.position.set(0, 50, 0);
        this.miniMapCamera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setScissorTest(true);
        document.body.appendChild(this.renderer.domElement);

        // =========================================
        // INIT COMPONENTS (Kirim loadingManager ke sini)
        // =========================================

        // Kirim manager ke Audio
        // Pastikan constructor AudioManager menerima parameter kedua (manager)
        this.audioManager = new AudioManager(this.camera, this.loadingManager);
        this.audioManager.loadAll();

        // Kirim manager ke Environment (untuk TextureLoader/GLTFLoader di sana)
        this.env = new Environment(this.scene, this.loadingManager);

        this.parking = new ParkingSystem(this.scene, this.loadingManager);
        this.parking.generateParkingArea();

        // Setup Mobil
        const startX = 20; 
        const startZ = 45; 
        const startRot = Math.PI; 

        // Kirim manager ke Car (jika Car memuat model 3D sendiri)
        this.car = new Car(this.scene, this.camera, this.rearCamera, startX, startZ, startRot, this.audioManager, this.loadingManager);

        this.mission = new MissionManager(this.car, this.parking, this.audioManager, this.loadingManager);
        this.mission.startMission(1);

        this.setupDebugButton();

        const closeTutBtn = document.getElementById('closeTutorial');
        const tutPopup = document.getElementById('tutorialPopup');
        
        if (closeTutBtn && tutPopup) {
            closeTutBtn.addEventListener('click', () => {
                tutPopup.style.opacity = '0';
                setTimeout(() => {
                    tutPopup.style.display = 'none';
                    // Opsional: Bunyikan suara klik UI di sini jika ada
                    // this.audioManager.playClick(); 
                }, 300);
            });
        }

        window.addEventListener('resize', () => this.onResize());
        this.animate();
    }

    // =========================================
    // LOGIKA LOADING SCREEN
    // =========================================
    setupLoadingUI() {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingText = document.querySelector('.loading-text');
        const loader = document.querySelector('.loader'); // <--- 1. Ambil elemen spinner
        const tutorialPopup = document.getElementById('tutorialPopup');
        
        // Sembunyikan tutorial di awal
        if(tutorialPopup) tutorialPopup.style.display = 'none';

        // SAAT LOADING BERJALAN
        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const progress = Math.round((itemsLoaded / itemsTotal) * 100);
            if(loadingText) loadingText.innerText = `MEMUAT... ${progress}%`;
        };

        // SAAT LOADING SELESAI
        this.loadingManager.onLoad = () => {
            console.log('Loading Complete!');
            
            // 2. HILANGKAN SPINNER (Loader)
            if (loader) {
                loader.style.display = 'none'; 
            }

            // 3. UBAH TEKS JADI TOMBOL/INSTRUKSI
            if(loadingText) {
                loadingText.innerText = "▶ KLIK LAYAR UNTUK MULAI";
                // Styling agar terlihat seperti tombol/ajakan
                loadingText.style.fontWeight = "bold";
                loadingText.style.fontSize = "24px";
                loadingText.style.color = "#00ff88"; 
                loadingText.style.border = "2px solid #00ff88";
                loadingText.style.padding = "15px 30px";
                loadingText.style.borderRadius = "50px";
                loadingText.style.background = "rgba(0, 255, 136, 0.1)";
                loadingText.style.cursor = "pointer";
                loadingText.style.transition = "all 0.3s";
                
                // Efek hover sederhana lewat JS (opsional)
                loadingText.onmouseover = () => {
                    loadingText.style.background = "rgba(0, 255, 136, 0.3)";
                    loadingText.style.transform = "scale(1.05)";
                };
                loadingText.onmouseout = () => {
                    loadingText.style.background = "rgba(0, 255, 136, 0.1)";
                    loadingText.style.transform = "scale(1)";
                };
            }

            // Ubah cursor layar loading jadi pointer
            if(loadingScreen) loadingScreen.style.cursor = "pointer";

            // FUNGSI SAAT DIKLIK
            const onStartClick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Start Audio & System
                this.audioManager.startSystem();

                // Hilangkan Loading Screen
                if(loadingScreen) {
                    loadingScreen.style.opacity = '0';
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                        
                        // Tampilkan Tutorial setelah loading hilang
                        if(tutorialPopup) {
                            tutorialPopup.style.display = 'flex';
                            tutorialPopup.style.opacity = '0';
                            requestAnimationFrame(() => {
                                tutorialPopup.style.transition = 'opacity 0.3s';
                                tutorialPopup.style.opacity = '1';
                            });
                        }
                    }, 500);
                }
            };

            // Pasang Listener Klik
            if (loadingScreen) {
                loadingScreen.addEventListener('click', onStartClick, { once: true });
            }
        };

        this.loadingManager.onError = (url) => {
            console.error('Error loading ' + url);
            if(loadingText) loadingText.innerText = "ERROR MEMUAT ASET";
        };
    }

    setupDebugButton() {
        const btn = document.getElementById('debugBtn');
        let isDebugOn = false;
        if (btn) {
            btn.addEventListener('click', () => {
                isDebugOn = !isDebugOn;
                btn.innerText = isDebugOn ? "Hitbox: ON" : "Hitbox: OFF";
                btn.style.color = isDebugOn ? "#00ff00" : "white";
                btn.style.borderColor = isDebugOn ? "#00ff00" : "white";
                
                this.car.setDebug(isDebugOn);
                this.env.setDebug(isDebugOn);

                // Dispatch Event agar main.js tahu (sesuai diskusi sebelumnya)
                const event = new CustomEvent('toggleDebug', { detail: { debug: isDebugOn } });
                window.dispatchEvent(event);
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

        const currentObstacles = this.mission.getObstacles();
        const currentBorders = this.env.getBorders();

        if (this.car) this.car.update(currentObstacles, currentBorders);
        if (this.mission) this.mission.check();

        if (this.car.model) {
            this.miniMapCamera.position.x = this.car.model.position.x;
            this.miniMapCamera.position.z = this.car.model.position.z;
            this.miniMapCamera.lookAt(this.car.model.position.x, 0, this.car.model.position.z);
        }

        this.renderer.setScissorTest(false);
        this.renderer.clear(); 
        this.renderer.setScissorTest(true);

        const w = window.innerWidth;
        const h = window.innerHeight;

        // MAIN CAMERA
        this.renderer.setViewport(0, 0, w, h);
        this.renderer.setScissor(0, 0, w, h);
        this.renderer.render(this.scene, this.camera);

        // SPION
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

        // MINIMAP
        this.renderer.setViewport(20, 20, 200, 200);
        this.renderer.setScissor(20, 20, 200, 200);
        this.renderer.render(this.scene, this.miniMapCamera);

        this.renderer.setScissorTest(false);
    }
}