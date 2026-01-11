import * as THREE from 'three';
import { ParkingSlot } from './ParkingSlot.js';

export class ParkingSystem {
    constructor(scene) {
        this.scene = scene;
        this.slotWidth = 3.5;  
        this.slotDepth = 6.5;  
        
        this.slots = []; // Menyimpan semua object ParkingSlot

        // Material Shared
        this.lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.hologramMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00, transparent: true, opacity: 0.15,
            side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
        });
        this.wireframeMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending
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

            const slot = new ParkingSlot(
                this.scene, x, zPosition, 
                this.slotWidth, this.slotDepth, rotationY, 
                this.lineMaterial
            );
            this.slots.push(slot);
        }
    }

    // Fungsi helper untuk MissionManager
    getSlot(index) {
        return this.slots[index];
    }

    getAllSlots() {
        return this.slots;
    }
}