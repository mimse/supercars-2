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

interface BarrierSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  normalX: number;
  normalY: number;
}

export class Track {
  private roadSegments: TrackSegment[] = [];
  private trackWidth: number = 150;  // 1.5x (was 200)
  private waypoints: Waypoint[] = [];
  private checkpoints: Checkpoint[] = [];
  private startPositions: StartPosition[] = [];
  
  // Barrier system
  private barrierSegments: BarrierSegment[] = [];
  private barrierTile: HTMLCanvasElement | null = null;
  private readonly barrierWidth: number = 12;  // 1.5x (was 16)

  // Grass and finish line tiles
  private grassTile: HTMLCanvasElement | null = null;
  private finishTile: HTMLCanvasElement | null = null;

  // Game area height (excluding HUD) - 1.5x scale
  private readonly gameHeight: number = 825;  // 1.5x (was 1100)

  constructor() {
    this.createDefaultTrack();
    this.generateBarrierSegments();
  }

  /**
   * Set sprite tiles for rendering
   */
  setTiles(barrier: HTMLCanvasElement, grass: HTMLCanvasElement, finish: HTMLCanvasElement): void {
    this.barrierTile = barrier;
    this.grassTile = grass;
    this.finishTile = finish;
  }

  private createDefaultTrack(): void {
    // Create a simple oval track - 1.5x scale (1200x825 game area)
    const margin = 90;  // 1.5x (was 120)
    const trackW = this.trackWidth;  // 150 (1.5x)

    // Bottom straight
    this.roadSegments.push({
      x: margin + trackW,
      y: this.gameHeight - margin - trackW,
      width: 1200 - 2 * margin - 2 * trackW,
      height: trackW,
    });

    // Top straight
    this.roadSegments.push({
      x: margin + trackW,
      y: margin,
      width: 1200 - 2 * margin - 2 * trackW,
      height: trackW,
    });

    // Left straight
    this.roadSegments.push({
      x: margin,
      y: margin,
      width: trackW,
      height: this.gameHeight - 2 * margin,
    });

    // Right straight
    this.roadSegments.push({
      x: 1200 - margin - trackW,
      y: margin,
      width: trackW,
      height: this.gameHeight - 2 * margin,
    });

    // Corner connections (make the oval complete)
    // Top-left corner
    this.roadSegments.push({
      x: margin,
      y: margin,
      width: trackW * 2,
      height: trackW,
    });
    // Top-right corner
    this.roadSegments.push({
      x: 1200 - margin - trackW * 2,
      y: margin,
      width: trackW * 2,
      height: trackW,
    });
    // Bottom-left corner
    this.roadSegments.push({
      x: margin,
      y: this.gameHeight - margin - trackW,
      width: trackW * 2,
      height: trackW,
    });
    // Bottom-right corner
    this.roadSegments.push({
      x: 1200 - margin - trackW * 2,
      y: this.gameHeight - margin - trackW,
      width: trackW * 2,
      height: trackW,
    });

    // Create AI waypoints (clockwise around track) - 1.5x scale
    const innerMargin = margin + trackW / 2;
    const outerX = 1200 - innerMargin;
    const outerY = this.gameHeight - innerMargin;

    this.waypoints = [
      // Bottom straight
      { x: 375, y: outerY - 15 },
      { x: 600, y: outerY - 15 },
      { x: 825, y: outerY - 15 },
      // Right side
      { x: outerX - 15, y: 600 },
      { x: outerX - 15, y: 412 },
      { x: outerX - 15, y: 225 },
      // Top straight
      { x: 825, y: innerMargin + 15 },
      { x: 600, y: innerMargin + 15 },
      { x: 375, y: innerMargin + 15 },
      // Left side
      { x: innerMargin + 15, y: 225 },
      { x: innerMargin + 15, y: 412 },
      { x: innerMargin + 15, y: 600 },
      // Back to start
      { x: 300, y: outerY - 15 },
    ];

    // Create checkpoints for lap tracking - 1.5x scale
    this.checkpoints = [
      { x: 570, y: this.gameHeight - margin - trackW, width: 60, height: trackW, index: 0 }, // Finish line
      { x: 1200 - margin - trackW, y: 330, width: trackW, height: 180, index: 1 }, // Right side
      { x: 525, y: margin, width: 180, height: trackW, index: 2 }, // Top
      { x: margin, y: 330, width: trackW, height: 180, index: 3 }, // Left side
    ];

    // Starting grid positions (3 columns × 3 rows, staggered for 10 cars) - 1.5x scale
    // Track bottom: y = 585 to 735 (150px), need to fit cars (48px) with padding
    const trackCenterY = this.gameHeight - margin - trackW / 2;  // 660
    const gridStartX = 630;
    const colSpacing = 52;
    const rowSpacing = 36;  // Tighter spacing to fit within 150px track

    this.startPositions = [
      // Row 1 (front) - positions 1-3 (center row first)
      { x: gridStartX, y: trackCenterY - rowSpacing, rotation: 0 },
      { x: gridStartX, y: trackCenterY, rotation: 0 },
      { x: gridStartX, y: trackCenterY + rowSpacing, rotation: 0 },
      // Row 2 - positions 4-6
      { x: gridStartX - colSpacing, y: trackCenterY - rowSpacing * 0.5, rotation: 0 },
      { x: gridStartX - colSpacing, y: trackCenterY + rowSpacing * 0.5, rotation: 0 },
      { x: gridStartX - colSpacing, y: trackCenterY + rowSpacing * 1.5, rotation: 0 },
      // Row 3 - positions 7-9
      { x: gridStartX - colSpacing * 2, y: trackCenterY - rowSpacing, rotation: 0 },
      { x: gridStartX - colSpacing * 2, y: trackCenterY, rotation: 0 },
      { x: gridStartX - colSpacing * 2, y: trackCenterY + rowSpacing, rotation: 0 },
      // Row 4 (back) - position 10
      { x: gridStartX - colSpacing * 3, y: trackCenterY, rotation: 0 },
    ];
  }

