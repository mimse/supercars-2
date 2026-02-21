import { InputManager } from "../systems/Input";
import { Car } from "../entities/Car";
import { Track } from "./Track";

export interface GameConfig {
  width: number;
  height: number;
  scale: number;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;

  private lastTime: number = 0;
  private running: boolean = false;

  private input: InputManager;
  private playerCar: Car;
  private track: Track;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    config: GameConfig,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.config = config;

    // Initialize systems
    this.input = new InputManager();

    // Initialize track
    this.track = new Track();

    // Initialize player car at starting position
    this.playerCar = new Car(400, 500, 0);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  stop(): void {
    this.running = false;
  }

  private gameLoop(currentTime: number): void {
    if (!this.running) return;

    // Calculate delta time in seconds
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Update game state
    this.update(deltaTime);

    // Render frame
    this.render();

    // Schedule next frame
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  private update(dt: number): void {
    // Handle player input
    const inputState = this.input.getState();

    // Update player car based on input
    if (inputState.up) {
      this.playerCar.accelerate(dt);
    }
    if (inputState.down) {
      this.playerCar.brake(dt);
    }
    if (inputState.left) {
      this.playerCar.steer(-1, dt);
    }
    if (inputState.right) {
      this.playerCar.steer(1, dt);
    }

    // Update car physics
    this.playerCar.update(dt);

    // Check track boundaries
    this.track.checkCollision(this.playerCar);
  }

  private render(): void {
    // Clear canvas
    this.ctx.fillStyle = "#2d5a27"; // Green grass color
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    // Render track
    this.track.render(this.ctx);

    // Render player car
    this.playerCar.render(this.ctx);

    // Render UI
    this.renderUI();
  }

  private renderUI(): void {
    // Speed indicator
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "16px monospace";
    this.ctx.fillText(
      `Speed: ${Math.round(this.playerCar.speed)} km/h`,
      10,
      25,
    );

    // Controls hint
    this.ctx.fillStyle = "#aaaaaa";
    this.ctx.font = "12px monospace";
    this.ctx.fillText("Arrow keys to drive", 10, this.config.height - 10);
  }
}
