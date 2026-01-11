import * as THREE from 'three';
import { ParkingSlot } from './ParkingSlot.js';
// 1. WAJIB IMPORT INI
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ParkingSystem {
    constructor(scene, loadingManager) {
        this.scene = scene;
        this.loadingManager = loadingManager; // Simpan manager
        this.slots = [];
        
        // Definisi ukuran slot (Default)
        this.slotWidth = 3;
        this.slotDepth = 6;

        this.lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.hologramMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, transparent: true, opacity: 0.3, side: THREE.DoubleSide 
        });
        this.wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });

        // ARRAY UNTUK MENYIMPAN TEMPLATE MODEL
        this.dummyTemplates = []; 
        
        // JALANKAN PRE-LOAD ASSETS
        // Ini akan berjalan saat Loading Screen, sebelum game dimulai
        this.loadDummyAssets();
    }

    loadDummyAssets() {
        const loader = new GLTFLoader(this.loadingManager); // Gunakan LoadingManager Utama!
        
        const carModels = [
            'hatchback-sports.glb', 'police.glb', 'suv.glb', 
            'firetruck.glb', 'ambulance.glb', 'delivery.glb'
        ];

        carModels.forEach(filename => {
            const path = `./assets/car_model/glb/${filename}`;
            loader.load(path, (gltf) => {
                const model = gltf.scene;
                // Simpan model asli ke memori (jangan dimasukkan ke scene dulu)
                this.dummyTemplates.push(model);
            }, undefined, (err) => {
                console.warn(`Gagal memuat aset dummy: ${filename}`);
            });
        });
    }

    generateParkingArea() {
        const totalLines = 4;        
        const slotsPerLine = 10;     
        const roadGap = 8;           
        
        const singleLineDepth = (this.slotDepth * 2); 
        const totalBlockDepth = (singleLineDepth * totalLines) + (roadGap * (totalLines - 1));
        
        let currentZ = -(totalBlockDepth / 2) + (this.slotDepth / 2);

        for (let line = 0; line < totalLines; line++) {
            this.createRow(currentZ, slotsPerLine, 0, Math.PI);
            this.createRow(currentZ + this.slotDepth, slotsPerLine, 0, 0);
            currentZ += (this.slotDepth * 2) + roadGap;
        }
    }

    createRow(zPosition, count, gap, rotationY) {
        for (let i = 0; i < count; i++) {
            const totalRowWidth = count * (this.slotWidth + gap);
            const x = (i * (this.slotWidth + gap)) - (totalRowWidth / 2) + (this.slotWidth / 2);

            // 2. PASSING 'this' (ParkingSystem) KE PARKING SLOT
            const slot = new ParkingSlot(
                this.scene, x, zPosition, 
                this.slotWidth, this.slotDepth, rotationY, 
                this.lineMaterial,
                this // <--- PENTING: Kirim referensi sistem ini agar slot bisa minta template mobil
            );
            this.slots.push(slot);
        }
    }

    getSlot(index) {
        return this.slots[index];
    }

    getAllSlots() {
        return this.slots;
    }

    getRandomTemplate() {
        if (this.dummyTemplates.length === 0) return null;
        const rand = Math.floor(Math.random() * this.dummyTemplates.length);
        return this.dummyTemplates[rand];
    }
}