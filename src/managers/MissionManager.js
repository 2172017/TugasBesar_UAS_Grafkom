import * as THREE from 'three';

export class MissionManager {
    constructor(car, targetSlot) {
        this.car = car;
        this.targetSlot = targetSlot;
        
        // State
        this.missionLevel = 1;
        this.tutorialClosed = false;
        this.missionTime = 20;
        this.timerInterval = null;
        this.canMove = true;
        this.spawnPoint = new THREE.Vector3(0, 0, 16);

        // UI Elements
        this.setupUI();
    }

    setupUI() {
        // Setup Tutorial
        const closeBtn = document.getElementById("closeTutorial");
        if(closeBtn) {
            closeBtn.addEventListener("click", () => {
                document.getElementById("tutorialPopup").style.display = "none";
                this.tutorialClosed = true;
                setTimeout(() => this.showInstruction(1), 200);
            });
        }

        // Setup Timer UI
        this.timerUI = document.createElement("div");
        this.timerUI.style.cssText = "position:absolute; top:20px; right:20px; padding:20px 28px; background:rgba(0,0,0,0.7); color:#00ff00; font-size:36px; border-radius:12px; display:none;";
        document.body.appendChild(this.timerUI);
    }

    showInstruction(level) {
        if (level === 1) {
            alert("🅿️ MISI 1\n\nParkirkan mobil pada kotak HIJAU.\nPastikan berhenti total.");
        } else if (level === 2) {
            alert("⏱️ MISI 2\n\nParkirkan ke kotak HIJAU sebelum waktu HABIS!");
            this.startTimer();
        }
    }

    check() {
        // Cek validasi dasar
        if (!this.tutorialClosed || !this.car.model || !this.targetSlot) return;

        // 1. AMBIL POSISI DUNIA (WORLD POSITION)
        // Kita tidak bisa pakai .position biasa karena slot ada di dalam Group
        const targetWorldPos = new THREE.Vector3();
        this.targetSlot.getWorldPosition(targetWorldPos);

        const carPos = this.car.model.position;

        // 2. HITUNG JARAK 2D (HANYA X DAN Z)
        // Kita abaikan sumbu Y (tinggi) agar perbedaan tinggi ban tidak mempengaruhi misi
        const dx = carPos.x - targetWorldPos.x;
        const dz = carPos.z - targetWorldPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // 3. LOGIKA DETEKSI
        // Jarak < 2.0 (Agak longgar biar gampang)
        // Speed < 0.005 (Benar-benar berhenti)
        const inZone = distance < 2.0; 
        const isStopped = Math.abs(this.car.speed) < 0.005;

        // DEBUGGING (Buka Console F12 untuk melihat angka jarak)
        // console.log(`Jarak: ${distance.toFixed(2)} | Speed: ${this.car.speed.toFixed(4)}`);

        // ANIMASI PULSING TARGET
        if (this.targetSlot) {
            const pulse = Date.now() * 0.005;
            this.targetSlot.material.emissiveIntensity = 1.0 + Math.sin(pulse) * 0.5;
        }

        // LOGIKA PENYELESAIAN MISI
        if (inZone && isStopped) {
            if (this.missionLevel === 1) {
                alert("✅ MISI 1 SELESAI");
                this.missionLevel = 2;
                this.resetCar();
                setTimeout(() => this.showInstruction(2), 500);
            } 
            else if (this.missionLevel === 2) {
                this.stopTimer();
                alert("🎉 SELAMAT! SEMUA MISI SELESAI!");
                this.missionLevel = 1;
                this.resetCar();
                setTimeout(() => this.showInstruction(1), 500);
            }
        }
    }

    startTimer() {
        this.stopTimer();
        this.missionTime = 20;
        this.timerUI.style.display = "block";
        this.timerUI.innerText = "⏱️ " + this.missionTime;
        
        this.timerInterval = setInterval(() => {
            this.missionTime--;
            this.timerUI.innerText = "⏱️ " + this.missionTime;
            if (this.missionTime <= 0) {
                this.stopTimer();
                alert("⏰ WAKTU HABIS! Ulangi Misi.");
                this.resetCar();
                setTimeout(() => this.showInstruction(2), 500);
            }
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
        this.timerUI.style.display = "none";
    }

    resetCar() {
        this.car.model.position.copy(this.spawnPoint);
        this.car.model.rotation.set(0, Math.PI, 0);
        this.car.speed = 0;
    }
}