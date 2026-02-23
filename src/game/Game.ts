import { InputManager } from "../systems/Input";
import { Car } from "../entities/Car";
import { AICar } from "../entities/AICar";
import { Track } from "./Track";
import { RaceManager } from "./RaceManager";
import { HUD, HUDData } from "../ui/HUD";
import { Scenery } from "./Scenery";
import { GameAssets } from "../systems/AssetLoader";
import { CAR_COLORS } from "../utils/SpriteGenerator";

export interface GameConfig {
  width: number;
  height: number;
  scale: number;
}

// AI car configurations (9 AI cars + 1 player = 10 total)
const AI_CARS_CONFIG = [
  { spriteIndex: 1, name: "Blue Thunder", skill: 0.92 },
  { spriteIndex: 2, name: "Green Machine", skill: 0.88 },
  { spriteIndex: 3, name: "Yellow Flash", skill: 0.85 },
  { spriteIndex: 4, name: "Orange Fury", skill: 0.82 },
  { spriteIndex: 5, name: "Pink Panther", skill: 0.79 },
  { spriteIndex: 6, name: "Cyan Storm", skill: 0.76 },
  { spriteIndex: 7, name: "Purple Haze", skill: 0.73 },
  { spriteIndex: 8, name: "White Lightning", skill: 0.70 },
  { spriteIndex: 9, name: "Brown Bomber", skill: 0.67 },
];

export class Game {
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private assets: GameAssets;

  private lastTime: number = 0;
  private running: boolean = false;

  private input: InputManager;
  private playerCar!: Car;
  private aiCars: AICar[] = [];
  private track: Track;
  private raceManager: RaceManager;
  private hud: HUD;
  private scenery: Scenery;

  // Game area dimensions (excluding HUD) - 1.5x scale
  private readonly gameAreaHeight: number = 825;  // 1.5x (was 1100 at 2x)

  constructor(
    _canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    config: GameConfig,
    assets: GameAssets,
  ) {
    this.ctx = ctx;
    this.config = config;
    this.assets = assets;

    // Initialize systems
    this.input = new InputManager();
    this.raceManager = new RaceManager();
    this.hud = new HUD();
    this.scenery = new Scenery();

    // Initialize track
    this.track = new Track();
    
    // Set track tiles
    this.track.setTiles(
      this.assets.sprites.barrier,
      this.assets.sprites.grass,
      this.assets.sprites.finishLine
    );

    // Generate scenery
    this.scenery.generateScenery(
      this.track,
      this.assets.sprites.rocks,
      this.assets.sprites.bushes
    );

    // Initialize cars
    this.initializeCars();

    // Setup race
    this.setupRace();
  }

  private initializeCars(): void {
    const startPositions = this.track.getStartPositions();
    const waypoints = this.track.getWaypoints();
    const spriteSheet = this.assets.sprites.cars;

    // Player car at P1 (red car, sprite index 0)
    const p1 = startPositions[0];
    this.playerCar = new Car(p1.x, p1.y, p1.rotation);
    this.playerCar.setSprite(spriteSheet, 0); // Red car

    // AI cars at remaining positions
    this.aiCars = AI_CARS_CONFIG.map((config, index) => {
      const pos = startPositions[index + 1] || startPositions[startPositions.length - 1];
      const ai = new AICar(
        pos.x,
        pos.y,
        pos.rotation,
        config.spriteIndex,
        config.name,
        config.skill,
      );
      ai.setSprite(spriteSheet, config.spriteIndex);
      ai.setWaypoints(waypoints);
      ai.findNearestWaypointAhead();
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
        
        // AI barrier collision
        const aiBarrierHit = this.track.checkBarrierCollision(ai);
        if (aiBarrierHit.hit) {
          ai.applyDamage(aiBarrierHit.damage);
        }

        // AI off-track damage
        if (ai.isOffTrack) {
          ai.applyDamage(dt * 1.5);
        }
      }

      // Check car-to-car collisions
      this.checkCarCollisions();
    }

    // Check track boundaries for player
    this.track.checkCollision(this.playerCar);

    // Check barrier collision for player
    const barrierHit = this.track.checkBarrierCollision(this.playerCar);
    if (barrierHit.hit) {
      this.playerCar.applyDamage(barrierHit.damage);
    }

    // Off-track damage for player
    if (this.playerCar.isOffTrack) {
      this.playerCar.applyDamage(dt * 2);
    }

    // Handle restart input on results screen
    if (this.raceManager.getState() === "results") {
      const inputState = this.input.getState();
      if (inputState.fire) {
        this.restartRace();
      }
    }
  }

