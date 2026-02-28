import { InputManager } from "../systems/Input";
import { Car } from "../entities/Car";
import { AICar, AvoidableCar } from "../entities/AICar";
import { Track } from "./Track";
import { RaceManager } from "./RaceManager";
import { HUD, HUDData } from "../ui/HUD";
import { Scenery } from "./Scenery";
import { GameAssets } from "../systems/AssetLoader";
import { CAR_COLORS } from "../utils/SpriteGenerator";
import { Explosion } from "../effects/Explosion";
import { Camera } from "../systems/Camera";
import { ParallaxBackground, ParallaxLayerConfig } from "../systems/ParallaxBackground";

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
  private explosions: Explosion[] = [];

  // Camera system for scrolling
  private camera: Camera;
  private parallaxLayers: ParallaxLayerConfig[] = [];

  // Game area dimensions (excluding HUD)
  private readonly gameAreaHeight: number;
  private readonly hudHeight: number = 34;

  constructor(
    _canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    config: GameConfig,
    assets: GameAssets,
  ) {
    this.ctx = ctx;
    this.config = config;
    this.assets = assets;
    this.gameAreaHeight = config.height - this.hudHeight;

    // Initialize systems
    this.input = new InputManager();
    this.raceManager = new RaceManager();
    this.hud = new HUD();
    this.scenery = new Scenery();

    // Initialize track (larger world)
    this.track = new Track({
      name: "Grand Circuit",
      worldWidth: 2400,
      worldHeight: 1800,
      trackWidth: 150,
    });
    
    // Set world bounds for all cars
    Car.worldWidth = this.track.getWorldWidth();
    Car.worldHeight = this.track.getWorldHeight();
    
    // Initialize camera
    this.camera = new Camera(
      config.width,
      this.gameAreaHeight,
      this.track.getWorldWidth(),
      this.track.getWorldHeight()
    );
    
    // Generate parallax background layers
    this.parallaxLayers = ParallaxBackground.generateRacingBackground(
      config.width,
      this.gameAreaHeight
    );
    
    // Set track tiles
    this.track.setTiles(
      this.assets.sprites.barrier,
      this.assets.sprites.grass,
      this.assets.sprites.finishLine
    );

    // Generate scenery for the larger world
    this.scenery.generateScenery(
      this.track,
      this.assets.sprites.rocks,
      this.assets.sprites.bushes,
      this.assets.sprites.trees,
      this.assets.sprites.tireStack
    );

    // Initialize cars
    this.initializeCars();

    // Setup race
    this.setupRace();
    
    // Center camera on player start position
    this.camera.centerOn(this.playerCar.x, this.playerCar.y);
  }

  private initializeCars(): void {
    const startPositions = this.track.getStartPositions();
    const waypoints = this.track.getWaypoints();
    const spriteSheet = this.assets.sprites.cars;

    // Player car at the back of the grid (last position)
    const playerPos = startPositions[startPositions.length - 1];
    this.playerCar = new Car(playerPos.x, playerPos.y, playerPos.rotation);
    this.playerCar.setSprite(spriteSheet, 0); // Red car

    // AI cars at front positions (positions 0 to n-1)
    this.aiCars = AI_CARS_CONFIG.map((config, index) => {
      const pos = startPositions[index] || startPositions[startPositions.length - 2];
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

    // Check if player has exploded
    const playerExploded = this.playerCar.hasExploded();

    // Only allow control during racing and if player hasn't exploded
    if (this.raceManager.canPlayerControl() && !playerExploded) {
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

      // Get active (non-exploded) AI cars
      const activeAiCars = this.aiCars.filter(ai => !ai.hasExploded());
      
      // Update AI cars
      // Create list of all active cars for avoidance (player + active AI cars)
      const allCarsForAvoidance: AvoidableCar[] = [
        this.playerCar,
        ...activeAiCars
      ];
      
      for (const ai of activeAiCars) {
        ai.updateAI(dt, allCarsForAvoidance);
        this.track.checkCollision(ai);
        
        // AI barrier collision
        const aiBarrierHit = this.track.checkBarrierCollision(ai);
        if (aiBarrierHit.hit) {
          if (ai.applyDamage(aiBarrierHit.damage)) {
            this.spawnExplosion(ai.x, ai.y);
          }
        }

        // AI off-track damage
        if (ai.isOffTrack) {
          if (ai.applyDamage(dt * 1.5)) {
            this.spawnExplosion(ai.x, ai.y);
          }
        }
      }

      // Check car-to-car collisions
      this.checkCarCollisions();
    }

    // Check track boundaries for player (only if not exploded)
    if (!playerExploded) {
      this.track.checkCollision(this.playerCar);

      // Check barrier collision for player
      const barrierHit = this.track.checkBarrierCollision(this.playerCar);
      if (barrierHit.hit) {
        if (this.playerCar.applyDamage(barrierHit.damage)) {
          this.spawnExplosion(this.playerCar.x, this.playerCar.y);
        }
      }

      // Off-track damage for player
      if (this.playerCar.isOffTrack) {
        if (this.playerCar.applyDamage(dt * 2)) {
          this.spawnExplosion(this.playerCar.x, this.playerCar.y);
        }
      }
    }

    // Update camera to follow player
    if (!playerExploded) {
      // Calculate player velocity for look-ahead
      const velocityX = Math.cos(this.playerCar.rotation) * this.playerCar.speed;
      const velocityY = Math.sin(this.playerCar.rotation) * this.playerCar.speed;
      
      this.camera.follow(
        this.playerCar.x,
        this.playerCar.y,
        velocityX,
        velocityY,
        dt
      );
    }

    // Update explosions
    for (const explosion of this.explosions) {
      explosion.update(dt);
    }
    // Remove finished explosions
    this.explosions = this.explosions.filter(e => !e.isFinished());

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
    
    // Clear any active explosions
    this.explosions = [];

    this.initializeCars();
    this.setupRace();
    
    // Reset camera to player position
    this.camera.centerOn(this.playerCar.x, this.playerCar.y);
    
    setTimeout(() => {
      this.raceManager.startCountdown();
    }, 500);
  }

  private spawnExplosion(x: number, y: number): void {
    this.explosions.push(new Explosion(x, y));
  }

  private checkCarCollisions(): void {
    // Only check collisions between active (non-exploded) cars
    const allCars = [this.playerCar, ...this.aiCars].filter(car => !car.hasExploded());

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
          if (car1.applyDamage(damage)) {
            this.spawnExplosion(car1.x, car1.y);
          }
          if (car2.applyDamage(damage)) {
            this.spawnExplosion(car2.x, car2.y);
          }
        }
      }
    }
  }

  private render(): void {
    // Clear entire canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    // Render game area (clipped to exclude HUD)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.config.width, this.gameAreaHeight);
    this.ctx.clip();

    // Render parallax background layers (in screen space, before camera transform)
    this.renderParallaxLayers();

    // Apply camera transform for world-space rendering
    this.camera.applyTransform(this.ctx);

    // Get camera bounds for culling
    const cameraBounds = this.camera.getVisibleBounds(100);

    // Render grass background (world space)
    this.track.renderGrass(this.ctx, this.camera.x, this.camera.y, this.config.width, this.gameAreaHeight);

    // Render scenery (behind track)
    this.renderVisibleScenery(cameraBounds);

    // Render track
    this.track.render(this.ctx, cameraBounds);

    // Render barriers
    this.track.renderBarriers(this.ctx, cameraBounds);
    
    // Render checkpoint debug visualization (if enabled)
    this.track.renderCheckpoints(this.ctx);

    // Sort all active (non-exploded) cars by Y position for proper layering
    const allCars = [this.playerCar, ...this.aiCars].filter(car => !car.hasExploded());
    allCars.sort((a, b) => a.y - b.y);

    // Render all active cars (with visibility check)
    for (const car of allCars) {
      if (this.camera.isVisible(car.x - car.width/2, car.y - car.height/2, car.width, car.height, 50)) {
        car.render(this.ctx);
      }
    }

    // Render explosions (on top of cars)
    for (const explosion of this.explosions) {
      explosion.render(this.ctx);
    }

    // Reset camera transform
    this.camera.resetTransform(this.ctx);

    // Render race state overlays (in screen space)
    this.renderGameOverlays();

    // Render minimap
    this.renderMinimap();

    this.ctx.restore();

    // Render HUD (outside clipping region)
    this.renderHUD();

    // Render results overlay (full screen)
    if (this.raceManager.getState() === "results") {
      this.renderResults();
    }
  }

  /**
   * Render parallax background layers
   */
  private renderParallaxLayers(): void {
    for (const layer of this.parallaxLayers) {
      const parallaxX = this.camera.x * layer.speed;
      const parallaxY = this.camera.y * layer.speed;
      
      const tileWidth = layer.canvas.width;
      const tileHeight = layer.canvas.height;
      
      // Calculate starting tile position
      const startX = -(parallaxX % tileWidth);
      const startY = -(parallaxY % tileHeight);
      
      // Handle negative modulo
      const adjustedStartX = startX > 0 ? startX - tileWidth : startX;
      const adjustedStartY = startY > 0 ? startY - tileHeight : startY;
      
      // Draw tiles to cover viewport
      for (let y = adjustedStartY; y < this.gameAreaHeight; y += tileHeight) {
        for (let x = adjustedStartX; x < this.config.width; x += tileWidth) {
          this.ctx.drawImage(layer.canvas, x, y);
        }
      }
    }
  }

  /**
   * Render only visible scenery items
   */
  private renderVisibleScenery(_cameraBounds: { minX: number; minY: number; maxX: number; maxY: number }): void {
    // The scenery class handles its own rendering, but we could add culling here
    // For now, just render all scenery (it's relatively lightweight)
    this.scenery.render(this.ctx);
  }

  /**
   * Render minimap showing track and car positions
   */
  private renderMinimap(): void {
    const mapWidth = 150;
    const mapHeight = 100;
    const mapX = this.config.width - mapWidth - 10;
    const mapY = 10;
    const padding = 5;

    // Scale factors
    const scaleX = (mapWidth - padding * 2) / this.track.getWorldWidth();
    const scaleY = (mapHeight - padding * 2) / this.track.getWorldHeight();

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(mapX, mapY, mapWidth, mapHeight);

    // Border
    this.ctx.strokeStyle = '#444444';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(mapX, mapY, mapWidth, mapHeight);

    // Draw track outline (simplified rectangle for now)
    this.ctx.strokeStyle = '#555555';
    this.ctx.lineWidth = 2;
    const trackMargin = 100;
    this.ctx.strokeRect(
      mapX + padding + trackMargin * scaleX,
      mapY + padding + trackMargin * scaleY,
      (this.track.getWorldWidth() - 2 * trackMargin) * scaleX,
      (this.track.getWorldHeight() - 2 * trackMargin) * scaleY
    );

    // Draw camera viewport
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(
      mapX + padding + this.camera.x * scaleX,
      mapY + padding + this.camera.y * scaleY,
      this.config.width * scaleX,
      this.gameAreaHeight * scaleY
    );

    // Draw AI cars as small dots
    for (const ai of this.aiCars) {
      if (ai.hasExploded()) continue;
      const colorIndex = AI_CARS_CONFIG.find(c => c.name === ai.name)?.spriteIndex || 1;
      this.ctx.fillStyle = CAR_COLORS[colorIndex].main;
      this.ctx.fillRect(
        mapX + padding + ai.x * scaleX - 2,
        mapY + padding + ai.y * scaleY - 2,
        4, 4
      );
    }

    // Draw player car (larger, highlighted)
    if (!this.playerCar.hasExploded()) {
      this.ctx.fillStyle = CAR_COLORS[0].main;
      this.ctx.fillRect(
        mapX + padding + this.playerCar.x * scaleX - 3,
        mapY + padding + this.playerCar.y * scaleY - 3,
        6, 6
      );
      // White outline
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(
        mapX + padding + this.playerCar.x * scaleX - 3,
        mapY + padding + this.playerCar.y * scaleY - 3,
        6, 6
      );
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
    
    // Show track name
    this.ctx.fillStyle = "#ffff00";
    this.ctx.font = "bold 16px monospace";
    this.ctx.fillText(
      this.track.getTrackName().toUpperCase(),
      this.config.width / 2,
      this.gameAreaHeight / 2 - 40,
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
    const tableWidth = 380;
    const tableLeft = centerX - tableWidth / 2;

    // Title
    this.ctx.fillStyle = "#ffff00";
    this.ctx.font = "bold 28px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("RACE RESULTS", centerX, 44);

    // Results table
    const racers = this.raceManager.getRacers();
    const sorted = [...racers].sort((a, b) => a.position - b.position);

    // Calculate vertical centering for the table
    const rowHeight = 29;
    const tableHeight = sorted.length * rowHeight;
    const tableStartY = (this.config.height - tableHeight) / 2;

    sorted.forEach((racer, index) => {
      const y = tableStartY + index * rowHeight;
      const isPlayer = racer.isPlayer;

      // Get car color for the indicator
      const colorIndex = isPlayer ? 0 : (AI_CARS_CONFIG.find(c => c.name === racer.name)?.spriteIndex || 0);
      const carColor = CAR_COLORS[colorIndex];

      // Color indicator
      this.ctx.fillStyle = carColor.main;
      this.ctx.fillRect(tableLeft, y - 9, 15, 15);

      // Position
      this.ctx.fillStyle = this.getPositionColor(racer.position);
      this.ctx.font = "bold 18px monospace";
      this.ctx.textAlign = "left";
      this.ctx.fillText(
        `${racer.position}${this.getPositionSuffix(racer.position)}`,
        tableLeft + 23,
        y,
      );

      // Name
      this.ctx.fillStyle = isPlayer ? "#ffff00" : "#ffffff";
      this.ctx.font = isPlayer ? "bold 15px monospace" : "15px monospace";
      this.ctx.fillText(racer.name.substring(0, 15), tableLeft + 75, y);

      // Time (if finished)
      this.ctx.fillStyle = "#aaaaaa";
      this.ctx.font = "14px monospace";
      this.ctx.textAlign = "right";
      if (racer.finished) {
        this.ctx.fillText(this.formatTime(racer.totalTime), tableLeft + tableWidth - 40, y);
      } else {
        this.ctx.fillText("DNF", tableLeft + tableWidth - 40, y);
      }

      // Damage indicator
      const damagePercent = isPlayer ? this.playerCar.getDamagePercent() : 0;
      if (damagePercent > 0.5) {
        this.ctx.fillStyle = "#ff4444";
        this.ctx.font = "9px monospace";
        this.ctx.fillText("DAMAGED", tableLeft + tableWidth, y);
      }
      
      this.ctx.textAlign = "left";
    });

    // Player final position highlight
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

    // Restart prompt
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
