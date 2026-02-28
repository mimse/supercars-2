export class Car {
  // World bounds (can be set globally for all cars)
  static worldWidth: number = 2400;
  static worldHeight: number = 1800;
  static readonly worldMargin: number = 40;
  
  // Position
  x: number;
  y: number;

  // Rotation in radians (0 = facing right)
  rotation: number;

  // Velocity
  protected vx: number = 0;
  protected vy: number = 0;

  // Speed (magnitude of velocity)
  speed: number = 0;

  // Car properties (protected for AI subclass access)
  protected readonly maxSpeed: number = 300;
  protected readonly acceleration: number = 150;
  protected readonly brakeForce: number = 200;
  protected readonly friction: number = 0.98;
  protected readonly turnSpeed: number = 3;
  protected readonly offTrackFriction: number = 0.92;

  // Car dimensions (updated for sprite-based rendering) - 2x scale
  readonly width: number = 48;
  readonly height: number = 48;

  // Sprite rendering - 2x scale
  protected spriteSheet: HTMLCanvasElement | null = null;
  protected spriteIndex: number = 0; // Row in sprite sheet (color)
  protected readonly frameSize: number = 48;  // 2x (was 24)
  protected readonly framesPerRotation: number = 16;

  // Damage system
  damage: number = 0;
  readonly maxDamage: number = 100;
  private damageFlashTimer: number = 0;
  private _hasExploded: boolean = false;

  // State
  protected _isOffTrack: boolean = false;

  constructor(x: number, y: number, rotation: number = -Math.PI / 2) {
    this.x = x;
    this.y = y;
    this.rotation = rotation; // Default facing up
  }

  /**
   * Set the sprite sheet and color index for rendering
   */
  setSprite(spriteSheet: HTMLCanvasElement, colorIndex: number): void {
    this.spriteSheet = spriteSheet;
    this.spriteIndex = colorIndex;
  }

  /**
   * Apply damage to the car
   * Returns true if the car just got destroyed (for triggering explosion)
   */
  applyDamage(amount: number): boolean {
    if (amount <= 0 || this._hasExploded) return false;
    const wasDestroyed = this.isDestroyed();
    this.damage = Math.min(this.maxDamage, this.damage + amount);
    this.damageFlashTimer = 0.15; // Flash for 150ms
    
    // Mark as exploded when destroyed
    if (!wasDestroyed && this.isDestroyed()) {
      this._hasExploded = true;
      return true;
    }
    return false;
  }

  /**
   * Check if car is destroyed
   */
  isDestroyed(): boolean {
    return this.damage >= this.maxDamage;
  }

  /**
   * Check if car has exploded and should be removed from game
   */
  hasExploded(): boolean {
    return this._hasExploded;
  }

  /**
   * Get damage as percentage (0-1)
   */
  getDamagePercent(): number {
    return this.damage / this.maxDamage;
  }

  /**
   * Reset damage (for race restart)
   */
  resetDamage(): void {
    this.damage = 0;
    this.damageFlashTimer = 0;
    this._hasExploded = false;
  }

  /**
   * Check if car is currently off track
   */
  get isOffTrack(): boolean {
    return this._isOffTrack;
  }

  accelerate(dt: number): void {
    // Destroyed cars accelerate much slower
    const destroyedPenalty = this.isDestroyed() ? 0.3 : 1;
    const accel = this._isOffTrack 
      ? this.acceleration * 0.5 * destroyedPenalty
      : this.acceleration * destroyedPenalty;
    this.speed = Math.min(this.speed + accel * dt, this.maxSpeed * destroyedPenalty);
  }

  brake(dt: number): void {
    this.speed = Math.max(
      this.speed - this.brakeForce * dt,
      -this.maxSpeed * 0.3,
    );
  }

  steer(direction: number, dt: number): void {
    // Only steer when moving
    if (Math.abs(this.speed) > 5) {
      const steerAmount = this.turnSpeed * direction * dt;
      // Reduce steering at high speeds
      const speedFactor = 1 - (Math.abs(this.speed) / this.maxSpeed) * 0.5;
      this.rotation += steerAmount * speedFactor * Math.sign(this.speed);
    }
  }

  update(dt: number): void {
    // Apply friction
    const currentFriction = this._isOffTrack
      ? this.offTrackFriction
      : this.friction;
    this.speed *= Math.pow(currentFriction, dt * 60);

    // Convert speed and rotation to velocity
    this.vx = Math.cos(this.rotation) * this.speed;
    this.vy = Math.sin(this.rotation) * this.speed;

    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Reset off-track flag (will be set by track collision check)
    this._isOffTrack = false;

    // Keep car in bounds (world bounds protection)
    const margin = Car.worldMargin;
    this.x = Math.max(margin, Math.min(Car.worldWidth - margin, this.x));
    this.y = Math.max(margin, Math.min(Car.worldHeight - margin, this.y));

    // Update damage flash timer
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= dt;
    }
  }

  offTrackPenalty(): void {
    this._isOffTrack = true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Draw shadow first
    this.renderShadow(ctx);

    if (this.spriteSheet) {
      this.renderSprite(ctx);
    } else {
      this.renderFallback(ctx);
    }

    // Render damage flash effect
    this.renderDamageFlash(ctx);
  }

  /**
   * Render car shadow - 2x scale
   */
  protected renderShadow(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x + 6, this.y + 6);  // 2x offset (was 3, 3)
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 12, this.rotation, 0, Math.PI * 2);  // 2x size (was 10, 6)
    ctx.fill();
    ctx.restore();
  }

  /**
   * Render car using sprite sheet
   */
  protected renderSprite(ctx: CanvasRenderingContext2D): void {
    if (!this.spriteSheet) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Calculate frame based on rotation (0-15)
    // Normalize rotation to [0, 2*PI)
    let normalizedRotation = this.rotation % (Math.PI * 2);
    if (normalizedRotation < 0) normalizedRotation += Math.PI * 2;

    const frameIndex = Math.round((normalizedRotation / (Math.PI * 2)) * this.framesPerRotation) % this.framesPerRotation;

    // Draw sprite frame
    ctx.drawImage(
      this.spriteSheet,
      frameIndex * this.frameSize,        // Source X
      this.spriteIndex * this.frameSize,  // Source Y (row = color)
      this.frameSize, this.frameSize,     // Source size
      -this.frameSize / 2, -this.frameSize / 2,  // Dest position (centered)
      this.frameSize, this.frameSize      // Dest size
    );

    ctx.restore();
  }

  /**
   * Render damage flash overlay
   */
  protected renderDamageFlash(ctx: CanvasRenderingContext2D): void {
    if (this.damageFlashTimer <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = Math.min(0.6, this.damageFlashTimer * 4);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(0, 0, this.frameSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Fallback rendering when sprites aren't loaded
   */
  protected renderFallback(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Move to car position and rotate
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Draw car body
    ctx.fillStyle = "#e63946"; // Red car
    ctx.fillRect(-this.width / 2, -this.height / 2 + 4, this.width, this.height - 8);

    // Draw car front (nose)
    ctx.fillStyle = "#dc2f3c";
    ctx.fillRect(this.width / 2 - 8, -this.height / 2 + 6, 8, this.height - 12);

    // Draw windshield
    ctx.fillStyle = "#a8dadc";
    ctx.fillRect(this.width / 2 - 18, -this.height / 2 + 8, 8, this.height - 16);

    // Draw wheels
    ctx.fillStyle = "#1d3557";
    // Front wheels
    ctx.fillRect(this.width / 2 - 12, -this.height / 2 + 1, 10, 4);
    ctx.fillRect(this.width / 2 - 12, this.height / 2 - 5, 10, 4);
    // Rear wheels
    ctx.fillRect(-this.width / 2 + 2, -this.height / 2 + 1, 10, 4);
    ctx.fillRect(-this.width / 2 + 2, this.height / 2 - 5, 10, 4);

    ctx.restore();
  }

  // Get bounding box for collision detection
  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  // Get the four corners of the car (rotated)
  getCorners(): { x: number; y: number }[] {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const hw = this.width / 2;
    const hh = this.height / 2;

    return [
      { x: this.x + cos * hw - sin * hh, y: this.y + sin * hw + cos * hh }, // Front-right
      { x: this.x + cos * hw + sin * hh, y: this.y + sin * hw - cos * hh }, // Front-left
      { x: this.x - cos * hw + sin * hh, y: this.y - sin * hw - cos * hh }, // Back-left
      { x: this.x - cos * hw - sin * hh, y: this.y - sin * hw + cos * hh }, // Back-right
    ];
  }

  // Check collision with another car using circle approximation (faster)
  checkCollision(other: Car): boolean {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDist = ((this.width + other.width) / 2) * 0.6; // Tighter collision for smaller sprites
    return distance < minDist;
  }

  // Apply collision response between two cars
  resolveCollision(other: Car): void {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    // Normalize collision vector
    const nx = dx / distance;
    const ny = dy / distance;

    // Calculate overlap
    const minDist = ((this.width + other.width) / 2) * 0.6;
    const overlap = minDist - distance;

    if (overlap <= 0) return;

    // Determine collision type based on relative angle
    // Get the angle of collision relative to this car's facing direction
    const collisionAngle = Math.atan2(ny, nx);
    let relativeAngle = collisionAngle - this.rotation;

    // Normalize to [-PI, PI]
    while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
    while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

    // Determine if hitting front, back, or side
    const absAngle = Math.abs(relativeAngle);
    const isHittingFront = absAngle < Math.PI / 4; // Front 90 degrees
    const isHittingBack = absAngle > (Math.PI * 3) / 4; // Back 90 degrees

    // Calculate push strength based on speed difference
    const thisSpeed = Math.abs(this.speed);
    const otherSpeed = Math.abs(other.speed);
    const speedDiff = thisSpeed - otherSpeed;
    const pushStrength = Math.max(0.5, Math.min(2, 1 + speedDiff / 100));

    // Separate the cars - use equal force for fair collision response
    const separationForce = overlap * 0.6;
    this.x -= nx * separationForce * 0.5;
    this.y -= ny * separationForce * 0.5;
    other.x += nx * separationForce * 0.5;
    other.y += ny * separationForce * 0.5;

    // Apply push based on collision type
    if (isHittingFront && thisSpeed > otherSpeed) {
      // This car is hitting the back of other car - push it forward
      const otherForward = {
        x: Math.cos(other.rotation),
        y: Math.sin(other.rotation),
      };
      const pushAmount = speedDiff * 0.3 * pushStrength;
      other.applyPush(otherForward.x * pushAmount, otherForward.y * pushAmount);
      // Slow down this car slightly
      this.speed *= 0.9;
    } else if (isHittingBack && otherSpeed > thisSpeed) {
      // Other car is hitting this car's back - get pushed forward
      const thisForward = {
        x: Math.cos(this.rotation),
        y: Math.sin(this.rotation),
      };
      const pushAmount = (otherSpeed - thisSpeed) * 0.3 * pushStrength;
      this.applyPush(thisForward.x * pushAmount, thisForward.y * pushAmount);
    } else {
      // Side collision - push sideways with equal and opposite force
      const sideForce = 20 * pushStrength;
      other.applyPush(nx * sideForce, ny * sideForce);
      this.applyPush(-nx * sideForce, -ny * sideForce);

      // Both cars slow down on side collision
      this.speed *= 0.95;
      other.speed *= 0.95;
    }
  }

  // Apply an external push force
  applyPush(fx: number, fy: number): void {
    this.x += fx * 0.016; // Approximate one frame
    this.y += fy * 0.016;

    // Also affect speed slightly in the direction of push
    const pushMagnitude = Math.sqrt(fx * fx + fy * fy);
    const pushAngle = Math.atan2(fy, fx);

    // If push is aligned with car's direction, add to speed
    let angleDiff = pushAngle - this.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) < Math.PI / 2) {
      this.speed += pushMagnitude * Math.cos(angleDiff) * 0.5;
    }
  }
}
