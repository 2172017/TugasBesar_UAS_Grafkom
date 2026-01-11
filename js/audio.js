import * as THREE from 'three';

export class AudioManager {
    // Terima loadingManager dari luar (misal dari main.js)
    constructor(camera, loadingManager) {
        // 1. Buat Listener
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        // 2. Gunakan Manager yang dikirim, atau buat baru jika tidak ada
        const manager = loadingManager || new THREE.DefaultLoadingManager;
        
        // 3. Pasang manager ke AudioLoader
        this.loader = new THREE.AudioLoader(manager);

        // Setup container suara
        this.engineSound = new THREE.Audio(this.listener);
        this.brakeSound = new THREE.Audio(this.listener);
        this.crashSound = new THREE.Audio(this.listener);
        this.bgm = new THREE.Audio(this.listener);
    }

    loadAll() {
        // A. Load Engine
        this.loader.load('./assets/audio/engine.mp3', (buffer) => {
            this.engineSound.setBuffer(buffer);
            this.engineSound.setLoop(true);
            this.engineSound.setVolume(0.3);
            
            // Loop adjustment logic
            const trimEndAmount = 0.5;
            if (buffer.duration > trimEndAmount) {
                this.engineSound.setLoopStart(0);
                this.engineSound.setLoopEnd(buffer.duration - trimEndAmount);
            }
            // HAPUS this.engineSound.play() dari sini agar tidak auto-start
        });

        // B. Load Brake
        this.loader.load('./assets/audio/brake.mp3', (buffer) => {
            this.brakeSound.setBuffer(buffer);
            this.brakeSound.setLoop(false);
            this.brakeSound.setVolume(0.5);
        });

        // C. Load Crash
        this.loader.load('./assets/audio/crash.mp3', (buffer) => {
            this.crashSound.setBuffer(buffer);
            this.crashSound.setLoop(false);
            this.crashSound.setVolume(0.8);
        });

        // D. Load BGM
        this.loader.load('./assets/audio/music.mp3', (buffer) => {
            this.bgm.setBuffer(buffer);
            this.bgm.setLoop(true);
            this.bgm.setVolume(0.5);
        });
    }

    // Panggil ini saat tombol "START GAME" ditekan atau Loading selesai
    startSystem() {
        // Browser butuh interaksi user untuk resume AudioContext
        if (this.listener.context.state === 'suspended') {
            this.listener.context.resume();
        }

        // Jalankan BGM
        if (!this.bgm.isPlaying && this.bgm.buffer) {
            this.bgm.play();
        }

        // Jalankan Engine (Idle)
        if (!this.engineSound.isPlaying && this.engineSound.buffer) {
            this.engineSound.play();
        }
    }

    stopBGM() {
        if (this.bgm.isPlaying) this.bgm.stop();
    }

    updateEngine(speed, maxSpeed) {
        if (!this.engineSound.isPlaying) return;

        const ratio = Math.abs(speed) / maxSpeed;
        const pitch = 0.8 + (ratio * 0.8); 
        this.engineSound.setPlaybackRate(pitch);
    }

    playBrake() {
        if (this.brakeSound.buffer && !this.brakeSound.isPlaying) {
            this.brakeSound.play();
        }
    }

    stopBrake() {
        if (this.brakeSound.isPlaying) {
            this.brakeSound.stop();
        }
    }

    playCrash() {
        if (this.crashSound.isPlaying) this.crashSound.stop();
        if (this.crashSound.buffer) this.crashSound.play();
    }

    toggleMute() {
        const currentVol = this.listener.getMasterVolume();
        if (currentVol > 0) {
            this.listener.setMasterVolume(0);
            return true; 
        } else {
            this.listener.setMasterVolume(1); 
            return false; 
        }
    }
}