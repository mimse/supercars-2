/**
 * Camera - Handles viewport scrolling and parallax effects
 * Follows the player car with smooth interpolation and screen bounds
 */

export interface CameraBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ParallaxLayer {
  canvas: HTMLCanvasElement;
  speedX: number;  // 0 = fixed, 1 = moves with camera, 0.5 = half speed (background)
  speedY: number;
  offsetX: number;
  offsetY: number;
}

export class Camera {
  // Camera position (top-left of viewport in world coordinates)
  x: number = 0;
  y: number = 0;
  
  // Viewport size (screen dimensions)
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  
  // World bounds
  private worldWidth: number;
  private worldHeight: number;
  
  // Target position for smooth follow
  private targetX: number = 0;
  private targetY: number = 0;
  
  // Smoothing factor (0-1, higher = faster response)
  private smoothing: number = 0.08;
  
  // Look-ahead distance based on velocity
  private lookAheadX: number = 0;
  private lookAheadY: number = 0;
  private lookAheadFactor: number = 0.4;  // How much to look ahead
  private lookAheadSmoothing: number = 0.05;  // How fast look-ahead responds
  
  // Parallax layers
  private parallaxLayers: ParallaxLayer[] = [];
  
  // Dead zone - camera won't move if target is within this area of screen center
  private deadZoneX: number = 50;
  private deadZoneY: number = 50;

  constructor(
    viewportWidth: number,
    viewportHeight: number,
    worldWidth: number,
    worldHeight: number
  ) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    
    // Center camera initially
    this.x = (worldWidth - viewportWidth) / 2;
    this.y = (worldHeight - viewportHeight) / 2;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  /**
   * Update world dimensions (if track changes)
   */
  setWorldSize(width: number, height: number): void {
    this.worldWidth = width;
    this.worldHeight = height;
  }

  /**
   * Set smoothing factor (0-1)
   */
  setSmoothing(value: number): void {
    this.smoothing = Math.max(0.01, Math.min(1, value));
  }

  /**
   * Set look-ahead factor
   */
  setLookAhead(factor: number): void {
    this.lookAheadFactor = factor;
  }

  /**
   * Add a parallax background layer
   */
  addParallaxLayer(
    canvas: HTMLCanvasElement,
    speedX: number = 0.5,
    speedY: number = 0.5
  ): void {
    this.parallaxLayers.push({
      canvas,
      speedX,
      speedY,
      offsetX: 0,
      offsetY: 0,
    });
  }

  /**
   * Clear all parallax layers
   */
  clearParallaxLayers(): void {
    this.parallaxLayers = [];
  }

  /**
   * Follow a target position (usually the player car)
   * @param targetX - Target X position in world coordinates
   * @param targetY - Target Y position in world coordinates
   * @param velocityX - Target's X velocity (for look-ahead)
   * @param velocityY - Target's Y velocity (for look-ahead)
   * @param dt - Delta time in seconds
   */
  follow(
    targetX: number,
    targetY: number,
    velocityX: number = 0,
    velocityY: number = 0,
    dt: number = 1/60
  ): void {
    // Calculate desired camera center position
    const desiredCenterX = targetX;
    const desiredCenterY = targetY;
    
    // Update look-ahead based on velocity
    const targetLookAheadX = velocityX * this.lookAheadFactor;
    const targetLookAheadY = velocityY * this.lookAheadFactor;
    
    this.lookAheadX += (targetLookAheadX - this.lookAheadX) * this.lookAheadSmoothing * (dt * 60);
    this.lookAheadY += (targetLookAheadY - this.lookAheadY) * this.lookAheadSmoothing * (dt * 60);
    
    // Calculate target camera position (center target in viewport with look-ahead)
    this.targetX = desiredCenterX + this.lookAheadX - this.viewportWidth / 2;
    this.targetY = desiredCenterY + this.lookAheadY - this.viewportHeight / 2;
    
    // Clamp to world bounds
    this.targetX = this.clampX(this.targetX);
    this.targetY = this.clampY(this.targetY);
    
    // Apply dead zone - only move if outside dead zone
    const currentCenterX = this.x + this.viewportWidth / 2;
    const currentCenterY = this.y + this.viewportHeight / 2;
    const dx = (desiredCenterX + this.lookAheadX) - currentCenterX;
    const dy = (desiredCenterY + this.lookAheadY) - currentCenterY;
    
    // Smooth interpolation toward target
    const smoothFactor = this.smoothing * (dt * 60);
    
    if (Math.abs(dx) > this.deadZoneX) {
      this.x += (this.targetX - this.x) * smoothFactor;
    }
    if (Math.abs(dy) > this.deadZoneY) {
      this.y += (this.targetY - this.y) * smoothFactor;
    }
    
    // Final bounds check
    this.x = this.clampX(this.x);
    this.y = this.clampY(this.y);
  }

