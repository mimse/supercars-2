import { InputManager } from "../systems/Input";
import { Car } from "../entities/Car";
import { AICar } from "../entities/AICar";
import { Track } from "./Track";
import { RaceManager } from "./RaceManager";

export interface GameConfig {
  width: number;
  height: number;
  scale: number;
}

// AI car configurations
const AI_CARS_CONFIG = [
  { color: "#2196F3", name: "Blue Thunder", skill: 0.85 },
  { color: "#4CAF50", name: "Green Machine", skill: 0.8 },
  { color: "#FF9800", name: "Orange Fury", skill: 0.75 },
  { color: "#9C27B0", name: "Purple Haze", skill: 0.7 },
];

export class Game {
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;

  private lastTime: number = 0;
  private running: boolean = false;

  private input: InputManager;
  private playerCar!: Car;
  private aiCars: AICar[] = [];
  private track: Track;
  private raceManager: RaceManager;

  constructor(
    _canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    config: GameConfig,
  ) {
    this.ctx = ctx;
    this.config = config;

    // Initialize systems
    this.input = new InputManager();
    this.raceManager = new RaceManager();

    // Initialize track
    this.track = new Track();

    // Initialize cars
    this.initializeCars();

    // Setup race
    this.setupRace();
  }

  private initializeCars(): void {
    const startPositions = this.track.getStartPositions();
    const waypoints = this.track.getWaypoints();

    // Player car at P1
    const p1 = startPositions[0];
    this.playerCar = new Car(p1.x, p1.y, p1.rotation);

    // AI cars at remaining positions
    this.aiCars = AI_CARS_CONFIG.map((config, index) => {
      const pos = startPositions[index + 1];
      const ai = new AICar(
        pos.x,
        pos.y,
        pos.rotation,
        config.color,
        config.name,
        config.skill,
      );
      ai.setWaypoints(waypoints);
      return ai;
    });
  }

  private setupRace(): void {
    this.raceManager.initialize(
      this.playerCar,
      this.aiCars,
      this.track.getCheckpoints(),
      3, // 3 laps
    );
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();

    // Start countdown after a brief delay
    setTimeout(() => {
      this.raceManager.startCountdown();
    }, 500);

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
    // Update race manager
    this.raceManager.update(dt);

    // Only allow control during racing
    if (this.raceManager.canPlayerControl()) {
      // Handle player input
      const inputState = this.input.getState();

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

      // Update player car physics
      this.playerCar.update(dt);

      // Update AI cars
      for (const ai of this.aiCars) {
        ai.updateAI(dt);
        this.track.checkCollision(ai);
      }
    }

    // Check track boundaries
    this.track.checkCollision(this.playerCar);

    // Handle restart input on results screen
    if (this.raceManager.getState() === "results") {
      const inputState = this.input.getState();
      if (inputState.fire) {
        this.restartRace();
      }
    }
  }

  private restartRace(): void {
    this.initializeCars();
    this.setupRace();
    setTimeout(() => {
      this.raceManager.startCountdown();
    }, 500);
  }

  private render(): void {
    // Clear canvas
    this.ctx.fillStyle = "#2d5a27"; // Green grass color
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    // Render track
    this.track.render(this.ctx);

    // Render AI cars
    for (const ai of this.aiCars) {
      ai.render(this.ctx);
    }

    // Render player car
    this.playerCar.render(this.ctx);

    // Render UI based on race state
    this.renderUI();
  }

  private renderUI(): void {
    const state = this.raceManager.getState();

    switch (state) {
      case "pre-race":
        this.renderPreRace();
        break;
      case "countdown":
        this.renderCountdown();
        break;
      case "racing":
        this.renderRaceUI();
        break;
      case "finished":
        this.renderRaceUI();
        this.renderFinished();
        break;
      case "results":
        this.renderResults();
        break;
    }
  }

