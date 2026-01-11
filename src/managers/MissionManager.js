import * as THREE from 'three';

export class MissionManager {
    constructor(car, parkingSystem, audioManager, loadingManager) {
        this.car = car;
        this.parkingSystem = parkingSystem;
        this.audioManager = audioManager;
        this.loadingManager = loadingManager;

        this.activeSlot = null;
        this.activeObstacles = []; 
        
        // State Misi
        this.missionLevel = 1;
        this.tutorialClosed = false;
        this.missionTime = 20;
        this.timerInterval = null;

        this.spawnPoint = new THREE.Vector3(20, 0, 45); 
        this.spawnRotation = Math.PI; 

        this.parkingStartTime = null; 
        this.requiredParkingTime = 3000; 

        this.setupUI();
    }

    setupUI() {
        // 1. BUAT ELEMEN CUSTOM POPUP
        // Z-Index diubah ke 5000 (agar di bawah Loading Screen yang biasanya 10000)
        this.msgPopup = document.createElement('div');
        this.msgPopup.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); display: none;
            justify-content: center; align-items: center; z-index: 5000;
            backdrop-filter: blur(5px);
        `;
        
        this.msgPopup.innerHTML = `
            <div style="
                background: linear-gradient(145deg, #1a1a1a, #2a2a2a); 
                padding: 30px; 
                border: 2px solid #00ff88; 
                border-radius: 15px; 
                text-align: center; 
                max-width: 400px; 
                width: 80%;
                color: white; 
                font-family: 'Segoe UI', sans-serif;
                box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
            ">
                <h2 id="msgTitle" style="margin-top: 0; color: #00ff88; font-size: 28px; text-transform: uppercase;">INFO</h2>
                <p id="msgBody" style="font-size: 18px; line-height: 1.6; color: #ddd; margin: 20px 0;">Message</p>
                <button id="msgBtn" style="
                    padding: 12px 30px; 
                    background: #00ff88; 
                    color: #000; 
                    border: none; 
                    font-weight: bold; 
                    cursor: pointer; 
                    font-size: 16px; 
                    border-radius: 8px;
                    transition: transform 0.1s;
                ">SIAP!</button>
            </div>
        `;
        document.body.appendChild(this.msgPopup);

        this.msgBtn = this.msgPopup.querySelector('#msgBtn');
        this.msgTitle = this.msgPopup.querySelector('#msgTitle');
        this.msgBody = this.msgPopup.querySelector('#msgBody');

        this.msgBtn.onmouseover = () => this.msgBtn.style.transform = "scale(1.05)";
        this.msgBtn.onmouseout = () => this.msgBtn.style.transform = "scale(1)";

        // 2. SETUP CLOSE TUTORIAL
        const closeBtn = document.getElementById("closeTutorial");
        if(closeBtn) {
            closeBtn.addEventListener("click", () => {
                const tutorialPopup = document.getElementById("tutorialPopup");
                if(tutorialPopup) tutorialPopup.style.display = "none";
                
                this.tutorialClosed = true; // Tandai tutorial sudah ditutup
                
                // --- FIX ERROR AUDIO ---
                // Cek apakah function playBGM benar-benar ada sebelum dipanggil
                if (this.audioManager && typeof this.audioManager.playBGM === 'function') {
                    this.audioManager.playBGM();
                } else {
                    console.warn("AudioManager: playBGM method not found. Check audio.js");
                }
                
                // PANGGIL ULANG MISI 1 (Popup akan muncul karena tutorialClosed = true)
                setTimeout(() => this.showInstruction(1), 200);
            });
        }

        const respawnBtn = document.getElementById("respawnBtn");
        if(respawnBtn) {
            respawnBtn.addEventListener("click", () => {
                this.resetCar();
                respawnBtn.blur(); 
            });
        }

        const soundBtn = document.getElementById("soundBtn");
        if (soundBtn && this.audioManager) {
            soundBtn.addEventListener("click", () => {
                const isMuted = this.audioManager.toggleMute();
                if (isMuted) {
                    soundBtn.innerText = "🔇 Sound: OFF";
                    soundBtn.style.color = "#ff4444"; 
                    soundBtn.style.borderColor = "#ff4444";
                } else {
                    soundBtn.innerText = "🔊 Sound: ON";
                    soundBtn.style.color = "white"; 
                    soundBtn.style.borderColor = "white";
                }
                soundBtn.blur(); 
            });
        }

        // --- PERBAIKAN POSISI TIMER ---
        this.timerUI = document.createElement("div");
        // top diubah menjadi 150px (cukup jauh di bawah tombol kanan atas)
        this.timerUI.style.cssText = "position:absolute; top:150px; right:20px; padding:20px 28px; background:rgba(0,0,0,0.7); color:#00ff00; font-size:36px; border-radius:12px; display:none; font-family: monospace; font-weight: bold; z-index: 100;";
        document.body.appendChild(this.timerUI);

        this.parkingUI = document.createElement("div");
        this.parkingUI.style.cssText = `
            position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); 
            color: white; font-size: 64px; font-weight: 900; 
            text-shadow: 0px 0px 20px rgba(0,0,0,0.8); text-align: center;
            display: none; font-family: Arial, sans-serif; pointer-events: none;
        `;
        document.body.appendChild(this.parkingUI);
    }

    showPopup(title, message, callback) {
        this.msgTitle.innerText = title;
        this.msgBody.innerHTML = message.replace(/\n/g, '<br>');
        this.msgPopup.style.display = 'flex';

        this.msgBtn.onclick = () => {
            this.msgPopup.style.display = 'none';
            if (callback) callback(); 
        };
    }

    startMission(level) {
        // --- LOGIC POPUP ---
        // Jika Tutorial BELUM ditutup (awal game saat loading), jangan lakukan apa-apa.
        // Popup hanya boleh muncul setelah user menutup Tutorial HTML.
        if (!this.tutorialClosed) return;

        this.missionLevel = level;
        this.parkingStartTime = null; 
        this.parkingUI.style.display = "none";

        let targetIndex = 0;
        let density = 0; 
        
        if (level === 1) {
            targetIndex = 5; 
            density = 0.4;   
            
            this.showPopup(
                "🅿️ MISI 1", 
                "Parkirkan mobil MUNDUR (Menghadap Keluar).\nTahan posisi selama 3 detik.", 
                () => {
                    this.setupLevel(targetIndex, density);
                }
            );
        } 
        else if (level === 2) {
            targetIndex = 55; 
            density = 0.7;    
            
            this.showPopup(
                "⏱️ MISI 2", 
                "Parkirkan di lokasi BARU dalam batas waktu!", 
                () => {
                    this.setupLevel(targetIndex, density);
                    this.startTimer(); 
                }
            );
        }
    }

    setupLevel(targetIndex, density) {
        const slots = this.parkingSystem.getAllSlots();
        this.activeObstacles = []; 

        slots.forEach((slot, index) => {
            slot.setTarget(false); 
            slot.removeDummy();    
            
            if (index === targetIndex) {
                slot.setTarget(true, this.parkingSystem.hologramMaterial, this.parkingSystem.wireframeMaterial);
                this.activeSlot = slot;
            } 
            else {
                if (Math.random() < density) {
                    slot.spawnDummy();
                    if (slot.dummyCar) {
                        this.activeObstacles.push(slot.dummyCar);
                    }
                }
            }
        });
    }

    getObstacles() { return this.activeObstacles; }

    showInstruction(level) { this.startMission(level); }

    check() {
        // Pastikan tidak mengecek saat popup info sedang tampil
        if (!this.tutorialClosed || !this.car.model || !this.activeSlot) return;
        if (this.msgPopup.style.display === 'flex') return;

        const targetPos = this.activeSlot.getWorldPosition();
        const carPos = this.car.model.position;
        const distance = new THREE.Vector2(carPos.x - targetPos.x, carPos.z - targetPos.z).length();
        const inZone = distance < 1.5; 
        const isStopped = Math.abs(this.car.speed) < 0.005;

        const carDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.car.model.quaternion);
        carDir.y = 0; carDir.normalize();
        const slotDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.activeSlot.getRotationY());
        slotDir.normalize();
        
        const angle = carDir.angleTo(slotDir);
        const isFacingOut = angle < 0.8;

        const isCorrectPosition = inZone && isStopped && isFacingOut;

        if (isCorrectPosition) {
            if (this.parkingStartTime === null) this.parkingStartTime = Date.now();
            const elapsed = Date.now() - this.parkingStartTime;
            const remaining = Math.max(0, Math.ceil((this.requiredParkingTime - elapsed) / 1000));

            this.parkingUI.style.display = "block";
            if (remaining > 0) {
                this.parkingUI.innerHTML = `<span style="font-size:32px">PARKING...</span><br>${remaining}`;
                this.parkingUI.style.color = "white";
            } else {
                this.parkingUI.innerHTML = "OK!";
                this.parkingUI.style.color = "#00ff00";
            }

            if (elapsed >= this.requiredParkingTime) {
                this.completeMission();
                this.parkingStartTime = null; 
                this.parkingUI.style.display = "none";
            }
        } else {
            this.parkingStartTime = null;
            this.parkingUI.style.display = "none";
        }

        if (this.activeSlot.hologramMesh) {
            const pulse = Date.now() * 0.005;
            const mat = this.activeSlot.hologramMesh.material;
            if (inZone && !isFacingOut) {
                mat.color.setHex(0xff0000); 
                mat.opacity = 0.4 + (Math.sin(pulse * 10) * 0.2);
            } else if (isCorrectPosition) {
                mat.color.setHex(0x00ff00); mat.opacity = 0.6;
            } else {
                mat.color.setHex(0x00ff00); mat.opacity = 0.15 + (Math.sin(pulse) * 0.1);
            }
        }
    }

    completeMission() {
        if (this.missionLevel === 1) {
            this.showPopup("✅ SELESAI", "Parkir Sempurna! Lanjut ke Level 2.", () => {
                this.resetCar();
                setTimeout(() => this.showInstruction(2), 200);
            });
        } else if (this.missionLevel === 2) {
            this.stopTimer();
            this.showPopup("🎉 TAMAT!", "SELAMAT! SEMUA MISI SELESAI!", () => {
                this.resetCar();
                setTimeout(() => this.showInstruction(1), 200);
            });
        }
    }

    startTimer() {
        this.stopTimer();
        this.missionTime = 60; 
        this.timerUI.style.display = "block";
        this.timerUI.innerText = "⏱️ " + this.missionTime;
        this.timerInterval = setInterval(() => {
            this.missionTime--;
            this.timerUI.innerText = "⏱️ " + this.missionTime;
            if (this.missionTime <= 0) {
                this.stopTimer();
                
                this.showPopup("⏰ WAKTU HABIS!", "Jangan menyerah, coba lagi!", () => {
                    this.resetCar();
                    this.parkingStartTime = null; 
                    this.parkingUI.style.display = "none";
                    setTimeout(() => this.showInstruction(this.missionLevel), 200);
                });
            }
        }, 1000);
    }

    stopTimer() { clearInterval(this.timerInterval); this.timerUI.style.display = "none"; }

    resetCar() {
        if (!this.car.model) return;
        
        this.car.model.position.copy(this.spawnPoint);
        this.car.model.rotation.set(0, this.spawnRotation, 0); 
        
        this.car.speed = 0;
        this.car.currentSteering = 0; 
        
        this.parkingStartTime = null;
        this.parkingUI.style.display = "none";
    }
}