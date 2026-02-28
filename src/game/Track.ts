import { Car } from "../entities/Car";
import { Waypoint } from "../entities/AICar";
import { Checkpoint } from "./RaceManager";

interface TrackSegment {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Polygon-based track segment for diagonal/curved sections
interface TrackPolygon {
  points: { x: number; y: number }[];
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

export interface TrackConfig {
  name: string;
  worldWidth: number;
  worldHeight: number;
  trackWidth: number;
}

export class Track {
  private roadSegments: TrackSegment[] = [];
  private trackPolygons: TrackPolygon[] = [];
  private trackWidth: number = 150;
  private waypoints: Waypoint[] = [];
  private checkpoints: Checkpoint[] = [];
  private startPositions: StartPosition[] = [];
  
  // World dimensions (can be larger than screen)
  private worldWidth: number = 2400;
  private worldHeight: number = 1800;
  
  // Barrier system
  private barrierSegments: BarrierSegment[] = [];
  private readonly barrierWidth: number = 12;

  // Grass and finish line tiles
  private grassTile: HTMLCanvasElement | null = null;
  private finishTile: HTMLCanvasElement | null = null;

  // Track name for display
  private trackName: string = "Grand Circuit";
  
  // Debug mode for checkpoint visualization
  private debugMode: boolean = false;

  constructor(config?: Partial<TrackConfig>) {
    if (config) {
      this.trackName = config.name || this.trackName;
      this.worldWidth = config.worldWidth || this.worldWidth;
      this.worldHeight = config.worldHeight || this.worldHeight;
      this.trackWidth = config.trackWidth || this.trackWidth;
    }
    
    this.createFunTrack();
    this.generateBarrierSegments();
  }

  /**
   * Set sprite tiles for rendering
   */
  setTiles(_barrier: HTMLCanvasElement, grass: HTMLCanvasElement, finish: HTMLCanvasElement): void {
    // Note: barrier tile no longer used - barriers are drawn procedurally for smooth curves
    this.grassTile = grass;
    this.finishTile = finish;
  }

  /**
   * Create a fun track with diagonal sections and S-bends
   * Inspired by original Supercars II track layouts
   */
  private createFunTrack(): void {
    const W = this.trackWidth;
    const halfW = W / 2;
    const worldH = this.worldHeight;
    
    this.roadSegments = [];
    this.trackPolygons = [];
    
    // Track layout inspired by Supercars II:
    // - Start/finish straight at bottom
    // - Sweeping right turn going up
    // - Diagonal section across top
    // - Tight hairpin
    // - S-bend section
    // - Long sweeping curve back to start
    
    // === Define track centerline as a series of waypoints ===
    // We'll build track segments around this path
    // This is a CLOSED loop - last point connects back to first
    
    const trackPath = [
      // Start/finish straight (bottom, going right)
      { x: 200, y: worldH - 200 },
      { x: 600, y: worldH - 200 },
      { x: 900, y: worldH - 200 },
      
      // Gentle curve up-right
      { x: 1100, y: worldH - 250 },
      { x: 1300, y: worldH - 350 },
      { x: 1450, y: worldH - 500 },
      
      // Right side going up (slight diagonal)
      { x: 1550, y: worldH - 700 },
      { x: 1600, y: worldH - 900 },
      { x: 1600, y: worldH - 1100 },
      
      // Sweeping top-right corner
      { x: 1550, y: 500 },
      { x: 1450, y: 350 },
      { x: 1300, y: 250 },
      
      // Top diagonal going left
      { x: 1100, y: 200 },
      { x: 900, y: 220 },
      { x: 700, y: 280 },
      
      // Tight hairpin left
      { x: 500, y: 350 },
      { x: 350, y: 450 },
      { x: 300, y: 600 },
      
      // S-bend section (going down)
      { x: 350, y: 750 },
      { x: 500, y: 850 },
      { x: 550, y: 950 },
      { x: 500, y: 1050 },
      { x: 350, y: 1150 },
      
      // Final sweeping curve back to start
      { x: 250, y: 1300 },
      { x: 200, y: 1450 },
      // Loop closes back to first point (200, worldH - 200)
    ];
    
    // Build track polygons from path segments
    for (let i = 0; i < trackPath.length; i++) {
      const p1 = trackPath[i];
      const p2 = trackPath[(i + 1) % trackPath.length];
      
      // Calculate perpendicular offset for track width
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      if (len < 1) continue;
      
      // Perpendicular unit vector
      const perpX = -dy / len;
      const perpY = dx / len;
      
      // Create quad polygon for this segment
      const polygon: TrackPolygon = {
        points: [
          { x: p1.x + perpX * halfW, y: p1.y + perpY * halfW },
          { x: p1.x - perpX * halfW, y: p1.y - perpY * halfW },
          { x: p2.x - perpX * halfW, y: p2.y - perpY * halfW },
          { x: p2.x + perpX * halfW, y: p2.y + perpY * halfW },
        ]
      };
      
      this.trackPolygons.push(polygon);
    }
    
    // Add circular fills at each waypoint to smooth corners
    for (const point of trackPath) {
      this.addCircularFill(point.x, point.y, halfW + 10);
    }
    
    // === WAYPOINTS (AI navigation) - use track path ===
    this.waypoints = trackPath.map(p => ({ x: p.x, y: p.y }));
    
    // === CHECKPOINTS (lap tracking) ===
    this.createCheckpoints();
    
    // === START POSITIONS ===
    this.createStartPositions();
  }
  
