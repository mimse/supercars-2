import { Game } from "./game/Game";
import { AssetLoader } from "./systems/AssetLoader";

// Game configuration (1.5x scale for track, 2x for cars)
const CONFIG = {
  width: 1200,
  height: 859,  // 825 game area + 34 HUD
  scale: 1.5,
};

/**
 * Render loading screen with progress bar
 */
function renderLoadingScreen(
  ctx: CanvasRenderingContext2D,
  progress: number,
  message: string = "LOADING..."
): void {
  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  // Title
  ctx.fillStyle = "#ffff00";
  ctx.font = "bold 32px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SUPER CARS 2", CONFIG.width / 2, CONFIG.height / 2 - 53);

  // Subtitle
  ctx.fillStyle = "#888888";
  ctx.font = "11px monospace";
  ctx.fillText("A Remake of the Classic Amiga Game", CONFIG.width / 2, CONFIG.height / 2 - 27);

  // Loading text
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px monospace";
  ctx.fillText(message, CONFIG.width / 2, CONFIG.height / 2 + 13);

  // Progress bar background
  const barWidth = 267;
  const barHeight = 16;
  const barX = (CONFIG.width - barWidth) / 2;
  const barY = CONFIG.height / 2 + 33;

  ctx.fillStyle = "#2a2a3e";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Progress bar fill
  const fillWidth = (barWidth - 2) * progress;
  if (fillWidth > 0) {
    const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    gradient.addColorStop(0, "#22c55e");
    gradient.addColorStop(0.5, "#3b82f6");
    gradient.addColorStop(1, "#8b5cf6");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(barX + 1, barY + 1, fillWidth, barHeight - 2);
  }

  // Progress bar border
  ctx.strokeStyle = "#4a4a6a";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  // Progress percentage
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "9px monospace";
  ctx.fillText(`${Math.round(progress * 100)}%`, CONFIG.width / 2, barY + barHeight + 13);

  // Controls hint
  ctx.fillStyle = "#666666";
  ctx.font = "8px monospace";
  ctx.fillText("Arrow Keys to Drive | SPACE to Accelerate", CONFIG.width / 2, CONFIG.height - 27);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

/**
 * Initialize and start the game
 */
async function initGame(): Promise<void> {
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

  // Show initial loading screen
  renderLoadingScreen(ctx, 0, "Initializing...");

  try {
    // Load/generate all game assets
    const assetLoader = new AssetLoader();
    const assets = await assetLoader.loadAll((progress) => {
      renderLoadingScreen(ctx, progress, "Generating sprites...");
    });

    // Brief pause to show 100% complete
    renderLoadingScreen(ctx, 1, "Ready!");
    await new Promise(resolve => setTimeout(resolve, 300));

    // Create and start the game
    const game = new Game(canvas, ctx, CONFIG, assets);
    game.start();

    console.log("Super Cars 2 initialized!");
    console.log(`- 10 cars (1 player + 9 AI)`);
    console.log(`- Damage system enabled`);
    console.log(`- Track barriers active`);

  } catch (error) {
    console.error("Failed to initialize game:", error);
    
    // Show error on screen
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.fillStyle = "#ff4444";
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Failed to load game", CONFIG.width / 2, CONFIG.height / 2);
    ctx.fillStyle = "#888888";
    ctx.font = "10px monospace";
    ctx.fillText("Check console for details", CONFIG.width / 2, CONFIG.height / 2 + 20);
  }
}

// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initGame();
});
