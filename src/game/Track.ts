import { Car } from "../entities/Car";
import { Waypoint } from "../entities/AICar";
import { Checkpoint } from "./RaceManager";

interface TrackSegment {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StartPosition {
  x: number;
  y: number;
  rotation: number;
}

export class Track {
  private roadSegments: TrackSegment[] = [];
  private trackWidth: number = 120;
  private waypoints: Waypoint[] = [];
  private checkpoints: Checkpoint[] = [];
  private startPositions: StartPosition[] = [];

  constructor() {
    this.createDefaultTrack();
  }

  private createDefaultTrack(): void {
    // Create a simple oval track for testing
    // Bottom straight
    this.roadSegments.push({
      x: 150,
      y: 450,
      width: 500,
      height: this.trackWidth,
    });

    // Top straight
    this.roadSegments.push({
      x: 150,
      y: 80,
      width: 500,
      height: this.trackWidth,
    });

    // Left straight
    this.roadSegments.push({
      x: 80,
      y: 80,
      width: this.trackWidth,
      height: 490,
    });

    // Right straight
    this.roadSegments.push({
      x: 600,
      y: 80,
      width: this.trackWidth,
      height: 490,
    });

    // Create AI waypoints (clockwise around track)
    this.waypoints = [
      { x: 250, y: 510 }, // Bottom straight start
      { x: 400, y: 510 }, // Bottom straight mid
      { x: 550, y: 510 }, // Bottom straight end
      { x: 660, y: 450 }, // Right turn entry
      { x: 660, y: 300 }, // Right side mid
      { x: 660, y: 150 }, // Right side upper
      { x: 600, y: 140 }, // Top right corner
      { x: 400, y: 140 }, // Top straight mid
      { x: 200, y: 140 }, // Top straight start
      { x: 140, y: 200 }, // Left turn entry
      { x: 140, y: 350 }, // Left side mid
      { x: 140, y: 500 }, // Left side lower
      { x: 200, y: 510 }, // Back to start
    ];

    // Create checkpoints for lap tracking (must pass through in order)
    this.checkpoints = [
      { x: 300, y: 450, width: 120, height: 120, index: 0 }, // Start/finish
      { x: 600, y: 250, width: 120, height: 150, index: 1 }, // Right side
      { x: 300, y: 80, width: 150, height: 120, index: 2 }, // Top
      { x: 80, y: 250, width: 120, height: 150, index: 3 }, // Left side
    ];

    // Starting grid positions (staggered 2x3 grid)
    this.startPositions = [
      { x: 350, y: 480, rotation: 0 }, // P1 - front left
      { x: 350, y: 530, rotation: 0 }, // P2 - front right
      { x: 300, y: 480, rotation: 0 }, // P3 - mid left
      { x: 300, y: 530, rotation: 0 }, // P4 - mid right
      { x: 250, y: 480, rotation: 0 }, // P5 - back left
      { x: 250, y: 530, rotation: 0 }, // P6 - back right
    ];
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Draw road surface
    ctx.fillStyle = "#444444";
    for (const segment of this.roadSegments) {
      ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
    }

    // Draw road markings (center line)
    ctx.strokeStyle = "#ffffff";
    ctx.setLineDash([20, 20]);
    ctx.lineWidth = 2;

    // Draw center lines for straights
    ctx.beginPath();
    // Bottom horizontal
    ctx.moveTo(150, 510);
    ctx.lineTo(650, 510);
    // Top horizontal
    ctx.moveTo(150, 140);
    ctx.lineTo(650, 140);
    // Left vertical
    ctx.moveTo(140, 80);
    ctx.lineTo(140, 570);
    // Right vertical
    ctx.moveTo(660, 80);
    ctx.lineTo(660, 570);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw start/finish line
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 2; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(300 + i * 20, 450 + j * 20, 20, 20);
        }
      }
    }
    ctx.fillStyle = "#000000";
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 2; j++) {
        if ((i + j) % 2 === 1) {
          ctx.fillRect(300 + i * 20, 450 + j * 20, 20, 20);
        }
      }
    }
  }

  checkCollision(car: Car): void {
    // Simple boundary check - keep car on track
    const carX = car.x;
    const carY = car.y;

    let onTrack = false;

    for (const segment of this.roadSegments) {
      if (
        carX >= segment.x &&
        carX <= segment.x + segment.width &&
        carY >= segment.y &&
        carY <= segment.y + segment.height
      ) {
        onTrack = true;
        break;
      }
    }

    // Slow down car when off track
    if (!onTrack) {
      car.offTrackPenalty();
    }
  }

  isOnTrack(x: number, y: number): boolean {
    for (const segment of this.roadSegments) {
      if (
        x >= segment.x &&
        x <= segment.x + segment.width &&
        y >= segment.y &&
        y <= segment.y + segment.height
      ) {
        return true;
      }
    }
    return false;
  }

  getWaypoints(): Waypoint[] {
    return this.waypoints;
  }

  getCheckpoints(): Checkpoint[] {
    return this.checkpoints;
  }

  getStartPositions(): StartPosition[] {
    return this.startPositions;
  }

  getStartPosition(index: number): StartPosition {
    return (
      this.startPositions[index] ||
      this.startPositions[this.startPositions.length - 1]
    );
  }
}
