import * as THREE from 'three';

export class ParkingSystem {
    constructor(scene) {
        this.scene = scene;
        
        // KONFIGURASI UKURAN
        this.slotWidth = 3.5;  
        this.slotDepth = 6.5;  
        this.lineWidth = 0.15; 
        
        // Material Garis (Putih)
        this.lineMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff 
        });

        // Material Target (Hijau Transparan)
        this.targetMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.4, 
            side: THREE.DoubleSide,
            depthWrite: false
        });
    }

    createSlot(x, z, isTarget) {
        const slotGroup = new THREE.Group();
        slotGroup.position.set(x, 0.05, z); 

        // A. GARIS KIRI
        const leftGeo = new THREE.PlaneGeometry(this.lineWidth, this.slotDepth);
        const left = new THREE.Mesh(leftGeo, this.lineMaterial);
        left.rotation.x = -Math.PI / 2;
        left.position.set(-this.slotWidth / 2, 0, 0);
        slotGroup.add(left);

        // B. GARIS KANAN
        const right = left.clone();
        right.position.set(this.slotWidth / 2, 0, 0);
        slotGroup.add(right);

        // C. GARIS BELAKANG
        const backGeo = new THREE.PlaneGeometry(this.slotWidth, this.lineWidth);
        const back = new THREE.Mesh(backGeo, this.lineMaterial);
        back.rotation.x = -Math.PI / 2;
        back.position.set(0, 0, -this.slotDepth / 2); 
        slotGroup.add(back);

        // D. LOGIKA TARGET (SENSOR HIJAU)
        let sensorMesh = null;
        
        if (isTarget) {
            const fillGeo = new THREE.PlaneGeometry(this.slotWidth - 0.2, this.slotDepth - 0.2);
            const fill = new THREE.Mesh(fillGeo, this.targetMaterial);
            fill.rotation.x = -Math.PI / 2;
            fill.name = "TargetSensor"; 
            slotGroup.add(fill);
            
            sensorMesh = fill; 
        }

        this.scene.add(slotGroup);
        return isTarget ? sensorMesh : null;
    }

    createRow(zPosition, count, gap, startIndex) {
        let targetSlotMesh = null;

        for (let i = 0; i < count; i++) {
            const x = (i * (this.slotWidth + gap)) - ((count * (this.slotWidth + gap)) / 2) + (this.slotWidth/2);

            // ====================================================
            // PERBAIKAN DI SINI:
            // Hapus Math.abs(). Biarkan murni membandingkan angka.
            // Jika startIndex = -1, maka (i === -1) akan selalu false.
            // ====================================================
            const isTarget = (i === startIndex);

            const slotResult = this.createSlot(x, zPosition, isTarget);

            if (slotResult) {
                targetSlotMesh = slotResult;
            }
        }

        return targetSlotMesh; 
    }
}