  private restartRace(): void {
    // Reset damage on all cars
    this.playerCar.resetDamage();
    for (const ai of this.aiCars) {
      ai.resetDamage();
    }

    this.initializeCars();
    this.setupRace();
    setTimeout(() => {
      this.raceManager.startCountdown();
    }, 500);
  }

  private checkCarCollisions(): void {
    const allCars = [this.playerCar, ...this.aiCars];

    // Check each pair of cars
    for (let i = 0; i < allCars.length; i++) {
      for (let j = i + 1; j < allCars.length; j++) {
        const car1 = allCars[i];
        const car2 = allCars[j];

        if (car1.checkCollision(car2)) {
          car1.resolveCollision(car2);

          // Apply collision damage based on relative speed
          const relativeSpeed = Math.abs(car1.speed - car2.speed);
          const damage = Math.min(8, relativeSpeed * 0.04);
          car1.applyDamage(damage);
          car2.applyDamage(damage);
        }
      }
    }
  }

  private render(): void {
    // Render game area (clipped to exclude HUD)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.config.width, this.gameAreaHeight);
    this.ctx.clip();

    // Render grass background
    this.track.renderGrass(this.ctx);

    // Render scenery (behind track)
    this.scenery.render(this.ctx);

    // Render track
    this.track.render(this.ctx);

    // Render barriers
    this.track.renderBarriers(this.ctx);

    // Sort all cars by Y position for proper layering
    const allCars = [this.playerCar, ...this.aiCars];
    allCars.sort((a, b) => a.y - b.y);

    // Render all cars
    for (const car of allCars) {
      car.render(this.ctx);
    }

    // Render race state overlays (countdown, etc.)
    this.renderGameOverlays();

    this.ctx.restore();

    // Render HUD (outside clipping region)
    this.renderHUD();

    // Render results overlay (full screen)
    if (this.raceManager.getState() === "results") {
      this.renderResults();
    }
  }

  private renderGameOverlays(): void {
    const state = this.raceManager.getState();

    switch (state) {
      case "pre-race":
        this.renderPreRace();
        break;
      case "countdown":
        this.renderCountdown();
        break;
      case "finished":
        this.renderFinished();
        break;
    }
  }

  private renderHUD(): void {
    const player = this.raceManager.getPlayerInfo();
    if (!player) return;

    const hudData: HUDData = {
      speed: Math.abs(this.playerCar.speed),
      maxSpeed: 300,
      position: player.position,
      totalRacers: this.aiCars.length + 1,
      lap: Math.min(player.lap + 1, this.raceManager.getTotalLaps()),
      totalLaps: this.raceManager.getTotalLaps(),
      damage: this.playerCar.damage,
    };

    this.hud.render(this.ctx, hudData);
  }

