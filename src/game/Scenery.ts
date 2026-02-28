/**
 * Scenery - Manages decorative elements around the track
 * Includes rocks, bushes, trees, and other environmental details
 * Updated to support larger worlds with camera scrolling
 */

import { Track } from "./Track";

interface SceneryItem {
  x: number;
  y: number;
  sprite: HTMLCanvasElement;
  width: number;
  height: number;
  type: 'rock' | 'bush' | 'tree' | 'tireStack';
}

export class Scenery {
  private items: SceneryItem[] = [];

  /**
   * Generate scenery items around the track
   * Scales item count based on world size
   */
  generateScenery(
    track: Track,
    rockSprites: HTMLCanvasElement[],
    bushSprites: HTMLCanvasElement[],
    treeSprites?: HTMLCanvasElement[],
    tireStackSprite?: HTMLCanvasElement
  ): void {
    this.items = [];
    
    const worldWidth = track.getWorldWidth();
    const worldHeight = track.getWorldHeight();
    
    // Scale item counts based on world size (relative to original 1200x825)
    const areaScale = (worldWidth * worldHeight) / (1200 * 825);

    // Place trees first (larger objects, need more space)
    if (treeSprites && treeSprites.length > 0) {
      const treeCount = Math.floor(25 * areaScale);
      this.placeItems(track, worldWidth, worldHeight, treeSprites, 'tree', treeCount, 80, 100);
    }

    // Place tire stacks near track edges (racing decoration)
    if (tireStackSprite) {
      const tireCount = Math.floor(15 * areaScale);
      this.placeTireStacks(track, worldWidth, worldHeight, tireStackSprite, tireCount);
    }

    // Place rocks and bushes (smaller items, can be denser)
    const smallSprites = [...rockSprites, ...bushSprites];
    const smallCount = Math.floor(80 * areaScale);
    this.placeItems(track, worldWidth, worldHeight, smallSprites, 'bush', smallCount, 40, 50);

    // Sort by Y position for proper layering (items further back rendered first)
    this.items.sort((a, b) => a.y - b.y);
  }

  /**
   * Place items of a specific type across the world
   */
  private placeItems(
    track: Track,
    worldWidth: number,
    worldHeight: number,
    sprites: HTMLCanvasElement[],
    type: SceneryItem['type'],
    targetCount: number,
    minDistToTrack: number,
    minDistBetween: number
  ): void {
    const maxAttempts = targetCount * 5;
    const margin = 50;

    for (let attempts = 0; attempts < maxAttempts && this.getItemCountByType(type) < targetCount; attempts++) {
      const x = margin + Math.random() * (worldWidth - margin * 2);
      const y = margin + Math.random() * (worldHeight - margin * 2);

      // Skip if on track
      if (track.isOnTrack(x, y)) continue;

      // Skip if too close to track
      const distToTrack = track.distanceToTrack(x, y);
      if (distToTrack < minDistToTrack) continue;

      // Skip if too close to existing scenery
      let tooClose = false;
      for (const item of this.items) {
        const dist = Math.sqrt((x - item.x) ** 2 + (y - item.y) ** 2);
        // Trees need more space from each other
        const requiredDist = (item.type === 'tree' || type === 'tree') ? minDistBetween * 1.5 : minDistBetween;
        if (dist < requiredDist) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      // Choose random sprite
      const sprite = sprites[Math.floor(Math.random() * sprites.length)];

      this.items.push({
        x,
        y,
        sprite,
        width: sprite.width,
        height: sprite.height,
        type: type === 'bush' && sprites.indexOf(sprite) < 2 ? 'rock' : type,
      });
    }
  }

  /**
   * Place tire stacks strategically near track edges
   */
  private placeTireStacks(
    track: Track,
    worldWidth: number,
    worldHeight: number,
    tireStackSprite: HTMLCanvasElement,
    targetCount: number
  ): void {
    const maxAttempts = targetCount * 8;
    const margin = 80;

    for (let attempts = 0; attempts < maxAttempts && this.getItemCountByType('tireStack') < targetCount; attempts++) {
      const x = margin + Math.random() * (worldWidth - margin * 2);
      const y = margin + Math.random() * (worldHeight - margin * 2);

      // Skip if on track
      if (track.isOnTrack(x, y)) continue;

      // We want tire stacks close to the track but not on it
      const distToTrack = track.distanceToTrack(x, y);
      if (distToTrack < 30 || distToTrack > 70) continue;  // Sweet spot near track

      // Skip if too close to existing scenery
      let tooClose = false;
      for (const item of this.items) {
        const dist = Math.sqrt((x - item.x) ** 2 + (y - item.y) ** 2);
        if (dist < 60) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      this.items.push({
        x,
        y,
        sprite: tireStackSprite,
        width: tireStackSprite.width,
        height: tireStackSprite.height,
        type: 'tireStack',
      });
    }
  }

  /**
   * Get count of items by type
   */
  private getItemCountByType(type: SceneryItem['type']): number {
    return this.items.filter(item => item.type === type).length;
  }

  /**
   * Render all scenery items (with optional camera culling)
   */
  render(ctx: CanvasRenderingContext2D, cameraBounds?: { minX: number; minY: number; maxX: number; maxY: number }): void {
    for (const item of this.items) {
      // Culling: skip items outside camera view
      if (cameraBounds) {
        if (item.x + item.width < cameraBounds.minX ||
            item.x - item.width > cameraBounds.maxX ||
            item.y + item.height < cameraBounds.minY ||
            item.y - item.height > cameraBounds.maxY) {
          continue;
        }
      }
      
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