  /**
   * Immediately center on a position (no smoothing)
   */
  centerOn(worldX: number, worldY: number): void {
    this.x = this.clampX(worldX - this.viewportWidth / 2);
    this.y = this.clampY(worldY - this.viewportHeight / 2);
    this.targetX = this.x;
    this.targetY = this.y;
    this.lookAheadX = 0;
    this.lookAheadY = 0;
  }

  /**
   * Clamp X position to world bounds
   */
  private clampX(x: number): number {
    const maxX = Math.max(0, this.worldWidth - this.viewportWidth);
    return Math.max(0, Math.min(maxX, x));
  }

  /**
   * Clamp Y position to world bounds
   */
  private clampY(y: number): number {
    const maxY = Math.max(0, this.worldHeight - this.viewportHeight);
    return Math.max(0, Math.min(maxY, y));
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.x,
      y: worldY - this.y,
    };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.x,
      y: screenY + this.y,
    };
  }

  /**
   * Check if a world rectangle is visible in the viewport
   */
  isVisible(
    worldX: number,
    worldY: number,
    width: number,
    height: number,
    padding: number = 0
  ): boolean {
    return (
      worldX + width + padding > this.x &&
      worldX - padding < this.x + this.viewportWidth &&
      worldY + height + padding > this.y &&
      worldY - padding < this.y + this.viewportHeight
    );
  }

  /**
   * Get visible world bounds (for culling)
   */
  getVisibleBounds(padding: number = 0): CameraBounds {
    return {
      minX: this.x - padding,
      minY: this.y - padding,
      maxX: this.x + this.viewportWidth + padding,
      maxY: this.y + this.viewportHeight + padding,
    };
  }

  /**
   * Apply camera transform to context (call before rendering world objects)
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.translate(-Math.round(this.x), -Math.round(this.y));
  }

  /**
   * Reset camera transform (call after rendering world objects)
   */
  resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.translate(Math.round(this.x), Math.round(this.y));
  }

  /**
   * Render parallax background layers
   */
  renderParallaxLayers(ctx: CanvasRenderingContext2D): void {
    for (const layer of this.parallaxLayers) {
      const parallaxX = this.x * layer.speedX + layer.offsetX;
      const parallaxY = this.y * layer.speedY + layer.offsetY;
      
      // Tile the layer across the viewport
      const tileWidth = layer.canvas.width;
      const tileHeight = layer.canvas.height;
      
      // Calculate starting tile position
      const startX = -(parallaxX % tileWidth);
      const startY = -(parallaxY % tileHeight);
      
      // Handle negative modulo
      const adjustedStartX = startX > 0 ? startX - tileWidth : startX;
      const adjustedStartY = startY > 0 ? startY - tileHeight : startY;
      
      // Draw tiles to cover viewport
      for (let y = adjustedStartY; y < this.viewportHeight; y += tileHeight) {
        for (let x = adjustedStartX; x < this.viewportWidth; x += tileWidth) {
          ctx.drawImage(layer.canvas, x, y);
        }
      }
    }
  }

  /**
   * Get camera bounds for debugging
   */
  getBounds(): CameraBounds {
    return {
      minX: this.x,
      minY: this.y,
      maxX: this.x + this.viewportWidth,
      maxY: this.y + this.viewportHeight,
    };
  }

  /**
   * Get world dimensions
   */
  getWorldSize(): { width: number; height: number } {
    return {
      width: this.worldWidth,
      height: this.worldHeight,
    };
  }
}
