import * as THREE from 'three';

export class MissionManager {
    constructor(car, parkingSystem) {
        this.car = car;
        this.parkingSystem = parkingSystem;
        
        this.activeSlot = null;
        this.activeObstacles = []; 
        
        // State Misi
        this.missionLevel = 1;
        this.tutorialClosed = false;
        this.missionTime = 20;
        this.timerInterval = null;

        // --- UPDATE SPAWN POINT ---
        // Sesuai dengan posisi di Game.js (Entrance Corner)
        this.spawnPoint = new THREE.Vector3(20, 0, 45); 
        this.spawnRotation = Math.PI; // Menghadap ke dalam

        // State Parkir (3 Detik)
        this.parkingStartTime = null; 
        this.requiredParkingTime = 3000; 

        this.setupUI();
    }

    setupUI() {
        const closeBtn = document.getElementById("closeTutorial");
        if(closeBtn) {
            closeBtn.addEventListener("click", () => {
                document.getElementById("tutorialPopup").style.display = "none";
                this.tutorialClosed = true;
                setTimeout(() => this.showInstruction(1), 200);
            });
        }

        // --- TOMBOL RESPAWN ---
        const respawnBtn = document.getElementById("respawnBtn");
        if(respawnBtn) {
            respawnBtn.addEventListener("click", () => {
                // Jika tombol ditekan, panggil fungsi resetCar
                this.resetCar();
                
                // Opsional: Hilangkan fokus dari tombol agar saat tekan 'Space' (rem) tidak memicu tombol lagi
                respawnBtn.blur(); 
            });
        }

        this.timerUI = document.createElement("div");
        this.timerUI.style.cssText = "position:absolute; top:20px; right:20px; padding:20px 28px; background:rgba(0,0,0,0.7); color:#00ff00; font-size:36px; border-radius:12px; display:none; font-family: monospace; font-weight: bold;";
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

    startMission(level) {
        this.missionLevel = level;
        this.parkingStartTime = null; 
        this.parkingUI.style.display = "none";

        let targetIndex = 0;
        let density = 0; 

        if (level === 1) {
            targetIndex = 5; 
            density = 0.4;   
            alert("🅿️ MISI 1\n\nParkirkan mobil MUNDUR (Menghadap Keluar).\nTahan posisi selama 3 detik.");
        } 
        else if (level === 2) {
            targetIndex = 55; 
            density = 0.7;    
            alert("⏱️ MISI 2\n\nParkirkan di lokasi BARU dalam batas waktu!");
            this.startTimer();
        }

        this.setupLevel(targetIndex, density);
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
        if (!this.tutorialClosed || !this.car.model || !this.activeSlot) return;

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
            alert("✅ MISI 1 SELESAI\nParkir Sempurna!");
            this.resetCar();
            setTimeout(() => this.showInstruction(2), 500);
        } else if (this.missionLevel === 2) {
            this.stopTimer();
            alert("🎉 SELAMAT! SEMUA MISI SELESAI!");
            this.resetCar();
            setTimeout(() => this.showInstruction(1), 500);
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
                alert("⏰ WAKTU HABIS! Ulangi Misi.");
                this.resetCar();
                this.parkingStartTime = null; 
                this.parkingUI.style.display = "none";
                setTimeout(() => this.showInstruction(this.missionLevel), 500);
            }
        }, 1000);
    }

    stopTimer() { clearInterval(this.timerInterval); this.timerUI.style.display = "none"; }

    resetCar() {
        if (!this.car.model) return;
        
        // GUNAKAN SPAWN POINT YANG SUDAH DIUPDATE
        this.car.model.position.copy(this.spawnPoint);
        this.car.model.rotation.set(0, this.spawnRotation, 0); 
        
        // Reset Physics
        this.car.speed = 0;
        this.car.currentSteering = 0; 
        
        // Reset UI Parking
        this.parkingStartTime = null;
        this.parkingUI.style.display = "none";
    }
}