  /**
   * Add a circular fill area (approximated as octagon) for corner smoothing
   */
  private addCircularFill(cx: number, cy: number, radius: number): void {
    const sides = 8;
    const points: { x: number; y: number }[] = [];
    
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      points.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    }
    
    this.trackPolygons.push({ points });
  }

  /**
   * Create checkpoints for lap tracking
   * Checkpoints must be crossed in order: 0 (finish) → 1 → 2 → 3 → 0 (finish)
   * Cars start needing checkpoint 1, so first crossing of 0 completes lap 1
   */
  private createCheckpoints(): void {
    const W = this.trackWidth;
    const worldH = this.worldHeight;
    const halfW = W / 2;
    
    // Track centerline at bottom straight: y = worldH - 200 = 1600
    // Track spans: y = 1600 - 75 to 1600 + 75 (1525 to 1675)
    
    this.checkpoints = [
      // Checkpoint 0: Finish line (bottom straight, AFTER the finish line)
      // Cars drive through here going RIGHT (positive X direction)
      // Finish line is at x=520-568, so place checkpoint just after it
      { 
        x: 570,                          // Just after finish line (520 + 48)
        y: worldH - 200 - halfW - 10,    // Top edge: 1600 - 75 - 10 = 1515
        width: 100,                      // Wide enough to catch cars
        height: W + 20,                  // 170 pixels tall, covers track
        index: 0 
      },
      // Checkpoint 1: Right side of track (cars going UP)
      // Waypoint 8: x=1600, y=worldH-1100=700
      { 
        x: 1600 - halfW - 10,            // 1600 - 75 - 10 = 1515
        y: 650,                          // On the right straight going up
        width: W + 20,                   // 170 wide
        height: 150,
        index: 1 
      },
      // Checkpoint 2: Top section (cars going LEFT)
      // Waypoints 12-13: x around 900-1100, y around 200-220
      { 
        x: 850,
        y: 200 - halfW - 10,             // 200 - 75 - 10 = 115
        width: 200,
        height: W + 20,
        index: 2 
      },
      // Checkpoint 3: S-bend/left side (cars going DOWN toward finish)
      // Waypoint 23-24: x around 200-250, y around 1300-1450
      { 
        x: 200 - halfW - 10,             // 200 - 75 - 10 = 115
        y: 1250,
        width: W + 20,
        height: 200,
        index: 3 
      },
    ];
  }