  /**
   * Generate barrier segments from track edges - 1.5x scale
   */
  private generateBarrierSegments(): void {
    this.barrierSegments = [];
    const margin = 90;  // 1.5x (was 120)
    const trackW = this.trackWidth;  // 150 (1.5x)

    // Outer barrier (clockwise, normals pointing inward)
    const outerPoints = [
      { x: margin - this.barrierWidth, y: margin - this.barrierWidth },
      { x: 1200 - margin + this.barrierWidth, y: margin - this.barrierWidth },
      { x: 1200 - margin + this.barrierWidth, y: this.gameHeight - margin + this.barrierWidth },
      { x: margin - this.barrierWidth, y: this.gameHeight - margin + this.barrierWidth },
    ];

    for (let i = 0; i < outerPoints.length; i++) {
      const p1 = outerPoints[i];
      const p2 = outerPoints[(i + 1) % outerPoints.length];
      
      // Calculate inward-pointing normal
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      // Rotate 90° clockwise for inward normal on clockwise path
      const normalX = dy / len;
      const normalY = -dx / len;

      this.barrierSegments.push({
        x1: p1.x, y1: p1.y,
        x2: p2.x, y2: p2.y,
        normalX, normalY,
      });
    }

    // Inner barrier (counter-clockwise, normals pointing outward)
    const innerPoints = [
      { x: margin + trackW + this.barrierWidth, y: margin + trackW + this.barrierWidth },
      { x: margin + trackW + this.barrierWidth, y: this.gameHeight - margin - trackW - this.barrierWidth },
      { x: 1200 - margin - trackW - this.barrierWidth, y: this.gameHeight - margin - trackW - this.barrierWidth },
      { x: 1200 - margin - trackW - this.barrierWidth, y: margin + trackW + this.barrierWidth },
    ];

    for (let i = 0; i < innerPoints.length; i++) {
      const p1 = innerPoints[i];
      const p2 = innerPoints[(i + 1) % innerPoints.length];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      // Rotate 90° counter-clockwise for outward normal on counter-clockwise path
      const normalX = -dy / len;
      const normalY = dx / len;

      this.barrierSegments.push({
        x1: p1.x, y1: p1.y,
        x2: p2.x, y2: p2.y,
        normalX, normalY,
      });
    }
  }

