import { Game } from "./game/Game";

// Game configuration
const CONFIG = {
  width: 800,
  height: 600,
  scale: 1,
};

// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;

  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }

  // Set canvas size
  canvas.width = CONFIG.width;
  canvas.height = CONFIG.height;

  // Get 2D rendering context
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("Could not get 2D context!");
    return;
  }

  // Disable image smoothing for pixel-perfect rendering
  ctx.imageSmoothingEnabled = false;

  // Create and start the game
  const game = new Game(canvas, ctx, CONFIG);
  game.start();

  console.log("Super Cars 2 initialized!");
});
