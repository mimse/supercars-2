import { Car } from "./Car";

export interface Waypoint {
  x: number;
  y: number;
}

export class AICar extends Car {
  private waypoints: Waypoint[] = [];
  private currentWaypointIndex: number = 0;
  private readonly waypointThreshold: number = 50;

  // AI personality variations
  private readonly skillLevel: number;
  private readonly aggressiveness: number;

  // Car color for rendering
  readonly color: string;
  readonly name: string;

  constructor(
    x: number,
    y: number,
    rotation: number,
    color: string,
    name: string,
    skillLevel: number = 0.8,
  ) {
    super(x, y, rotation);
    this.color = color;
    this.name = name;
    this.skillLevel = Math.min(1, Math.max(0.5, skillLevel));
    this.aggressiveness = 0.7 + Math.random() * 0.3;
  }

  setWaypoints(waypoints: Waypoint[]): void {
    this.waypoints = waypoints;
    this.currentWaypointIndex = 0;
  }

  updateAI(dt: number): void {
    if (this.waypoints.length === 0) return;

    const target = this.waypoints[this.currentWaypointIndex];

    // Calculate angle to target
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const targetAngle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if reached waypoint
    if (distance < this.waypointThreshold) {
      this.currentWaypointIndex =
        (this.currentWaypointIndex + 1) % this.waypoints.length;
    }

    // Calculate angle difference
    let angleDiff = targetAngle - this.rotation;

    // Normalize angle to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Steering decision
    const steerThreshold = 0.1;
    if (angleDiff > steerThreshold) {
      this.steer(1 * this.skillLevel, dt);
    } else if (angleDiff < -steerThreshold) {
      this.steer(-1 * this.skillLevel, dt);
    }

    // Speed control based on upcoming turn
    const nextWaypointIndex =
      (this.currentWaypointIndex + 1) % this.waypoints.length;
    const nextTarget = this.waypoints[nextWaypointIndex];
    const nextDx = nextTarget.x - target.x;
    const nextDy = nextTarget.y - target.y;
    const nextAngle = Math.atan2(nextDy, nextDx);

    let turnSeverity = Math.abs(nextAngle - targetAngle);
    while (turnSeverity > Math.PI) turnSeverity -= Math.PI * 2;
    turnSeverity = Math.abs(turnSeverity);

    // Brake for sharp turns
    if (turnSeverity > 1.0 && distance < 100 && this.speed > 150) {
      this.brake(dt * this.aggressiveness);
    } else {
      // Accelerate with skill-based variation
      this.accelerate(dt * this.skillLevel);
    }

    // Update physics
    this.update(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Draw car body with AI color
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Draw car front (nose) - darker shade
    ctx.fillStyle = this.darkenColor(this.color, 0.8);
    ctx.fillRect(this.width / 2 - 8, -this.height / 2 + 2, 8, this.height - 4);

    // Draw windshield
    ctx.fillStyle = "#a8dadc";
    ctx.fillRect(this.width / 2 - 18, -this.height / 2 + 4, 8, this.height - 8);

    // Draw wheels
    ctx.fillStyle = "#1d3557";
    ctx.fillRect(this.width / 2 - 12, -this.height / 2 - 3, 10, 4);
    ctx.fillRect(this.width / 2 - 12, this.height / 2 - 1, 10, 4);
    ctx.fillRect(-this.width / 2 + 2, -this.height / 2 - 3, 10, 4);
    ctx.fillRect(-this.width / 2 + 2, this.height / 2 - 1, 10, 4);

    ctx.restore();
  }

  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
  }

  getCurrentWaypointIndex(): number {
    return this.currentWaypointIndex;
  }

  setCurrentWaypointIndex(index: number): void {
    this.currentWaypointIndex = index;
  }
}
