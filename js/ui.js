document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. LOGIKA POPUP TUTORIAL ---
    const tutorialPopup = document.getElementById('tutorialPopup');
    const startBtn = document.getElementById('closeTutorial');

    startBtn.addEventListener('click', () => {
        // Efek fade out sederhana
        tutorialPopup.style.opacity = '0';
        
        // Hapus dari display setelah transisi selesai agar tidak menghalangi klik
        setTimeout(() => {
            tutorialPopup.style.display = 'none';
        }, 300);
    });


    // --- 2. LOGIKA FULL SCREEN ---
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            fullscreenBtn.textContent = "Exit Full Screen";
        } else {
            document.exitFullscreen();
            fullscreenBtn.textContent = "⛶ Full Screen";
        }
    });

    // Listener jika user keluar fullscreen pakai tombol ESC
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            fullscreenBtn.textContent = "⛶ Full Screen";
        }
    });


    // --- 3. LOGIKA DEBUG BUTTON (VISUAL SAJA) ---
    // Catatan: Logika menampilkan garis hitbox sesungguhnya harus ada di main.js
    // Di sini kita hanya mengirimkan sinyal (Custom Event)
    const debugBtn = document.getElementById('debugBtn');
    let isDebugOn = false;

    debugBtn.addEventListener('click', () => {
        isDebugOn = !isDebugOn;
        
        // Update Teks Tombol
        debugBtn.textContent = isDebugOn ? "Hitbox: ON" : "Hitbox: OFF";
        debugBtn.style.borderColor = isDebugOn ? "#ff3333" : "rgba(255, 255, 255, 0.3)";
        debugBtn.style.color = isDebugOn ? "#ff3333" : "white";

        // Dispatch Event agar main.js bisa mendengarnya
        const event = new CustomEvent('toggleDebug', { detail: { debug: isDebugOn } });
        window.dispatchEvent(event);
    });

});