  /**
   * Create starting grid positions
   */
  private createStartPositions(): void {
    const worldH = this.worldHeight;
    
    // Starting grid on the bottom straight
    // Cars face right (rotation = 0)
    const gridStartX = 700;
    const trackCenterY = worldH - 200;
    const colSpacing = 55;
    const rowSpacing = 35;
    
    this.startPositions = [
      // Row 1 (front)
      { x: gridStartX, y: trackCenterY - rowSpacing, rotation: 0 },
      { x: gridStartX, y: trackCenterY, rotation: 0 },
      { x: gridStartX, y: trackCenterY + rowSpacing, rotation: 0 },
      // Row 2
      { x: gridStartX - colSpacing, y: trackCenterY - rowSpacing * 0.5, rotation: 0 },
      { x: gridStartX - colSpacing, y: trackCenterY + rowSpacing * 0.5, rotation: 0 },
      { x: gridStartX - colSpacing, y: trackCenterY + rowSpacing * 1.1, rotation: 0 },
      // Row 3
      { x: gridStartX - colSpacing * 2, y: trackCenterY - rowSpacing, rotation: 0 },
      { x: gridStartX - colSpacing * 2, y: trackCenterY, rotation: 0 },
      { x: gridStartX - colSpacing * 2, y: trackCenterY + rowSpacing, rotation: 0 },
      // Row 4 (back - player starts here)
      { x: gridStartX - colSpacing * 3, y: trackCenterY, rotation: 0 },
    ];
  }

  // Barrier paths for smooth rendering (outer and inner)
  private outerBarrierPath: { x: number; y: number }[] = [];
  private innerBarrierPath: { x: number; y: number }[] = [];

  /**
   * Generate barrier segments from track edges with smooth corners
   */
  private generateBarrierSegments(): void {
    this.barrierSegments = [];
    this.outerBarrierPath = [];
    this.innerBarrierPath = [];
    
    const W = this.trackWidth;
    const halfW = W / 2;
    const worldH = this.worldHeight;
    
    // Track centerline - this is a CLOSED loop
    // The last point should flow naturally back to the first point
    const trackPath = [
      { x: 200, y: worldH - 200 },   // 0: Start of bottom straight
      { x: 600, y: worldH - 200 },   // 1: Bottom straight
      { x: 900, y: worldH - 200 },   // 2: Bottom straight end
      { x: 1100, y: worldH - 250 },  // 3: Start of right curve
      { x: 1300, y: worldH - 350 },  // 4: Right curve
      { x: 1450, y: worldH - 500 },  // 5: Right curve
      { x: 1550, y: worldH - 700 },  // 6: Right side
      { x: 1600, y: worldH - 900 },  // 7: Right side
      { x: 1600, y: worldH - 1100 }, // 8: Right side
      { x: 1550, y: 500 },           // 9: Top right
      { x: 1450, y: 350 },           // 10: Top curve
      { x: 1300, y: 250 },           // 11: Top curve
      { x: 1100, y: 200 },           // 12: Top straight
      { x: 900, y: 220 },            // 13: Top straight
      { x: 700, y: 280 },            // 14: Top left curve
      { x: 500, y: 350 },            // 15: Hairpin entry
      { x: 350, y: 450 },            // 16: Hairpin
      { x: 300, y: 600 },            // 17: Hairpin exit
      { x: 350, y: 750 },            // 18: S-bend entry
      { x: 500, y: 850 },            // 19: S-bend
      { x: 550, y: 950 },            // 20: S-bend middle
      { x: 500, y: 1050 },           // 21: S-bend
      { x: 350, y: 1150 },           // 22: S-bend exit
      { x: 250, y: 1300 },           // 23: Final curve
      { x: 200, y: 1450 },           // 24: Final straight
      // Point 25 removed - it was too close to point 0, causing the crossing barrier
      // The loop naturally closes from point 24 back to point 0
    ];
    
    const n = trackPath.length;
    const barrierOffset = halfW + this.barrierWidth / 2 + 5;
    
    // First pass: compute smoothed perpendicular at each point
    // by averaging the normals of adjacent segments
    const smoothedPerps: { x: number; y: number }[] = [];
    
    for (let i = 0; i < n; i++) {
      const prev = trackPath[(i - 1 + n) % n];
      const curr = trackPath[i];
      const next = trackPath[(i + 1) % n];
      
      // Direction from prev to curr
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
      
      // Direction from curr to next
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
      
      // Perpendiculars (rotate 90 degrees)
      const perp1x = -dy1 / len1;
      const perp1y = dx1 / len1;
      const perp2x = -dy2 / len2;
      const perp2y = dx2 / len2;
      
      // Average the perpendiculars for smooth corners
      let avgPerpX = (perp1x + perp2x) / 2;
      let avgPerpY = (perp1y + perp2y) / 2;
      
      // Normalize
      const avgLen = Math.sqrt(avgPerpX * avgPerpX + avgPerpY * avgPerpY) || 1;
      avgPerpX /= avgLen;
      avgPerpY /= avgLen;
      
      smoothedPerps.push({ x: avgPerpX, y: avgPerpY });
    }
    
    // Second pass: generate barrier paths using smoothed perpendiculars
    for (let i = 0; i < n; i++) {
      const p = trackPath[i];
      const perp = smoothedPerps[i];
      
      // Outer barrier point (left side)
      this.outerBarrierPath.push({
        x: p.x + perp.x * barrierOffset,
        y: p.y + perp.y * barrierOffset,
      });
      
      // Inner barrier point (right side)
      this.innerBarrierPath.push({
        x: p.x - perp.x * barrierOffset,
        y: p.y - perp.y * barrierOffset,
      });
    }
    
    // Third pass: create collision segments from the smoothed paths
    // Include ALL segments including the closing one (loop is complete)
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      
      // Outer barrier segment
      const o1 = this.outerBarrierPath[i];
      const o2 = this.outerBarrierPath[j];
      const odx = o2.x - o1.x;
      const ody = o2.y - o1.y;
      const olen = Math.sqrt(odx * odx + ody * ody) || 1;
      
      this.barrierSegments.push({
        x1: o1.x, y1: o1.y,
        x2: o2.x, y2: o2.y,
        normalX: ody / olen,  // Normal pointing inward (right of direction)
        normalY: -odx / olen,
      });
      
      // Inner barrier segment
      const i1 = this.innerBarrierPath[i];
      const i2 = this.innerBarrierPath[j];
      const idx = i2.x - i1.x;
      const idy = i2.y - i1.y;
      const ilen = Math.sqrt(idx * idx + idy * idy) || 1;
      
      this.barrierSegments.push({
        x1: i1.x, y1: i1.y,
        x2: i2.x, y2: i2.y,
        normalX: -idy / ilen,  // Normal pointing outward (left of direction)
        normalY: idx / ilen,
      });
    }
  }

