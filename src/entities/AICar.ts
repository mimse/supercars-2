import { Car } from "./Car";

export interface Waypoint {
  x: number;
  y: number;
}

// Interface for cars that can be avoided
export interface AvoidableCar {
  x: number;
  y: number;
  speed: number;
  rotation: number;
  width: number;
}

export class AICar extends Car {
  private waypoints: Waypoint[] = [];
  private currentWaypointIndex: number = 0;
  private readonly waypointThreshold: number = 50;

  // AI personality variations
  private readonly skillLevel: number;
  private readonly aggressiveness: number;

  // Overtaking state
  private overtakeLateralOffset: number = 0; // Actual lateral offset in pixels (-ve = left, +ve = right)
  private targetLateralOffset: number = 0; // Target offset we're moving towards
  private overtakeTimer: number = 0; // Time remaining in overtake maneuver
  private overtakeCooldown: number = 0; // Cooldown before starting another overtake

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

  updateAI(dt: number, otherCars: AvoidableCar[] = []): void {
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

    // Update timers
    if (this.overtakeTimer > 0) {
      this.overtakeTimer -= dt;
    }
    if (this.overtakeCooldown > 0) {
      this.overtakeCooldown -= dt;
    }

    // Smoothly interpolate lateral offset towards target
    const offsetSpeed = 120 * dt; // pixels per second to move laterally
    if (Math.abs(this.targetLateralOffset - this.overtakeLateralOffset) < offsetSpeed) {
      this.overtakeLateralOffset = this.targetLateralOffset;
    } else if (this.targetLateralOffset > this.overtakeLateralOffset) {
      this.overtakeLateralOffset += offsetSpeed;
    } else {
      this.overtakeLateralOffset -= offsetSpeed;
    }

    // Check for cars ahead and decide on overtaking
    const avoidanceResult = this.checkForCarsAhead(otherCars);
    
    // Check if being overtaken by a faster car from behind/side
    const yieldDirection = this.checkBeingOvertaken(otherCars);
    
    // Manage overtaking state
    let isOvertaking = false;
    
    if (avoidanceResult.needsAvoidance && avoidanceResult.carAhead && this.overtakeCooldown <= 0) {
      isOvertaking = true;
      
      // Start a new overtake maneuver if we don't have one
      if (this.overtakeTimer <= 0) {
        const side = this.decideOvertakeSide(avoidanceResult.carAhead, target);
        // Set a substantial lateral offset (40-60 pixels based on aggressiveness)
        this.targetLateralOffset = side * (40 + this.aggressiveness * 20);
        this.overtakeTimer = 2.5 + Math.random() * 0.5; // Commit to overtake for 2.5-3 seconds
      }
    } else if (this.overtakeTimer <= 0) {
      // Return to racing line when not overtaking
      this.targetLateralOffset = 0;
    }

    // Calculate adjusted target position with lateral offset
    // Offset is perpendicular to our current heading
    const perpX = -Math.sin(this.rotation) * this.overtakeLateralOffset;
    const perpY = Math.cos(this.rotation) * this.overtakeLateralOffset;
    
    const adjustedTargetX = target.x + perpX;
    const adjustedTargetY = target.y + perpY;
    
    // Calculate angle to adjusted target
    const adjDx = adjustedTargetX - this.x;
    const adjDy = adjustedTargetY - this.y;
    let angleDiff = Math.atan2(adjDy, adjDx) - this.rotation;

    // Normalize angle to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // If being overtaken, yield by adding offset in yield direction
    if (yieldDirection !== 0 && !isOvertaking) {
      this.targetLateralOffset = yieldDirection * 35; // Move aside
      this.overtakeCooldown = 1.0; // Don't immediately try to overtake back
    }

    // Steering decision - more responsive steering
    const steerThreshold = 0.05;
    const steerStrength = this.skillLevel * (isOvertaking ? 1.2 : 1.0);
    
    if (angleDiff > steerThreshold) {
      this.steer(steerStrength, dt);
    } else if (angleDiff < -steerThreshold) {
      this.steer(-steerStrength, dt);
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

    // Brake for sharp turns OR when extremely close to car ahead (emergency brake)
    const shouldEmergencyBrake = avoidanceResult.needsAvoidance && 
                                  avoidanceResult.distance < 35 && 
                                  this.speed > (avoidanceResult.carAhead?.speed ?? 0) + 20;
    
    if ((turnSeverity > 1.0 && distance < 100 && this.speed > 150) || shouldEmergencyBrake) {
      this.brake(dt * this.aggressiveness);
    } else if (isOvertaking) {
      // Accelerate harder while overtaking to actually pass
      this.accelerate(dt * this.skillLevel * 1.15 * destroyedMultiplier);
    } else {
      // Normal acceleration
      this.accelerate(dt * this.skillLevel * destroyedMultiplier);
    }

    // Update physics
    this.update(dt);
  }

  /**
   * Check for cars ahead in our path
   */
  private checkForCarsAhead(otherCars: AvoidableCar[]): {
    needsAvoidance: boolean;
    carAhead: AvoidableCar | null;
    distance: number;
  } {
    const lookAheadDistance = 150; // How far ahead to look
    const lookAheadWidth = 45; // Width of detection corridor
    
    let closestCar: AvoidableCar | null = null;
    let closestDistance = Infinity;

    for (const car of otherCars) {
      // Skip self comparison (position check)
      if (Math.abs(car.x - this.x) < 1 && Math.abs(car.y - this.y) < 1) {
        continue;
      }

      const dx = car.x - this.x;
      const dy = car.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only check cars within look-ahead distance
      if (distance > lookAheadDistance) continue;

      // Calculate angle to the other car
      const angleToOther = Math.atan2(dy, dx);
      let relativeAngle = angleToOther - this.rotation;
      
      // Normalize angle
      while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
      while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

      // Check if car is ahead (within 60-degree forward cone)
      if (Math.abs(relativeAngle) < Math.PI / 3) {
        // Check lateral distance (perpendicular to our heading)
        const lateralDistance = Math.abs(Math.sin(relativeAngle) * distance);
        
        // If car is in our path (laterally close enough)
        if (lateralDistance < lookAheadWidth) {
          // Trigger avoidance if:
          // 1. Car ahead is slower than us (any amount)
          // 2. Car ahead is similar speed but very close
          // 3. We're much faster and catching up
          const speedDiff = this.speed - car.speed;
          const isSlower = speedDiff > 5; // They're slower
          const isVeryClose = distance < 80;
          const isCatchingUp = speedDiff > -10 && distance < 120; // Similar speed but close
          
          if ((isSlower || isVeryClose || isCatchingUp) && distance < closestDistance) {
            closestDistance = distance;
            closestCar = car;
          }
        }
      }
    }

    return {
      needsAvoidance: closestCar !== null,
      carAhead: closestCar,
      distance: closestDistance,
    };
  }

  /**
   * Check if a faster car is trying to overtake from behind or the side
   * Returns which direction to yield (-1 for left, 1 for right, 0 for no yield needed)
   */
  private checkBeingOvertaken(otherCars: AvoidableCar[]): number {
    const detectionRange = 80; // How far to detect approaching cars
    
    for (const car of otherCars) {
      // Skip self comparison
      if (Math.abs(car.x - this.x) < 1 && Math.abs(car.y - this.y) < 1) {
        continue;
      }

      const dx = car.x - this.x;
      const dy = car.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only check cars within detection range
      if (distance > detectionRange) continue;

      // Calculate angle to the other car relative to our heading
      const angleToOther = Math.atan2(dy, dx);
      let relativeAngle = angleToOther - this.rotation;
      
      // Normalize angle
      while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
      while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

      const absAngle = Math.abs(relativeAngle);
      
      // Check if car is behind us (rear 120 degrees) or to the side (60-150 degrees)
      const isBehind = absAngle > (Math.PI * 2) / 3; // Behind us
      const isToSide = absAngle > Math.PI / 3 && absAngle < (Math.PI * 5) / 6;
      
      // Only yield if the other car is faster and approaching
      const isApproachingFast = car.speed > this.speed + 30;
      const isVeryClose = distance < 50;
      
      if ((isBehind || isToSide) && (isApproachingFast || isVeryClose)) {
        // Yield to the opposite side of where the car is
        // If car is to our left (positive relativeAngle), yield right (return 1)
        // If car is to our right (negative relativeAngle), yield left (return -1)
        return relativeAngle > 0 ? 1 : -1;
      }
    }

    return 0; // No yield needed
  }

  /**
   * Decide which side to overtake on (left or right)
   * Returns -1 for left, 1 for right
   */
  private decideOvertakeSide(carAhead: AvoidableCar, target: Waypoint): number {
    // Calculate angle from us to the waypoint
    const toTargetAngle = Math.atan2(target.y - this.y, target.x - this.x);
    
    // Calculate angle from us to the car ahead
    const toCarAngle = Math.atan2(carAhead.y - this.y, carAhead.x - this.x);
    
    // Calculate where the car ahead is relative to the line to our target
    let angleDiff = toCarAngle - toTargetAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // If car is slightly to our right of the target line, go left (and vice versa)
    // This creates a natural "passing on the opposite side" behavior
    const baseSide = angleDiff > 0 ? -1 : 1;
    
    // Add some randomness based on aggressiveness to make AI less predictable
    if (Math.random() > this.aggressiveness) {
      return -baseSide; // Sometimes take the other side
    }
    
    return baseSide;
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
