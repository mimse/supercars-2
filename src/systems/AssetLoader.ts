/**
 * AssetLoader - Manages game assets (sprites, sounds, etc.)
 * Uses generated sprites from SpriteGenerator
 */

import { SpriteGenerator, GeneratedSprites, CAR_COLORS } from '../utils/SpriteGenerator';

export interface GameAssets {
  sprites: GeneratedSprites;
  loaded: boolean;
}

export class AssetLoader {
  private assets: GameAssets | null = null;
  private loadPromise: Promise<GameAssets> | null = null;

  /**
   * Load/generate all game assets
   * @param onProgress - Optional progress callback (0-1)
   */
  async loadAll(onProgress?: (progress: number) => void): Promise<GameAssets> {
    // Return cached assets if already loaded
    if (this.assets) {
      onProgress?.(1);
      return this.assets;
    }

    // Return existing promise if load is in progress
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.doLoad(onProgress);
    return this.loadPromise;
  }

  private async doLoad(onProgress?: (progress: number) => void): Promise<GameAssets> {
    onProgress?.(0);

    // Simulate async loading with progress updates
    // In reality, sprite generation is synchronous but we want to show progress
    await this.delay(50);
    onProgress?.(0.1);

    // Generate car sprites (heaviest operation)
    const cars = SpriteGenerator.generateCarSpriteSheet();
    await this.delay(50);
    onProgress?.(0.4);

    // Generate barrier tile
    const barrier = SpriteGenerator.generateBarrierTile();
    await this.delay(30);
    onProgress?.(0.5);

    // Generate grass tile
    const grass = SpriteGenerator.generateGrassTile();
    await this.delay(30);
    onProgress?.(0.6);

    // Generate finish line
    const finishLine = SpriteGenerator.generateFinishLine();
    await this.delay(20);
    onProgress?.(0.7);

    // Generate rocks
    const rocks = [
      SpriteGenerator.generateRock(0),
      SpriteGenerator.generateRock(1),
    ];
    await this.delay(30);
    onProgress?.(0.85);

    // Generate bushes
    const bushes = [
      SpriteGenerator.generateBush(0),
      SpriteGenerator.generateBush(1),
    ];
    await this.delay(30);
    onProgress?.(1);

    this.assets = {
      sprites: {
        cars,
        barrier,
        grass,
        finishLine,
        rocks,
        bushes,
      },
      loaded: true,
    };

    return this.assets;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get loaded assets (throws if not loaded)
   */
  getAssets(): GameAssets {
    if (!this.assets) {
      throw new Error('Assets not loaded. Call loadAll() first.');
    }
    return this.assets;
  }

  /**
   * Check if assets are loaded
   */
  isLoaded(): boolean {
    return this.assets !== null && this.assets.loaded;
  }

  /**
   * Get car color info by index
   */
  static getCarColor(index: number): typeof CAR_COLORS[0] {
    return CAR_COLORS[index % CAR_COLORS.length];
  }

  /**
   * Get total number of car colors available
   */
  static getCarColorCount(): number {
    return CAR_COLORS.length;
  }
}

// Export singleton instance for convenience
export const assetLoader = new AssetLoader();
