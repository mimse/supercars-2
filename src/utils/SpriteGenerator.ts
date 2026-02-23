/**
 * SpriteGenerator - Generates pixel-art sprites programmatically
 * Creates authentic Amiga-style graphics for Supercars 2
 */

// Car colors matching original Supercars 2 palette
export const CAR_COLORS = [
  { main: '#DC2626', dark: '#991B1B', light: '#EF4444', name: 'Red' },        // 0: Player
  { main: '#2563EB', dark: '#1D4ED8', light: '#3B82F6', name: 'Blue' },       // 1
  { main: '#16A34A', dark: '#15803D', light: '#22C55E', name: 'Green' },      // 2
  { main: '#EAB308', dark: '#CA8A04', light: '#FACC15', name: 'Yellow' },     // 3
  { main: '#EA580C', dark: '#C2410C', light: '#F97316', name: 'Orange' },     // 4
  { main: '#DB2777', dark: '#BE185D', light: '#EC4899', name: 'Pink' },       // 5
  { main: '#06B6D4', dark: '#0891B2', light: '#22D3EE', name: 'Cyan' },       // 6
  { main: '#9333EA', dark: '#7C3AED', light: '#A855F7', name: 'Purple' },     // 7
  { main: '#E5E5E5', dark: '#A3A3A3', light: '#FFFFFF', name: 'White' },      // 8
  { main: '#92400E', dark: '#78350F', light: '#B45309', name: 'Brown' },      // 9
];

export class SpriteGenerator {
  static readonly FRAME_SIZE = 48;  // 2x scale (was 24)
  static readonly FRAMES_PER_ROTATION = 16;

  /**
   * Generate complete car sprite sheet (10 colors x 16 rotations)
   * Returns a canvas that can be used directly as sprite source
   */
  static generateCarSpriteSheet(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const frameSize = this.FRAME_SIZE;
    const framesPerRow = this.FRAMES_PER_ROTATION;
    
    canvas.width = frameSize * framesPerRow;  // 768px (2x)
    canvas.height = frameSize * CAR_COLORS.length;  // 480px (2x)
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Generate each car color
    for (let colorIndex = 0; colorIndex < CAR_COLORS.length; colorIndex++) {
      const color = CAR_COLORS[colorIndex];
      
      // Generate each rotation frame
      for (let frame = 0; frame < framesPerRow; frame++) {
        const rotation = (frame / framesPerRow) * Math.PI * 2;
        const x = frame * frameSize;
        const y = colorIndex * frameSize;
        
        this.drawCarFrame(ctx, x, y, frameSize, rotation, color);
      }
    }

    return canvas;
  }

  /**
   * Draw a single car frame at specified position and rotation
   */
  private static drawCarFrame(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    rotation: number,
    color: { main: string; dark: string; light: string }
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    // Car dimensions (relative to center) - 2x scale
    const carLength = 20;  // Half-length (was 10)
    const carWidth = 10;   // Half-width (was 5)

    // Draw car body (main rectangle)
    ctx.fillStyle = color.main;
    ctx.fillRect(-carLength, -carWidth, carLength * 2, carWidth * 2);

    // Draw car nose (front, darker)
    ctx.fillStyle = color.dark;
    ctx.fillRect(carLength - 6, -carWidth + 2, 6, carWidth * 2 - 4);

    // Draw car rear (darker)
    ctx.fillStyle = color.dark;
    ctx.fillRect(-carLength, -carWidth + 2, 4, carWidth * 2 - 4);

    // Draw windshield (front window area)
    ctx.fillStyle = '#1e3a5f';  // Dark blue tint
    ctx.fillRect(carLength - 14, -carWidth + 4, 6, carWidth * 2 - 8);

    // Draw cockpit highlight
    ctx.fillStyle = '#a8dadc';  // Light blue
    ctx.fillRect(carLength - 12, -carWidth + 6, 2, carWidth * 2 - 12);

    // Draw wheels (4 corners) - 2x scale
    ctx.fillStyle = '#1f2937';  // Dark gray
    // Front wheels
    ctx.fillRect(carLength - 10, -carWidth - 4, 8, 4);
    ctx.fillRect(carLength - 10, carWidth, 8, 4);
    // Rear wheels
    ctx.fillRect(-carLength + 2, -carWidth - 4, 8, 4);
    ctx.fillRect(-carLength + 2, carWidth, 8, 4);

    // Add highlight on top of car body
    ctx.fillStyle = color.light;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(-carLength + 6, -carWidth + 2, carLength - 4, 4);
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  /**
   * Generate barrier tile (metallic checkered pattern) - 2x scale
   */
  static generateBarrierTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = 32;  // 2x (was 16)
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Base metallic gray
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, 0, size, size);

    // Checkered pattern
    const checkSize = 8;  // 2x (was 4)
    for (let y = 0; y < size; y += checkSize) {
      for (let x = 0; x < size; x += checkSize) {
        const isLight = ((x + y) / checkSize) % 2 === 0;
        ctx.fillStyle = isLight ? '#9ca3af' : '#4b5563';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // Add metallic highlight (top edge)
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(0, 0, size, 2);

    // Add shadow (bottom edge)
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, size - 2, size, 2);

    // Add rivets/bolts for industrial look - 2x
    ctx.fillStyle = '#374151';
    ctx.fillRect(4, 4, 4, 4);
    ctx.fillRect(size - 8, 4, 4, 4);
    ctx.fillRect(4, size - 8, 4, 4);
    ctx.fillRect(size - 8, size - 8, 4, 4);

    // Rivet highlights
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(4, 4, 2, 2);
    ctx.fillRect(size - 8, 4, 2, 2);
    ctx.fillRect(4, size - 8, 2, 2);
    ctx.fillRect(size - 8, size - 8, 2, 2);

    return canvas;
  }