  /**
   * Render grass background
   */
  renderGrass(ctx: CanvasRenderingContext2D, cameraX: number = 0, cameraY: number = 0, viewWidth: number = this.worldWidth, viewHeight: number = this.worldHeight): void {
    if (this.grassTile) {
      const pattern = ctx.createPattern(this.grassTile, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        const padding = 64;
        ctx.fillRect(
          Math.max(0, cameraX - padding),
          Math.max(0, cameraY - padding),
          Math.min(this.worldWidth, viewWidth + padding * 2),
          Math.min(this.worldHeight, viewHeight + padding * 2)
        );
      }
    } else {
      ctx.fillStyle = '#2d5a27';
      ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
    }
  }

  /**
   * Render the track surface
   */
  render(ctx: CanvasRenderingContext2D, cameraBounds?: { minX: number; minY: number; maxX: number; maxY: number }): void {
    ctx.fillStyle = "#555555";
    
    // Draw polygon-based track segments
    for (const polygon of this.trackPolygons) {
      // Simple culling for polygons
      if (cameraBounds) {
        const bounds = this.getPolygonBounds(polygon);
        if (bounds.maxX < cameraBounds.minX || bounds.minX > cameraBounds.maxX ||
            bounds.maxY < cameraBounds.minY || bounds.minY > cameraBounds.maxY) {
          continue;
        }
      }
      
      ctx.beginPath();
      ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
      for (let i = 1; i < polygon.points.length; i++) {
        ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }
    
    // Draw rectangular segments (if any remain)
    for (const segment of this.roadSegments) {
      if (cameraBounds) {
        if (segment.x + segment.width < cameraBounds.minX ||
            segment.x > cameraBounds.maxX ||
            segment.y + segment.height < cameraBounds.minY ||
            segment.y > cameraBounds.maxY) {
          continue;
        }
      }
      ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
    }

    // Draw center line markings along the track path
    this.renderCenterLine(ctx);

    // Draw start/finish line
    this.renderFinishLine(ctx);
  }
  
  /**
   * Get bounding box of a polygon
   */
  private getPolygonBounds(polygon: TrackPolygon): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of polygon.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }
  