  private renderPreRace(): void {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 32px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "GET READY",
      this.config.width / 2,
      this.config.height / 2,
    );
    this.ctx.textAlign = "left";
  }

  private renderCountdown(): void {
    const countdown = this.raceManager.getCountdown();

    // Semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    // Countdown number or GO!
    this.ctx.fillStyle = countdown > 0 ? "#ff0000" : "#00ff00";
    this.ctx.font = "bold 120px monospace";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const text = countdown > 0 ? countdown.toString() : "GO!";
    this.ctx.fillText(text, this.config.width / 2, this.config.height / 2);

    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "alphabetic";
  }

  private renderRaceUI(): void {
    const player = this.raceManager.getPlayerInfo();
    if (!player) return;

    // Position panel (top left)
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(5, 5, 120, 80);

    this.ctx.fillStyle = "#ffff00";
    this.ctx.font = "bold 36px monospace";
    this.ctx.fillText(`${player.position}`, 15, 45);

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "14px monospace";
    this.ctx.fillText(this.getPositionSuffix(player.position), 50, 45);

    // Lap counter
    this.ctx.fillStyle = "#aaaaaa";
    this.ctx.font = "14px monospace";
    this.ctx.fillText(
      `Lap ${Math.min(player.lap + 1, this.raceManager.getTotalLaps())}/${this.raceManager.getTotalLaps()}`,
      15,
      70,
    );

    // Speed (bottom left)
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(5, this.config.height - 40, 140, 35);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "16px monospace";
    this.ctx.fillText(
      `${Math.round(Math.abs(this.playerCar.speed))} km/h`,
      15,
      this.config.height - 15,
    );

    // Race time (top right)
    const raceTime = this.raceManager.getRaceTime();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(this.config.width - 110, 5, 105, 30);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "14px monospace";
    this.ctx.fillText(this.formatTime(raceTime), this.config.width - 100, 25);

    // Positions list (top right)
    this.renderPositionsList();
  }

  private renderPositionsList(): void {
    const racers = this.raceManager.getRacers();
    const sorted = [...racers].sort((a, b) => a.position - b.position);

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(
      this.config.width - 160,
      40,
      155,
      sorted.length * 22 + 10,
    );

    sorted.forEach((racer, index) => {
      const y = 60 + index * 22;
      const isPlayer = racer.isPlayer;

      this.ctx.fillStyle = isPlayer ? "#ffff00" : "#ffffff";
      this.ctx.font = isPlayer ? "bold 14px monospace" : "14px monospace";

      const name = racer.name.substring(0, 12);
      this.ctx.fillText(
        `${racer.position}. ${name}`,
        this.config.width - 150,
        y,
      );
    });
  }

  private renderFinished(): void {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    const player = this.raceManager.getPlayerInfo();
    const text = player?.finished ? "FINISHED!" : "RACE OVER";

    this.ctx.fillStyle = "#00ff00";
    this.ctx.font = "bold 48px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.config.width / 2, this.config.height / 2);
    this.ctx.textAlign = "left";
  }

  private renderResults(): void {
    // Dark overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    // Title
    this.ctx.fillStyle = "#ffff00";
    this.ctx.font = "bold 36px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("RACE RESULTS", this.config.width / 2, 60);

    // Results table
    const racers = this.raceManager.getRacers();
    const sorted = [...racers].sort((a, b) => a.position - b.position);

    sorted.forEach((racer, index) => {
      const y = 120 + index * 45;
      const isPlayer = racer.isPlayer;

      // Position
      this.ctx.fillStyle = this.getPositionColor(racer.position);
      this.ctx.font = "bold 28px monospace";
      this.ctx.textAlign = "left";
      this.ctx.fillText(
        `${racer.position}${this.getPositionSuffix(racer.position)}`,
        150,
        y,
      );

      // Name
      this.ctx.fillStyle = isPlayer ? "#ffff00" : "#ffffff";
      this.ctx.font = isPlayer ? "bold 24px monospace" : "24px monospace";
      this.ctx.fillText(racer.name, 250, y);

      // Time (if finished)
      this.ctx.fillStyle = "#aaaaaa";
      this.ctx.font = "20px monospace";
      if (racer.finished) {
        this.ctx.fillText(this.formatTime(racer.totalTime), 550, y);
      } else {
        this.ctx.fillText("DNF", 550, y);
      }
    });

    // Player final position highlight
    const player = this.raceManager.getPlayerInfo();
    if (player) {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "20px monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        `You finished ${player.position}${this.getPositionSuffix(player.position)}!`,
        this.config.width / 2,
        this.config.height - 80,
      );
    }

    // Restart prompt
    this.ctx.fillStyle = "#888888";
    this.ctx.font = "16px monospace";
    this.ctx.fillText(
      "Press SPACE to race again",
      this.config.width / 2,
      this.config.height - 40,
    );

    this.ctx.textAlign = "left";
  }

  private getPositionSuffix(position: number): string {
    if (position === 1) return "st";
    if (position === 2) return "nd";
    if (position === 3) return "rd";
    return "th";
  }

  private getPositionColor(position: number): string {
    if (position === 1) return "#ffd700"; // Gold
    if (position === 2) return "#c0c0c0"; // Silver
    if (position === 3) return "#cd7f32"; // Bronze
    return "#ffffff";
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
  }
}