  /**
   * Generate grass texture tile - 2x scale
   */
  static generateGrassTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = 64;  // 2x (was 32)
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Base grass color
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, size, size);

    // Add grass texture with random darker/lighter patches
    const colors = ['#1d4a17', '#3d6a37', '#2d5a27', '#254d20'];
    
    for (let i = 0; i < 160; i++) {  // 2x more pixels
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * size);
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillRect(x, y, 2, 2);  // 2x pixel size
    }

    // Add some grass blade details
    ctx.fillStyle = '#3d6a37';
    for (let i = 0; i < 30; i++) {  // 2x more blades
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * size);
      ctx.fillRect(x, y, 2, 4);  // 2x size
    }

    return canvas;
  }

  /**
   * Generate rock sprite - 2x scale
   */
  static generateRock(variant: number = 0): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = variant === 0 ? 32 : 40;  // 2x (was 16/20)
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Rock shape varies by variant
    if (variant === 0) {
      // Small round rock - 2x
      ctx.fillStyle = '#6b7280';
      ctx.beginPath();
      ctx.ellipse(16, 18, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.ellipse(12, 14, 6, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Shadow
      ctx.fillStyle = '#4b5563';
      ctx.beginPath();
      ctx.ellipse(20, 22, 6, 4, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Larger angular rock - 2x
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.moveTo(6, 30);
      ctx.lineTo(2, 20);
      ctx.lineTo(10, 8);
      ctx.lineTo(24, 4);
      ctx.lineTo(34, 12);
      ctx.lineTo(36, 26);
      ctx.lineTo(28, 34);
      ctx.lineTo(12, 34);
      ctx.closePath();
      ctx.fill();

      // Highlight
      ctx.fillStyle = '#a8a29e';
      ctx.beginPath();
      ctx.moveTo(10, 20);
      ctx.lineTo(12, 10);
      ctx.lineTo(22, 8);
      ctx.lineTo(18, 18);
      ctx.closePath();
      ctx.fill();

      // Shadow
      ctx.fillStyle = '#57534e';
      ctx.beginPath();
      ctx.moveTo(20, 24);
      ctx.lineTo(32, 20);
      ctx.lineTo(30, 30);
      ctx.lineTo(20, 30);
      ctx.closePath();
      ctx.fill();
    }

    return canvas;
  }

  /**
   * Generate bush sprite - 2x scale
   */
  static generateBush(variant: number = 0): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = variant === 0 ? 32 : 40;  // 2x (was 16/20)
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const darkGreen = '#166534';
    const midGreen = '#15803d';
    const lightGreen = '#22c55e';

    if (variant === 0) {
      // Small round bush - 2x
      // Shadow/base
      ctx.fillStyle = darkGreen;
      ctx.beginPath();
      ctx.ellipse(16, 20, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main body
      ctx.fillStyle = midGreen;
      ctx.beginPath();
      ctx.ellipse(16, 16, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highlights
      ctx.fillStyle = lightGreen;
      ctx.fillRect(10, 12, 4, 4);
      ctx.fillRect(18, 10, 4, 4);
      ctx.fillRect(14, 16, 2, 2);
    } else {
      // Larger bush cluster - 2x
      // Shadow
      ctx.fillStyle = darkGreen;
      ctx.beginPath();
      ctx.ellipse(20, 28, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Left blob
      ctx.fillStyle = midGreen;
      ctx.beginPath();
      ctx.ellipse(12, 20, 10, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Right blob
      ctx.beginPath();
      ctx.ellipse(26, 22, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Top blob
      ctx.beginPath();
      ctx.ellipse(18, 12, 8, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highlights
      ctx.fillStyle = lightGreen;
      ctx.fillRect(8, 16, 4, 4);
      ctx.fillRect(16, 8, 4, 4);
      ctx.fillRect(24, 18, 4, 4);
      ctx.fillRect(12, 22, 2, 2);
      ctx.fillRect(28, 24, 2, 2);
    }

    return canvas;
  }

  /**
   * Generate finish line tile - 2x scale
   */
  static generateFinishLine(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = 32;  // 2x (was 16)
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Checkered pattern - 2x
    const checkSize = 16;  // 2x (was 8)
    for (let y = 0; y < size; y += checkSize) {
      for (let x = 0; x < size; x += checkSize) {
        const isWhite = ((x + y) / checkSize) % 2 === 0;
        ctx.fillStyle = isWhite ? '#ffffff' : '#000000';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    return canvas;
  }

  /**
   * Generate all sprites and return as a bundle
   */
  static generateAll(): GeneratedSprites {
    return {
      cars: this.generateCarSpriteSheet(),
      barrier: this.generateBarrierTile(),
      grass: this.generateGrassTile(),
      finishLine: this.generateFinishLine(),
      rocks: [this.generateRock(0), this.generateRock(1)],
      bushes: [this.generateBush(0), this.generateBush(1)],
    };
  }
}

export interface GeneratedSprites {
  cars: HTMLCanvasElement;
  barrier: HTMLCanvasElement;
  grass: HTMLCanvasElement;
  finishLine: HTMLCanvasElement;
  rocks: HTMLCanvasElement[];
  bushes: HTMLCanvasElement[];
}