  /**
   * Render dashed center line along track
   */
  private renderCenterLine(ctx: CanvasRenderingContext2D): void {
    if (this.waypoints.length < 2) return;
    
    ctx.strokeStyle = "#ffffff";
    ctx.setLineDash([20, 20]);
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
    
    for (let i = 1; i < this.waypoints.length; i++) {
      ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
    }
    
    // Close the loop
    ctx.lineTo(this.waypoints[0].x, this.waypoints[0].y);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }

  /**
   * Render the checkered finish line
   */
  private renderFinishLine(ctx: CanvasRenderingContext2D): void {
    const W = this.trackWidth;
    const worldH = this.worldHeight;
    // Align with checkpoint 0
    const finishX = 520;
    const finishY = worldH - 200 - W/2;
    const finishHeight = W;
    const tileSize = 24;

    if (this.finishTile) {
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
      const squareSize = 18;
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

    // Draw "FINISH" text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText("FINISH", finishX + tileSize, finishY - 8);
    ctx.textAlign = "left";
  }

  /**
   * Render barriers along track edges as smooth continuous paths
   */
  renderBarriers(ctx: CanvasRenderingContext2D, _cameraBounds?: { minX: number; minY: number; maxX: number; maxY: number }): void {
    // Draw barriers as thick stroked paths for smooth appearance
    ctx.lineWidth = this.barrierWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Create metallic barrier appearance
    const drawBarrierPath = (path: { x: number; y: number }[]) => {
      if (path.length < 2) return;
      
      // Main barrier body (dark gray)
      ctx.strokeStyle = "#505050";
      ctx.lineWidth = this.barrierWidth;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      
      // Highlight on top edge (lighter)
      ctx.strokeStyle = "#787878";
      ctx.lineWidth = this.barrierWidth * 0.4;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      
      // Dark edge for depth
      ctx.strokeStyle = "#303030";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      
      // Draw warning stripes at intervals
      this.renderBarrierStripes(ctx, path);
    };
    
    // Draw outer and inner barriers
    drawBarrierPath(this.outerBarrierPath);
    drawBarrierPath(this.innerBarrierPath);
  }
  
  /**
   * Render warning stripes on barrier path
   */
  private renderBarrierStripes(ctx: CanvasRenderingContext2D, path: { x: number; y: number }[]): void {
    if (path.length < 2) return;
    
    const stripeSpacing = 80; // Distance between stripes
    const stripeWidth = 8;
    let accumulatedDist = 0;
    
    ctx.fillStyle = "#cc3333"; // Red warning color
    
    for (let i = 0; i < path.length; i++) {
      const p1 = path[i];
      const p2 = path[(i + 1) % path.length];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segmentLen = Math.sqrt(dx * dx + dy * dy);
      
      if (segmentLen < 1) continue;
      
      // Unit direction
      const ux = dx / segmentLen;
      const uy = dy / segmentLen;
      
      // Perpendicular for stripe width
      const px = -uy;
      const py = ux;
      
      // Walk along segment and place stripes
      let t = (stripeSpacing - (accumulatedDist % stripeSpacing)) % stripeSpacing;
      
      while (t < segmentLen) {
        const x = p1.x + ux * t;
        const y = p1.y + uy * t;
        
        // Draw small stripe rectangle
        ctx.beginPath();
        ctx.moveTo(x - px * this.barrierWidth * 0.4, y - py * this.barrierWidth * 0.4);
        ctx.lineTo(x + px * this.barrierWidth * 0.4, y + py * this.barrierWidth * 0.4);
        ctx.lineTo(x + px * this.barrierWidth * 0.4 + ux * stripeWidth, y + py * this.barrierWidth * 0.4 + uy * stripeWidth);
        ctx.lineTo(x - px * this.barrierWidth * 0.4 + ux * stripeWidth, y - py * this.barrierWidth * 0.4 + uy * stripeWidth);
        ctx.closePath();
        ctx.fill();
        
        t += stripeSpacing;
      }
      
      accumulatedDist += segmentLen;
    }
  }

  /**
   * Render checkpoint zones for debugging
   */
  renderCheckpoints(ctx: CanvasRenderingContext2D): void {
    if (!this.debugMode) return;
    
    const colors = [
      'rgba(255, 0, 0, 0.4)',    // Checkpoint 0 (finish) - red
      'rgba(0, 255, 0, 0.4)',    // Checkpoint 1 - green
      'rgba(0, 0, 255, 0.4)',    // Checkpoint 2 - blue
      'rgba(255, 255, 0, 0.4)',  // Checkpoint 3 - yellow
    ];
    
    for (const cp of this.checkpoints) {
      // Draw checkpoint zone
      ctx.fillStyle = colors[cp.index % colors.length];
      ctx.fillRect(cp.x, cp.y, cp.width, cp.height);
      
      // Draw border
      ctx.strokeStyle = colors[cp.index % colors.length].replace('0.4', '1');
      ctx.lineWidth = 3;
      ctx.strokeRect(cp.x, cp.y, cp.width, cp.height);
      
      // Draw label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = cp.index === 0 ? 'FINISH' : `CP ${cp.index}`;
      ctx.fillText(label, cp.x + cp.width / 2, cp.y + cp.height / 2);
    }
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  
  /**
   * Toggle debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Check if car is on track (supports polygon segments)
   */
  checkCollision(car: Car): void {
    const onTrack = this.isOnTrack(car.x, car.y);

    if (!onTrack) {
      car.offTrackPenalty();
    }
  }

  /**
   * Check barrier collision and apply bounce/damage
   */
  checkBarrierCollision(car: Car): { hit: boolean; damage: number } {
    // Use a smaller collision radius - cars don't fill their entire sprite frame
    // Car sprite is 48x48 but the actual car body is roughly 32x20 pixels
    const carCollisionRadius = 12; // Much smaller than car.width / 2 (24)

    for (const segment of this.barrierSegments) {
      const dist = this.pointToSegmentDistance(
        car.x, car.y,
        segment.x1, segment.y1,
        segment.x2, segment.y2
      );

      // Collision when car center is within collision radius of barrier center
      if (dist < carCollisionRadius + this.barrierWidth / 2) {
        const impactSpeed = Math.abs(car.speed);
        
        const pushForce = Math.max(8, impactSpeed * 0.15);
        car.x += segment.normalX * pushForce * 0.5;
        car.y += segment.normalY * pushForce * 0.5;

        car.speed *= -0.3;

        const damage = Math.max(2, impactSpeed * 0.04);

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
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  /**
   * Check if point is on track (polygon-based)
   */
  isOnTrack(x: number, y: number): boolean {
    // Check polygons first
    for (const polygon of this.trackPolygons) {
      if (this.pointInPolygon(x, y, polygon.points)) {
        return true;
      }
    }
    
    // Also check rectangular segments
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
   * Point-in-polygon test using ray casting
   */
  private pointInPolygon(x: number, y: number, points: { x: number; y: number }[]): boolean {
    let inside = false;
    const n = points.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Get distance to nearest track edge (for scenery placement)
   */
  distanceToTrack(x: number, y: number): number {
    // Quick check if on track
    if (this.isOnTrack(x, y)) {
      return 0;
    }
    
    // Find minimum distance to any track centerline point
    let minDist = Infinity;
    
    for (const wp of this.waypoints) {
      const dist = Math.sqrt((x - wp.x) ** 2 + (y - wp.y) ** 2);
      minDist = Math.min(minDist, dist - this.trackWidth / 2);
    }
    
    return Math.max(0, minDist);
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
    return this.worldHeight;
  }

  getWorldWidth(): number {
    return this.worldWidth;
  }

  getWorldHeight(): number {
    return this.worldHeight;
  }

  getTrackName(): string {
    return this.trackName;
  }
}
