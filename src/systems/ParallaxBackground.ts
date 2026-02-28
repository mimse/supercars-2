/**
 * ParallaxBackground - Generates multi-layer parallax backgrounds
 * Creates depth effect with distant mountains, mid-ground hills, etc.
 */

export interface ParallaxLayerConfig {
  canvas: HTMLCanvasElement;
  speed: number;  // 0 = static, 1 = moves with camera
}

export class ParallaxBackground {
  /**
   * Generate a complete parallax background set for the racing game
   * Returns layers from back (slowest) to front (fastest)
   */
  static generateRacingBackground(viewportWidth: number, viewportHeight: number): ParallaxLayerConfig[] {
    const layers: ParallaxLayerConfig[] = [];

    // Layer 1: Sky gradient with clouds (very slow - 0.1)
    layers.push({
      canvas: ParallaxBackground.generateSkyLayer(viewportWidth, viewportHeight),
      speed: 0.1,
    });

    // Layer 2: Distant mountains (slow - 0.2)
    layers.push({
      canvas: ParallaxBackground.generateMountainLayer(viewportWidth * 2, viewportHeight, 'distant'),
      speed: 0.2,
    });

    // Layer 3: Mid-ground hills (medium - 0.4)
    layers.push({
      canvas: ParallaxBackground.generateMountainLayer(viewportWidth * 2, viewportHeight, 'mid'),
      speed: 0.4,
    });

    // Layer 4: Near treeline (faster - 0.6)
    layers.push({
      canvas: ParallaxBackground.generateTreelineLayer(viewportWidth * 2, viewportHeight),
      speed: 0.6,
    });

    return layers;
  }

  /**
   * Generate sky layer with gradient and clouds
   */
  static generateSkyLayer(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Sky gradient (Amiga-style limited palette)
    const skyColors = [
      '#000044',  // Top - dark blue
      '#000066',
      '#000088',
      '#0044aa',
      '#0066cc',
      '#0088dd',  // Horizon - lighter blue
    ];

    const bandHeight = Math.ceil(height / skyColors.length);
    for (let i = 0; i < skyColors.length; i++) {
      ctx.fillStyle = skyColors[i];
      ctx.fillRect(0, i * bandHeight, width, bandHeight + 1);
    }

    // Add pixelated clouds
    const cloudColor1 = '#6688aa';
    const cloudColor2 = '#88aacc';
    const cloudShadow = '#446688';
    const px = 4;  // Pixel size for chunky look

    // Generate several clouds
    const cloudPositions = [
      { x: width * 0.1, y: height * 0.2, size: 1.2 },
      { x: width * 0.4, y: height * 0.15, size: 0.8 },
      { x: width * 0.7, y: height * 0.25, size: 1.0 },
      { x: width * 0.85, y: height * 0.18, size: 0.6 },
    ];

    for (const cloud of cloudPositions) {
      ParallaxBackground.drawPixelCloud(ctx, cloud.x, cloud.y, cloud.size, px, cloudColor1, cloudColor2, cloudShadow);
    }

    return canvas;
  }

