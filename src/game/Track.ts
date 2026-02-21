import { Car } from "../entities/Car";

interface TrackSegment {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Track {
  private roadSegments: TrackSegment[] = [];
  private trackWidth: number = 120;

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
}