  /**
   * Render grass background - 1.5x scale
   */
  renderGrass(ctx: CanvasRenderingContext2D): void {
    if (this.grassTile) {
      // Tile the grass
      const pattern = ctx.createPattern(this.grassTile, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, 1200, this.gameHeight);
      }
    } else {
      // Fallback solid color
      ctx.fillStyle = '#2d5a27';
      ctx.fillRect(0, 0, 1200, this.gameHeight);
    }
  }

  /**
   * Render the track surface - 1.5x scale
   */
  render(ctx: CanvasRenderingContext2D): void {
    // Draw road surface
    ctx.fillStyle = "#555555";
    for (const segment of this.roadSegments) {
      ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
    }

    // Draw road edge markings (white lines along edges)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.setLineDash([]);

    // Draw center line markings (dashed)
    ctx.strokeStyle = "#ffffff";
    ctx.setLineDash([22, 22]);
    ctx.lineWidth = 3;

    const margin = 90;
    const trackW = this.trackWidth;
    const centerOffset = trackW / 2;

    ctx.beginPath();
    // Bottom horizontal center line
    ctx.moveTo(margin + trackW, this.gameHeight - margin - centerOffset);
    ctx.lineTo(1200 - margin - trackW, this.gameHeight - margin - centerOffset);
    // Top horizontal center line
    ctx.moveTo(margin + trackW, margin + centerOffset);
    ctx.lineTo(1200 - margin - trackW, margin + centerOffset);
    // Left vertical center line
    ctx.moveTo(margin + centerOffset, margin + trackW);
    ctx.lineTo(margin + centerOffset, this.gameHeight - margin - trackW);
    // Right vertical center line
    ctx.moveTo(1200 - margin - centerOffset, margin + trackW);
    ctx.lineTo(1200 - margin - centerOffset, this.gameHeight - margin - trackW);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw start/finish line
    this.renderFinishLine(ctx);
  }

  /**
   * Render the checkered finish line - 1.5x scale
   */
  private renderFinishLine(ctx: CanvasRenderingContext2D): void {
    const margin = 90;  // 1.5x (was 120 at 2x)
    const trackW = this.trackWidth;  // 150 (1.5x)
    const finishX = 630;  // 1.5x (was 840 at 2x)
    const finishY = this.gameHeight - margin - trackW;
    const finishHeight = trackW;
    const tileSize = 24;  // 1.5x (was 32 at 2x)

    if (this.finishTile) {
      // Use tile pattern - 1.5x scale
      const cols = 2;
      const rows = Math.ceil(finishHeight / tileSize);
      
      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          ctx.drawImage(
            this.finishTile,
            finishX + col * tileSize,
            finishY + row * tileSize,
            tileSize,
            Math.min(tileSize, finishHeight - row * tileSize)
          );
        }
      }
    } else {
      // Fallback checkered pattern - 1.5x scale
      const squareSize = 18;  // 1.5x (was 24 at 2x)
      const cols = 2;
      const rows = Math.ceil(finishHeight / squareSize);

      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          ctx.fillStyle = (col + row) % 2 === 0 ? "#ffffff" : "#000000";
          ctx.fillRect(
            finishX + col * squareSize,
            finishY + row * squareSize,
            squareSize,
            Math.min(squareSize, finishHeight - row * squareSize)
          );
        }
      }
    }

    // Draw "FINISH" text - 1.5x scale
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px monospace";  // 1.5x (was 24px at 2x)
    ctx.textAlign = "center";
    ctx.fillText("FINISH", finishX + tileSize, finishY - 8);  // 1.5x offset
    ctx.textAlign = "left";
  }

  /**
   * Render barriers along track edges - 1.5x scale
   */
  renderBarriers(ctx: CanvasRenderingContext2D): void {
    if (!this.barrierTile) {
      this.renderBarriersFallback(ctx);
      return;
    }

    for (const segment of this.barrierSegments) {
      const dx = segment.x2 - segment.x1;
      const dy = segment.y2 - segment.y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(segment.x1, segment.y1);
      ctx.rotate(angle);

      // Tile the barrier along the segment - 1.5x scale
      const tileSize = 24;  // 1.5x (was 32 at 2x)
      const numTiles = Math.ceil(length / tileSize);

      for (let t = 0; t < numTiles; t++) {
        const tileWidth = Math.min(tileSize, length - t * tileSize);
        ctx.drawImage(
          this.barrierTile,
          0, 0, tileWidth, tileSize,
          t * tileSize, -this.barrierWidth / 2, tileWidth, this.barrierWidth
        );
      }

      ctx.restore();
    }
  }

  /**
   * Fallback barrier rendering without tiles
   */
  private renderBarriersFallback(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "#888888";
    ctx.lineWidth = this.barrierWidth;

    for (const segment of this.barrierSegments) {
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
      ctx.stroke();
    }
  }

  /**
   * Check if car is on track
   */
  checkCollision(car: Car): void {
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

    if (!onTrack) {
      car.offTrackPenalty();
    }
  }

  /**
   * Check barrier collision and apply bounce/damage
   */
  checkBarrierCollision(car: Car): { hit: boolean; damage: number } {
    const carRadius = car.width / 2;

    for (const segment of this.barrierSegments) {
      const dist = this.pointToSegmentDistance(
        car.x, car.y,
        segment.x1, segment.y1,
        segment.x2, segment.y2
      );

      if (dist < carRadius + this.barrierWidth / 2) {
        // Collision detected!
        const impactSpeed = Math.abs(car.speed);
        
        // Push car away from barrier
        const pushForce = Math.max(10, impactSpeed * 0.2);
        car.x += segment.normalX * pushForce * 0.5;
        car.y += segment.normalY * pushForce * 0.5;

        // Bounce speed
        car.speed *= -0.4;

        // Calculate damage based on impact speed
        const damage = Math.max(3, impactSpeed * 0.05);

        return { hit: true, damage };
      }
    }

    return { hit: false, damage: 0 };
  }

  /**
   * Calculate distance from point to line segment
   */
  private pointToSegmentDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      // Segment is a point
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    // Project point onto line segment
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
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

  /**
   * Get distance to nearest track edge (for scenery placement)
   */
  distanceToTrack(x: number, y: number): number {
    let minDist = Infinity;

    for (const segment of this.roadSegments) {
      // Distance to rectangle
      const closestX = Math.max(segment.x, Math.min(x, segment.x + segment.width));
      const closestY = Math.max(segment.y, Math.min(y, segment.y + segment.height));
      const dist = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);
      minDist = Math.min(minDist, dist);
    }

    return minDist;
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

  getGameHeight(): number {
    return this.gameHeight;
  }
}
