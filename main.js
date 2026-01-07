import { Game } from '/src/core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});

window.addEventListener('toggleDebug', (e) => {
  const isDebugActive = e.detail.debug;
  
  console.log("Debug Mode:", isDebugActive);
  
  // CONTOH: Jika Anda menggunakan Cannon.js debugger atau Three.js helpers
  // if (cannonDebugRenderer) {
  //    cannonDebugRenderer.visible = isDebugActive;
  // }
  
  // ATAU: Toggle visibility wireframe
  // scene.traverse((child) => {
  //    if (child.name === 'hitbox_wireframe') child.visible = isDebugActive;
  // });
});