  private renderPreRace(): void {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(0, 0, this.config.width, this.gameAreaHeight);

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 21px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "GET READY",
      this.config.width / 2,
      this.gameAreaHeight / 2,
    );
    this.ctx.textAlign = "left";
  }

  private renderCountdown(): void {
    const countdown = this.raceManager.getCountdown();

    // Semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.fillRect(0, 0, this.config.width, this.gameAreaHeight);

    // Countdown number or GO!
    this.ctx.fillStyle = countdown > 0 ? "#ff0000" : "#00ff00";
    this.ctx.font = "bold 67px monospace";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const text = countdown > 0 ? countdown.toString() : "GO!";
    this.ctx.fillText(text, this.config.width / 2, this.gameAreaHeight / 2);

    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "alphabetic";
  }

  private renderFinished(): void {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(0, 0, this.config.width, this.gameAreaHeight);

    const player = this.raceManager.getPlayerInfo();
    const text = player?.finished ? "FINISHED!" : "RACE OVER";

    this.ctx.fillStyle = "#00ff00";
    this.ctx.font = "bold 32px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.config.width / 2, this.gameAreaHeight / 2);
    this.ctx.textAlign = "left";
  }

  private renderResults(): void {
    // Dark overlay (full screen including HUD area)
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    // Center X for the results table
    const centerX = this.config.width / 2;
    const tableWidth = 380;  // Total width of results table
    const tableLeft = centerX - tableWidth / 2;

    // Title (15% larger: 24 -> 28)
    this.ctx.fillStyle = "#ffff00";
    this.ctx.font = "bold 28px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("RACE RESULTS", centerX, 44);

    // Results table
    const racers = this.raceManager.getRacers();
    const sorted = [...racers].sort((a, b) => a.position - b.position);

    // Calculate vertical centering for the table
    const rowHeight = 29;  // 15% larger: 25 -> 29
    const tableHeight = sorted.length * rowHeight;
    const tableStartY = (this.config.height - tableHeight) / 2;

    sorted.forEach((racer, index) => {
      const y = tableStartY + index * rowHeight;
      const isPlayer = racer.isPlayer;

      // Get car color for the indicator
      const colorIndex = isPlayer ? 0 : (AI_CARS_CONFIG.find(c => c.name === racer.name)?.spriteIndex || 0);
      const carColor = CAR_COLORS[colorIndex];

      // Color indicator (15% larger: 13 -> 15)
      this.ctx.fillStyle = carColor.main;
      this.ctx.fillRect(tableLeft, y - 9, 15, 15);

      // Position (15% larger: 16 -> 18)
      this.ctx.fillStyle = this.getPositionColor(racer.position);
      this.ctx.font = "bold 18px monospace";
      this.ctx.textAlign = "left";
      this.ctx.fillText(
        `${racer.position}${this.getPositionSuffix(racer.position)}`,
        tableLeft + 23,
        y,
      );

      // Name (15% larger: 13 -> 15)
      this.ctx.fillStyle = isPlayer ? "#ffff00" : "#ffffff";
      this.ctx.font = isPlayer ? "bold 15px monospace" : "15px monospace";
      this.ctx.fillText(racer.name.substring(0, 15), tableLeft + 75, y);

      // Time (if finished) (15% larger: 12 -> 14)
      this.ctx.fillStyle = "#aaaaaa";
      this.ctx.font = "14px monospace";
      this.ctx.textAlign = "right";
      if (racer.finished) {
        this.ctx.fillText(this.formatTime(racer.totalTime), tableLeft + tableWidth - 40, y);
      } else {
        this.ctx.fillText("DNF", tableLeft + tableWidth - 40, y);
      }

      // Damage indicator (15% larger: 8 -> 9)
      const damagePercent = isPlayer ? this.playerCar.getDamagePercent() : 0;
      if (damagePercent > 0.5) {
        this.ctx.fillStyle = "#ff4444";
        this.ctx.font = "9px monospace";
        this.ctx.fillText("DAMAGED", tableLeft + tableWidth, y);
      }
      
      this.ctx.textAlign = "left";
    });

    // Player final position highlight (15% larger: 13 -> 15)
    const player = this.raceManager.getPlayerInfo();
    if (player) {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "15px monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        `You finished ${player.position}${this.getPositionSuffix(player.position)}!`,
        centerX,
        this.config.height - 54,
      );
    }

    // Restart prompt (15% larger: 11 -> 13)
    this.ctx.fillStyle = "#888888";
    this.ctx.font = "13px monospace";
    this.ctx.fillText(
      "Press SPACE to race again",
      centerX,
      this.config.height - 26,
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
