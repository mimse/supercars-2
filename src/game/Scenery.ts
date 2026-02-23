/**
 * Scenery - Manages decorative elements around the track
 * Includes rocks, bushes, and other environmental details
 */

import { Track } from "./Track";

interface SceneryItem {
  x: number;
  y: number;
  sprite: HTMLCanvasElement;
  width: number;
  height: number;
}

export class Scenery {
  private items: SceneryItem[] = [];

  /**
   * Generate scenery items around the track - 1.5x scale
   */
  generateScenery(
    track: Track,
    rockSprites: HTMLCanvasElement[],
    bushSprites: HTMLCanvasElement[]
  ): void {
    this.items = [];
    
    const gameHeight = track.getGameHeight();
    const allSprites = [...rockSprites, ...bushSprites];

    // Try to place scenery items - 1.5x scale
    const maxAttempts = 225;  // 1.5x (was 300 at 2x)
    const targetItems = 60;   // 1.5x (was 80 at 2x)

    for (let attempts = 0; attempts < maxAttempts && this.items.length < targetItems; attempts++) {
      const x = 30 + Math.random() * 1140;  // 1.5x (was 40 + 1520)
      const y = 30 + Math.random() * (gameHeight - 60);  // 1.5x (was 40 + -80)

      // Skip if on track
      if (track.isOnTrack(x, y)) continue;

      // Skip if too close to track (leave room for barriers and visibility) - 1.5x scale
      const distToTrack = track.distanceToTrack(x, y);
      if (distToTrack < 38) continue;  // 1.5x (was 50 at 2x)

      // Skip if too close to existing scenery - 1.5x scale
      let tooClose = false;
      for (const item of this.items) {
        const dist = Math.sqrt((x - item.x) ** 2 + (y - item.y) ** 2);
        if (dist < 45) {  // 1.5x (was 60 at 2x)
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      // Choose random sprite
      const sprite = allSprites[Math.floor(Math.random() * allSprites.length)];

      this.items.push({
        x,
        y,
        sprite,
        width: sprite.width,
        height: sprite.height,
      });
    }

    // Sort by Y position for proper layering (items further back rendered first)
    this.items.sort((a, b) => a.y - b.y);
  }

  /**
   * Render all scenery items
   */
  render(ctx: CanvasRenderingContext2D): void {
    for (const item of this.items) {
      ctx.drawImage(
        item.sprite,
        item.x - item.width / 2,
        item.y - item.height / 2
      );
    }
  }

  /**
   * Clear all scenery
   */
  clear(): void {
    this.items = [];
  }

  /**
   * Get number of scenery items
   */
  getItemCount(): number {
    return this.items.length;
  }
}
