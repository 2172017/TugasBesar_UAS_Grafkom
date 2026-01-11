import { Game } from '/src/core/Game.js';

window.addEventListener('DOMContentLoaded', () => { //GAME CONSTRUCTOR FROM Game.js
    new Game();
});

window.addEventListener('toggleDebug', (e) => {
  const isDebugActive = e.detail.debug;
  
  console.log("Debug Mode:", isDebugActive);
});