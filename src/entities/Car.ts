export class Car {
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

  // Car dimensions
  readonly width: number = 40;
  readonly height: number = 20;

  // State
  protected isOffTrack: boolean = false;

  constructor(x: number, y: number, rotation: number = -Math.PI / 2) {
    this.x = x;
    this.y = y;
    this.rotation = rotation; // Default facing up
  }

  accelerate(dt: number): void {
    const accel = this.isOffTrack ? this.acceleration * 0.5 : this.acceleration;
    this.speed = Math.min(this.speed + accel * dt, this.maxSpeed);
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
    const currentFriction = this.isOffTrack
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
    this.isOffTrack = false;

    // Keep car in bounds (screen wrap protection)
    this.x = Math.max(20, Math.min(780, this.x));
    this.y = Math.max(20, Math.min(580, this.y));
  }

  offTrackPenalty(): void {
    this.isOffTrack = true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Move to car position and rotate
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Draw car body
    ctx.fillStyle = "#e63946"; // Red car
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Draw car front (nose)
    ctx.fillStyle = "#dc2f3c";
    ctx.fillRect(this.width / 2 - 8, -this.height / 2 + 2, 8, this.height - 4);

    // Draw windshield
    ctx.fillStyle = "#a8dadc";
    ctx.fillRect(this.width / 2 - 18, -this.height / 2 + 4, 8, this.height - 8);

    // Draw wheels
    ctx.fillStyle = "#1d3557";
    // Front wheels
    ctx.fillRect(this.width / 2 - 12, -this.height / 2 - 3, 10, 4);
    ctx.fillRect(this.width / 2 - 12, this.height / 2 - 1, 10, 4);
    // Rear wheels
    ctx.fillRect(-this.width / 2 + 2, -this.height / 2 - 3, 10, 4);
    ctx.fillRect(-this.width / 2 + 2, this.height / 2 - 1, 10, 4);

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
}
