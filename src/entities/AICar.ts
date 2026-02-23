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

  // Car identification
  readonly name: string;

  constructor(
    x: number,
    y: number,
    rotation: number,
    spriteIndex: number,
    name: string,
    skillLevel: number = 0.8,
  ) {
    super(x, y, rotation);
    this.spriteIndex = spriteIndex;
    this.name = name;
    this.skillLevel = Math.min(1, Math.max(0.5, skillLevel));
    this.aggressiveness = 0.7 + Math.random() * 0.3;
  }

  setWaypoints(waypoints: Waypoint[], startIndex: number = 0): void {
    this.waypoints = waypoints;
    this.currentWaypointIndex = startIndex;
  }

  findNearestWaypointAhead(): void {
    if (this.waypoints.length === 0) return;

    // Find waypoint that is ahead of the car (in the direction it's facing)
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < this.waypoints.length; i++) {
      const wp = this.waypoints[i];
      const dx = wp.x - this.x;
      const dy = wp.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angleToWaypoint = Math.atan2(dy, dx);

      // Calculate how much the waypoint is "ahead" (in facing direction)
      let angleDiff = angleToWaypoint - this.rotation;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Score: prefer waypoints that are ahead (small angle diff) and not too far
      // cos(angleDiff) is 1 when directly ahead, -1 when behind
      const aheadScore = Math.cos(angleDiff);

      // Only consider waypoints that are somewhat ahead
      if (aheadScore > 0.3 && distance > 30 && distance < 300) {
        const score = aheadScore * 100 - distance * 0.5;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
    }

    this.currentWaypointIndex = bestIndex;
  }

  updateAI(dt: number): void {
    if (this.waypoints.length === 0) return;

    // Destroyed AI cars move very slowly
    const destroyedMultiplier = this.isDestroyed() ? 0.4 : 1;

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
      this.accelerate(dt * this.skillLevel * destroyedMultiplier);
    }

    // Update physics
    this.update(dt);
  }

  // AICar uses parent's render method with sprites
  // No need to override - just set spriteSheet via setSprite()

  getCurrentWaypointIndex(): number {
    return this.currentWaypointIndex;
  }

  setCurrentWaypointIndex(index: number): void {
    this.currentWaypointIndex = index;
  }
}