  /**
   * Draw a pixelated cloud
   */
  private static drawPixelCloud(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    scale: number, px: number,
    color1: string, color2: string, shadow: string
  ): void {
    // Cloud shape pattern (1 = color1, 2 = color2, 3 = shadow)
    const pattern = [
      '    111    ',
      '  1122211  ',
      ' 112222211 ',
      '11222222211',
      '12222222221',
      ' 3333333331',
      '  3333333  ',
    ];

    const baseX = Math.round(x);
    const baseY = Math.round(y);
    const pixelSize = Math.round(px * scale);

    for (let row = 0; row < pattern.length; row++) {
      for (let col = 0; col < pattern[row].length; col++) {
        const char = pattern[row][col];
        if (char === '1') ctx.fillStyle = color1;
        else if (char === '2') ctx.fillStyle = color2;
        else if (char === '3') ctx.fillStyle = shadow;
        else continue;

        ctx.fillRect(
          baseX + col * pixelSize,
          baseY + row * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }
  }

  /**
   * Generate mountain silhouette layer
   */
  static generateMountainLayer(
    width: number,
    height: number,
    type: 'distant' | 'mid'
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Colors based on distance
    const colors = type === 'distant'
      ? { main: '#223344', highlight: '#334455', shadow: '#112233' }
      : { main: '#2a3a2a', highlight: '#3a4a3a', shadow: '#1a2a1a' };

    // Generate mountain peaks
    const peakCount = type === 'distant' ? 5 : 8;
    const baseY = type === 'distant' ? height * 0.7 : height * 0.75;
    const maxPeakHeight = type === 'distant' ? height * 0.35 : height * 0.25;
    const px = type === 'distant' ? 8 : 4;  // Larger pixels for distant mountains

    // Generate random but deterministic peaks
    const peaks: { x: number; height: number }[] = [];
    for (let i = 0; i < peakCount; i++) {
      const x = (width / peakCount) * i + (width / peakCount) * 0.5;
      const peakHeight = maxPeakHeight * (0.5 + Math.sin(i * 2.5) * 0.5);
      peaks.push({ x, height: peakHeight });
    }

    // Draw mountains as filled polygons
    ctx.fillStyle = colors.main;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, baseY);

    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      
      // Rising edge to peak
      ctx.lineTo(peak.x, baseY - peak.height);
    }

    ctx.lineTo(width, baseY);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Add pixelated highlights on left slopes
    ctx.fillStyle = colors.highlight;
    for (const peak of peaks) {
      const startY = baseY - peak.height;
      for (let y = startY; y < baseY; y += px * 2) {
        const progress = (y - startY) / (baseY - startY);
        const highlightWidth = peak.height * 0.3 * (1 - progress);
        ctx.fillRect(peak.x - highlightWidth, y, px, px);
      }
    }

    // Add pixelated shadows on right slopes
    ctx.fillStyle = colors.shadow;
    for (const peak of peaks) {
      const startY = baseY - peak.height;
      for (let y = startY; y < baseY; y += px * 2) {
        const progress = (y - startY) / (baseY - startY);
        const shadowWidth = peak.height * 0.2 * (1 - progress);
        ctx.fillRect(peak.x + shadowWidth * 0.5, y, px, px);
      }
    }

    return canvas;
  }

  /**
   * Generate treeline silhouette layer
   */
  static generateTreelineLayer(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const baseY = height * 0.8;
    const treeColor = '#1a2a1a';
    const highlightColor = '#2a3a2a';
    const px = 4;

    // Draw tree silhouettes
    const treeSpacing = 30;
    const treeCount = Math.ceil(width / treeSpacing);

    for (let i = 0; i < treeCount; i++) {
      const x = i * treeSpacing + (Math.sin(i * 3.7) * treeSpacing * 0.3);
      const treeHeight = 40 + Math.abs(Math.sin(i * 2.3)) * 30;
      const treeWidth = 20 + Math.abs(Math.sin(i * 1.7)) * 15;

      // Simple triangular tree shape (pixelated)
      ctx.fillStyle = treeColor;
      
      for (let row = 0; row < treeHeight / px; row++) {
        const rowY = baseY - (row + 1) * px;
        const rowWidth = treeWidth * (1 - row * px / treeHeight);
        const startX = x - rowWidth / 2;
        
        for (let col = 0; col < rowWidth / px; col++) {
          ctx.fillRect(startX + col * px, rowY, px, px);
        }
      }

      // Add highlight on left side
      ctx.fillStyle = highlightColor;
      for (let row = 0; row < treeHeight / px; row++) {
        const rowY = baseY - (row + 1) * px;
        const rowWidth = treeWidth * (1 - row * px / treeHeight);
        const startX = x - rowWidth / 2;
        
        if (row % 2 === 0) {
          ctx.fillRect(startX, rowY, px, px);
        }
      }
    }

    // Ground strip at bottom
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(0, baseY, width, height - baseY);

    return canvas;
  }

  /**
   * Generate a tiling grass pattern for the main game layer
   */
  static generateGrassBase(tileSize: number = 128): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const px = 2;
    const grassColors = ['#1a3a1a', '#2a4a2a', '#1a4a1a', '#2a3a2a'];

    // Base color
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(0, 0, tileSize, tileSize);

    // Add texture variation using deterministic pattern
    for (let y = 0; y < tileSize; y += px) {
      for (let x = 0; x < tileSize; x += px) {
        const noise = ((x * 7 + y * 13) % 17) / 17;
        if (noise < 0.3) {
          ctx.fillStyle = grassColors[0];
          ctx.fillRect(x, y, px, px);
        } else if (noise > 0.7) {
          ctx.fillStyle = grassColors[2];
          ctx.fillRect(x, y, px, px);
        }
      }
    }

    // Add grass blade details
    ctx.fillStyle = '#3a5a3a';
    for (let i = 0; i < 30; i++) {
      const x = ((i * 17 + 5) % tileSize);
      const y = ((i * 23 + 3) % tileSize);
      ctx.fillRect(x, y, px, px * 2);
    }

    return canvas;
  }
}
