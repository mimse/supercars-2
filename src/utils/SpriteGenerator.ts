/**
 * SpriteGenerator - Generates pixel-art sprites programmatically
 * Creates authentic Amiga-style graphics for Supercars 2
 * 
 * Inspired by the original Amiga OCS/ECS color limitations and pixel art style.
 * Uses chunky pixels, color banding, and dithering typical of 16-32 color modes.
 */

// Car colors matching original Supercars 2 Amiga palette (12-bit RGB)
// Each color has: main body, dark shadow, light highlight, accent (for details)
export const CAR_COLORS = [
  { main: '#cc0000', dark: '#880000', light: '#ff4444', accent: '#ffaaaa', name: 'Red' },        // 0: Player
  { main: '#0044cc', dark: '#002288', light: '#4488ff', accent: '#aaccff', name: 'Blue' },       // 1
  { main: '#00aa00', dark: '#006600', light: '#44dd44', accent: '#aaffaa', name: 'Green' },      // 2
  { main: '#ccaa00', dark: '#886600', light: '#ffdd44', accent: '#ffeeaa', name: 'Yellow' },     // 3
  { main: '#cc4400', dark: '#882200', light: '#ff8844', accent: '#ffccaa', name: 'Orange' },     // 4
  { main: '#cc0088', dark: '#880044', light: '#ff44cc', accent: '#ffaaee', name: 'Pink' },       // 5
  { main: '#00aaaa', dark: '#006666', light: '#44dddd', accent: '#aaffff', name: 'Cyan' },       // 6
  { main: '#8800cc', dark: '#440088', light: '#bb44ff', accent: '#ddaaff', name: 'Purple' },     // 7
  { main: '#cccccc', dark: '#888888', light: '#ffffff', accent: '#ffffff', name: 'White' },      // 8
  { main: '#884400', dark: '#442200', light: '#bb6622', accent: '#ddaa88', name: 'Brown' },      // 9
];

export class SpriteGenerator {
  static readonly FRAME_SIZE = 48;  // 1.5x scale from original 32px
  static readonly FRAMES_PER_ROTATION = 16;
  
  // Amiga-style fixed colors
  static readonly WINDSHIELD_DARK = '#002244';
  static readonly WINDSHIELD_LIGHT = '#4488aa';
  static readonly WHEEL_COLOR = '#222222';
  static readonly WHEEL_HIGHLIGHT = '#444444';
  static readonly BLACK = '#000000';

  /**
   * Generate complete car sprite sheet (10 colors x 16 rotations)
   * Returns a canvas that can be used directly as sprite source
   */
  static generateCarSpriteSheet(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const frameSize = this.FRAME_SIZE;
    const framesPerRow = this.FRAMES_PER_ROTATION;
    
    canvas.width = frameSize * framesPerRow;  // 768px
    canvas.height = frameSize * CAR_COLORS.length;  // 480px
    
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
        
        this.drawAmigaCarFrame(ctx, x, y, frameSize, rotation, color);
      }
    }

    return canvas;
  }

  /**
   * Draw a single car frame in authentic Amiga pixel-art style
   * Features: chunky pixels, visible spoiler, detailed cockpit, proper wheel wells
   */
  private static drawAmigaCarFrame(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    rotation: number,
    color: { main: string; dark: string; light: string; accent: string }
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    // Pixel size for chunky Amiga look (2px chunks)
    const px = 2;
    
    // Car dimensions - sports car proportions
    const carLength = 22;  // Half-length
    const carWidth = 10;   // Half-width
    
    // === SHADOW (offset slightly) ===
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-carLength + 2, -carWidth + 2, carLength * 2, carWidth * 2 + 2);

    // === MAIN BODY ===
    ctx.fillStyle = color.main;
    ctx.fillRect(-carLength, -carWidth, carLength * 2, carWidth * 2);
    
    // === BODY SHADING (Amiga-style banding) ===
    // Top highlight strip
    ctx.fillStyle = color.light;
    ctx.fillRect(-carLength + 4*px, -carWidth, carLength*2 - 8*px, px);
    
    // Upper body highlight
    ctx.fillStyle = color.light;
    ctx.fillRect(-carLength + 2*px, -carWidth + px, carLength - 2*px, 2*px);
    
    // Bottom shadow strip  
    ctx.fillStyle = color.dark;
    ctx.fillRect(-carLength + 4*px, carWidth - px, carLength*2 - 8*px, px);
    
    // Lower body shadow
    ctx.fillStyle = color.dark;
    ctx.fillRect(-carLength + 2*px, carWidth - 3*px, carLength - 2*px, 2*px);

    // === FRONT NOSE (tapered) ===
    ctx.fillStyle = color.dark;
    // Nose tip
    ctx.fillRect(carLength - 2*px, -carWidth + 3*px, 2*px, carWidth*2 - 6*px);
    // Front grille area
    ctx.fillStyle = this.BLACK;
    ctx.fillRect(carLength - px, -carWidth + 4*px, px, carWidth*2 - 8*px);
    
    // Front bumper highlights
    ctx.fillStyle = color.accent;
    ctx.fillRect(carLength - 3*px, -carWidth + 2*px, px, px);
    ctx.fillRect(carLength - 3*px, carWidth - 3*px, px, px);

    // === REAR SPOILER ===
    ctx.fillStyle = color.dark;
    ctx.fillRect(-carLength - px, -carWidth + px, 2*px, carWidth*2 - 2*px);
    // Spoiler top edge highlight
    ctx.fillStyle = color.light;
    ctx.fillRect(-carLength - px, -carWidth + px, 2*px, px);
    // Spoiler shadow underneath
    ctx.fillStyle = this.BLACK;
    ctx.fillRect(-carLength, -carWidth + 2*px, px, carWidth*2 - 4*px);

    // === REAR LIGHTS ===
    ctx.fillStyle = '#cc0000';  // Red tail lights
    ctx.fillRect(-carLength + px, -carWidth + 2*px, px, 2*px);
    ctx.fillRect(-carLength + px, carWidth - 4*px, px, 2*px);

    // === COCKPIT/WINDSHIELD ===
    // Windshield base (dark)
    ctx.fillStyle = this.WINDSHIELD_DARK;
    ctx.fillRect(2*px, -carWidth + 3*px, 6*px, carWidth*2 - 6*px);
    
    // Windshield reflection (Amiga-style diagonal highlight)
    ctx.fillStyle = this.WINDSHIELD_LIGHT;
    ctx.fillRect(3*px, -carWidth + 3*px, px, 3*px);
    ctx.fillRect(4*px, -carWidth + 4*px, px, 2*px);
    ctx.fillRect(5*px, -carWidth + 5*px, px, px);
    
    // Cockpit opening
    ctx.fillStyle = this.BLACK;
    ctx.fillRect(4*px, -carWidth + 5*px, 2*px, carWidth*2 - 10*px);

    // === SIDE STRIPES (racing detail) ===
    ctx.fillStyle = color.accent;
    // Left side stripe
    ctx.fillRect(-carLength + 6*px, -carWidth + px, 8*px, px);
    // Right side stripe  
    ctx.fillRect(-carLength + 6*px, carWidth - 2*px, 8*px, px);

    // === WHEELS ===
    // Wheel wells (dark insets)
    ctx.fillStyle = this.BLACK;
    // Front left well
    ctx.fillRect(carLength - 7*px, -carWidth - px, 5*px, 2*px);
    // Front right well
    ctx.fillRect(carLength - 7*px, carWidth - px, 5*px, 2*px);
    // Rear left well
    ctx.fillRect(-carLength + 2*px, -carWidth - px, 5*px, 2*px);
    // Rear right well
    ctx.fillRect(-carLength + 2*px, carWidth - px, 5*px, 2*px);
    
    // Wheels (chunky tires)
    ctx.fillStyle = this.WHEEL_COLOR;
    // Front wheels
    ctx.fillRect(carLength - 6*px, -carWidth - 2*px, 4*px, 3*px);
    ctx.fillRect(carLength - 6*px, carWidth - px, 4*px, 3*px);
    // Rear wheels  
    ctx.fillRect(-carLength + 2*px, -carWidth - 2*px, 4*px, 3*px);
    ctx.fillRect(-carLength + 2*px, carWidth - px, 4*px, 3*px);
    
    // Wheel highlights (rubber shine)
    ctx.fillStyle = this.WHEEL_HIGHLIGHT;
    ctx.fillRect(carLength - 5*px, -carWidth - 2*px, 2*px, px);
    ctx.fillRect(carLength - 5*px, carWidth + px, 2*px, px);
    ctx.fillRect(-carLength + 3*px, -carWidth - 2*px, 2*px, px);
    ctx.fillRect(-carLength + 3*px, carWidth + px, 2*px, px);

    // === HOOD DETAILS ===
    // Hood vent/scoop
    ctx.fillStyle = this.BLACK;
    ctx.fillRect(carLength - 5*px, -2*px, 2*px, 4*px);
    // Hood highlight
    ctx.fillStyle = color.light;
    ctx.fillRect(carLength - 4*px, -px, px, 2*px);

    // === OUTLINE (1px black border for definition) ===
    ctx.strokeStyle = this.BLACK;
    ctx.lineWidth = 1;
    ctx.strokeRect(-carLength - px + 0.5, -carWidth - px + 0.5, carLength*2 + 2*px - 1, carWidth*2 + 2*px - 1);

    ctx.restore();
  }

  /**
   * Generate barrier tile - Amiga-style metallic with rivets
   */
  static generateBarrierTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const px = 2;  // Pixel size for chunky look
    
    // Amiga metallic gray palette
    const metalDark = '#444444';
    const metalMid = '#888888';
    const metalLight = '#aaaaaa';
    const metalHighlight = '#cccccc';
    const rivetDark = '#222222';
    const rivetLight = '#666666';

    // Base metal plate
    ctx.fillStyle = metalMid;
    ctx.fillRect(0, 0, size, size);

    // Top edge highlight (light source from top-left)
    ctx.fillStyle = metalHighlight;
    ctx.fillRect(0, 0, size, px);
    ctx.fillRect(0, 0, px, size);
    
    // Bottom/right edge shadow
    ctx.fillStyle = metalDark;
    ctx.fillRect(0, size - px, size, px);
    ctx.fillRect(size - px, 0, px, size);

    // Diagonal dithering pattern for metallic sheen (Amiga style)
    ctx.fillStyle = metalLight;
    for (let y = 0; y < size; y += 4) {
      for (let x = 0; x < size; x += 4) {
        if ((x + y) % 8 === 0) {
          ctx.fillRect(x + px, y + px, px, px);
        }
      }
    }

    // Cross-hatch pattern in center
    ctx.fillStyle = metalDark;
    for (let i = 4; i < size - 4; i += 8) {
      ctx.fillRect(i, size/2 - px/2, px, px);
      ctx.fillRect(size/2 - px/2, i, px, px);
    }

    // Corner rivets
    const rivetPositions = [
      [3*px, 3*px],
      [size - 4*px, 3*px],
      [3*px, size - 4*px],
      [size - 4*px, size - 4*px]
    ];
    
    for (const [rx, ry] of rivetPositions) {
      // Rivet base (dark)
      ctx.fillStyle = rivetDark;
      ctx.fillRect(rx, ry, 2*px, 2*px);
      // Rivet highlight
      ctx.fillStyle = rivetLight;
      ctx.fillRect(rx, ry, px, px);
    }

    // Warning stripe pattern (red/yellow diagonal)
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(0, size - 4*px, size, px);
    ctx.fillStyle = '#ccaa00';
    ctx.fillRect(0, size - 3*px, size, px);

    return canvas;
  }

  /**
   * Generate grass texture tile - Amiga-style with dithering
   */
  static generateGrassTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const px = 2;  // Pixel size
    
    // Amiga grass palette (limited colors)
    const grassDark = '#004400';
    const grassMid = '#006600';
    const grassLight = '#008800';
    const grassHighlight = '#00aa00';
    const dirtDark = '#442200';
    const dirtLight = '#664400';

    // Base grass color
    ctx.fillStyle = grassMid;
    ctx.fillRect(0, 0, size, size);

    // Ordered dithering pattern (Bayer matrix style - very Amiga)
    const ditherPattern = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ];

    // Apply dithered grass texture
    for (let y = 0; y < size; y += px) {
      for (let x = 0; x < size; x += px) {
        const dx = Math.floor((x / px) % 4);
        const dy = Math.floor((y / px) % 4);
        const threshold = ditherPattern[dy][dx];
        
        // Use seeded random based on position for consistency
        const noise = ((x * 7 + y * 13) % 16);
        
        if (noise < threshold - 4) {
          ctx.fillStyle = grassDark;
          ctx.fillRect(x, y, px, px);
        } else if (noise > threshold + 8) {
          ctx.fillStyle = grassLight;
          ctx.fillRect(x, y, px, px);
        }
      }
    }

    // Add grass blade details (vertical strokes)
    ctx.fillStyle = grassHighlight;
    for (let i = 0; i < 20; i++) {
      const x = ((i * 17) % (size - px));
      const y = ((i * 23) % (size - 4*px));
      ctx.fillRect(x, y, px, 3*px);
    }

    // Add occasional dirt patches
    ctx.fillStyle = dirtDark;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 31 + 7) % (size - 2*px));
      const y = ((i * 19 + 11) % (size - 2*px));
      ctx.fillRect(x, y, 2*px, px);
    }
    ctx.fillStyle = dirtLight;
    for (let i = 0; i < 3; i++) {
      const x = ((i * 29 + 3) % (size - px));
      const y = ((i * 17 + 5) % (size - px));
      ctx.fillRect(x, y, px, px);
    }

    return canvas;
  }

  /**
   * Generate rock sprite - Amiga-style with chunky pixels and defined shading
   */
  static generateRock(variant: number = 0): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = variant === 0 ? 32 : 48;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const px = 2;  // Pixel size
    
    // Amiga rock palette
    const rockDark = '#444444';
    const rockMid = '#666666';
    const rockLight = '#888888';
    const rockHighlight = '#aaaaaa';
    const shadow = '#222222';

    if (variant === 0) {
      // Small boulder - chunky pixel art style
      const cx = size / 2;
      const cy = size / 2 + px;
      
      // Shadow underneath
      ctx.fillStyle = shadow;
      this.drawPixelEllipse(ctx, cx + px, cy + 2*px, 7*px, 5*px, px);
      
      // Main rock body
      ctx.fillStyle = rockMid;
      this.drawPixelEllipse(ctx, cx, cy, 6*px, 5*px, px);
      
      // Top highlight
      ctx.fillStyle = rockLight;
      this.drawPixelEllipse(ctx, cx - px, cy - px, 4*px, 3*px, px);
      
      // Bright spot
      ctx.fillStyle = rockHighlight;
      ctx.fillRect(cx - 2*px, cy - 2*px, 2*px, 2*px);
      
      // Dark crevice detail
      ctx.fillStyle = rockDark;
      ctx.fillRect(cx + px, cy + px, 2*px, px);

    } else {
      // Large angular rock
      const cx = size / 2;
      const cy = size / 2;
      
      // Shadow
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.moveTo(cx - 8*px + 2*px, cy + 6*px + 2*px);
      ctx.lineTo(cx - 10*px + 2*px, cy - 2*px + 2*px);
      ctx.lineTo(cx - 4*px + 2*px, cy - 8*px + 2*px);
      ctx.lineTo(cx + 6*px + 2*px, cy - 6*px + 2*px);
      ctx.lineTo(cx + 8*px + 2*px, cy + 2*px + 2*px);
      ctx.lineTo(cx + 4*px + 2*px, cy + 8*px + 2*px);
      ctx.closePath();
      ctx.fill();
      
      // Main body
      ctx.fillStyle = rockMid;
      ctx.beginPath();
      ctx.moveTo(cx - 8*px, cy + 6*px);
      ctx.lineTo(cx - 10*px, cy - 2*px);
      ctx.lineTo(cx - 4*px, cy - 8*px);
      ctx.lineTo(cx + 6*px, cy - 6*px);
      ctx.lineTo(cx + 8*px, cy + 2*px);
      ctx.lineTo(cx + 4*px, cy + 8*px);
      ctx.closePath();
      ctx.fill();
      
      // Light face (top-left facet)
      ctx.fillStyle = rockLight;
      ctx.beginPath();
      ctx.moveTo(cx - 8*px, cy);
      ctx.lineTo(cx - 4*px, cy - 8*px);
      ctx.lineTo(cx + 2*px, cy - 4*px);
      ctx.lineTo(cx - 2*px, cy + 2*px);
      ctx.closePath();
      ctx.fill();
      
      // Highlight
      ctx.fillStyle = rockHighlight;
      ctx.fillRect(cx - 4*px, cy - 6*px, 2*px, 2*px);
      ctx.fillRect(cx - 6*px, cy - 4*px, 2*px, 2*px);
      
      // Dark face (bottom-right)
      ctx.fillStyle = rockDark;
      ctx.beginPath();
      ctx.moveTo(cx + 2*px, cy + 2*px);
      ctx.lineTo(cx + 8*px, cy + 2*px);
      ctx.lineTo(cx + 4*px, cy + 8*px);
      ctx.lineTo(cx, cy + 4*px);
      ctx.closePath();
      ctx.fill();
    }

    return canvas;
  }

  /**
   * Helper: Draw a pixelated ellipse
   */
  private static drawPixelEllipse(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    rx: number, ry: number,
    px: number
  ): void {
    for (let y = -ry; y <= ry; y += px) {
      for (let x = -rx; x <= rx; x += px) {
        if ((x*x)/(rx*rx) + (y*y)/(ry*ry) <= 1) {
          ctx.fillRect(cx + x - px/2, cy + y - px/2, px, px);
        }
      }
    }
  }

  /**
   * Generate bush sprite - Amiga-style with dithered foliage
   */
  static generateBush(variant: number = 0): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = variant === 0 ? 32 : 48;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const px = 2;
    
    // Amiga foliage palette
    const leafDark = '#004400';
    const leafMid = '#006600';
    const leafLight = '#008800';
    const leafHighlight = '#00aa00';
    const shadow = '#002200';

    const cx = size / 2;
    const cy = size / 2 + 2*px;

    if (variant === 0) {
      // Small round bush
      // Shadow
      ctx.fillStyle = shadow;
      this.drawPixelEllipse(ctx, cx + px, cy + 2*px, 6*px, 4*px, px);
      
      // Main foliage
      ctx.fillStyle = leafMid;
      this.drawPixelEllipse(ctx, cx, cy, 6*px, 5*px, px);
      
      // Upper highlight area
      ctx.fillStyle = leafLight;
      this.drawPixelEllipse(ctx, cx - px, cy - px, 4*px, 3*px, px);
      
      // Dithered texture
      ctx.fillStyle = leafHighlight;
      for (let i = 0; i < 8; i++) {
        const dx = ((i * 7) % 10) - 5;
        const dy = ((i * 5) % 8) - 4;
        ctx.fillRect(cx + dx*px - px, cy + dy*px - px, px, px);
      }
      
      // Dark spots for depth
      ctx.fillStyle = leafDark;
      ctx.fillRect(cx + 2*px, cy + px, px, px);
      ctx.fillRect(cx - px, cy + 2*px, px, px);

    } else {
      // Large bush cluster
      // Shadow
      ctx.fillStyle = shadow;
      this.drawPixelEllipse(ctx, cx + px, cy + 3*px, 10*px, 5*px, px);
      
      // Left blob
      ctx.fillStyle = leafMid;
      this.drawPixelEllipse(ctx, cx - 4*px, cy, 5*px, 5*px, px);
      
      // Right blob
      ctx.fillStyle = leafMid;
      this.drawPixelEllipse(ctx, cx + 4*px, cy + px, 5*px, 4*px, px);
      
      // Top blob
      ctx.fillStyle = leafLight;
      this.drawPixelEllipse(ctx, cx, cy - 4*px, 4*px, 4*px, px);
      
      // Highlights
      ctx.fillStyle = leafHighlight;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const r = 4 + (i % 3) * 2;
        const dx = Math.round(Math.cos(angle) * r);
        const dy = Math.round(Math.sin(angle) * r) - 2;
        ctx.fillRect(cx + dx*px - px, cy + dy*px - px, px, px);
      }
      
      // Dark depth spots
      ctx.fillStyle = leafDark;
      ctx.fillRect(cx - 2*px, cy + 2*px, 2*px, px);
      ctx.fillRect(cx + 3*px, cy + 2*px, px, 2*px);
      ctx.fillRect(cx - 5*px, cy, px, px);
    }

    return canvas;
  }

  /**
   * Generate tree sprite - Amiga-style palm or pine tree
   */
  static generateTree(variant: number = 0): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const px = 2;
    const cx = size / 2;
    
    // Palette
    const trunkDark = '#442200';
    const trunkMid = '#663300';
    const trunkLight = '#884400';
    const leafDark = '#004400';
    const leafMid = '#006600';
    const leafLight = '#008800';
    const leafHighlight = '#00aa00';
    const shadow = '#002200';

    if (variant === 0) {
      // Pine/conifer tree
      // Ground shadow
      ctx.fillStyle = shadow;
      this.drawPixelEllipse(ctx, cx + px, size - 4*px, 8*px, 3*px, px);
      
      // Trunk
      ctx.fillStyle = trunkMid;
      ctx.fillRect(cx - 2*px, size - 16*px, 4*px, 14*px);
      ctx.fillStyle = trunkLight;
      ctx.fillRect(cx - 2*px, size - 16*px, px, 14*px);
      ctx.fillStyle = trunkDark;
      ctx.fillRect(cx + px, size - 16*px, px, 14*px);
      
      // Foliage tiers (bottom to top, larger to smaller)
      const tiers = [
        { y: size - 18*px, rx: 10*px, ry: 5*px },
        { y: size - 24*px, rx: 8*px, ry: 5*px },
        { y: size - 30*px, rx: 6*px, ry: 4*px },
        { y: size - 35*px, rx: 4*px, ry: 3*px },
      ];
      
      for (const tier of tiers) {
        // Dark base
        ctx.fillStyle = leafDark;
        this.drawPixelEllipse(ctx, cx, tier.y + px, tier.rx, tier.ry, px);
        
        // Mid tone
        ctx.fillStyle = leafMid;
        this.drawPixelEllipse(ctx, cx, tier.y, tier.rx - px, tier.ry - px, px);
        
        // Highlight
        ctx.fillStyle = leafLight;
        this.drawPixelEllipse(ctx, cx - px, tier.y - px, tier.rx - 3*px, tier.ry - 2*px, px);
      }
      
      // Top point
      ctx.fillStyle = leafHighlight;
      ctx.fillRect(cx - px, 4*px, 2*px, 4*px);
      
    } else {
      // Deciduous/round tree
      // Ground shadow
      ctx.fillStyle = shadow;
      this.drawPixelEllipse(ctx, cx + px, size - 3*px, 10*px, 3*px, px);
      
      // Trunk
      ctx.fillStyle = trunkMid;
      ctx.fillRect(cx - 2*px, size - 22*px, 4*px, 20*px);
      ctx.fillStyle = trunkLight;
      ctx.fillRect(cx - 2*px, size - 22*px, px, 20*px);
      ctx.fillStyle = trunkDark;
      ctx.fillRect(cx + px, size - 22*px, px, 20*px);
      
      // Main canopy (shadow)
      ctx.fillStyle = leafDark;
      this.drawPixelEllipse(ctx, cx + px, size/2 - 2*px + px, 12*px, 10*px, px);
      
      // Main canopy
      ctx.fillStyle = leafMid;
      this.drawPixelEllipse(ctx, cx, size/2 - 2*px, 12*px, 10*px, px);
      
      // Highlight area
      ctx.fillStyle = leafLight;
      this.drawPixelEllipse(ctx, cx - 2*px, size/2 - 5*px, 8*px, 6*px, px);
      
      // Dithered highlights
      ctx.fillStyle = leafHighlight;
      const highlights = [
        [-4, -6], [-2, -8], [0, -7], [2, -6], [-6, -4], [-3, -5],
        [1, -5], [4, -4], [-5, -2], [-1, -3], [3, -3]
      ];
      for (const [dx, dy] of highlights) {
        ctx.fillRect(cx + dx*px, size/2 + dy*px, px, px);
      }
      
      // Dark depth details
      ctx.fillStyle = leafDark;
      ctx.fillRect(cx + 4*px, size/2, px, 2*px);
      ctx.fillRect(cx + 2*px, size/2 + 3*px, 2*px, px);
    }

    return canvas;
  }

  /**
   * Generate finish line tile - Classic black/white checkerboard
   */
  static generateFinishLine(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const px = 2;  // Pixel size
    const checkSize = 8;  // 4 checks across

    // Classic checkered pattern
    for (let y = 0; y < size; y += checkSize) {
      for (let x = 0; x < size; x += checkSize) {
        const isWhite = ((x + y) / checkSize) % 2 === 0;
        ctx.fillStyle = isWhite ? '#ffffff' : '#000000';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // Add subtle edge highlight (top)
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 0, size, px);
    
    // Add subtle edge shadow (bottom)
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, size - px, size, px);

    return canvas;
  }

  /**
   * Generate tire stack sprite for track decoration
   */
  static generateTireStack(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const px = 2;
    const cx = size / 2;
    
    // Tire colors
    const tireMid = '#222222';
    const tireLight = '#333333';
    const tireHighlight = '#444444';
    const red = '#cc0000';
    const white = '#ffffff';

    // Shadow
    ctx.fillStyle = '#000000';
    this.drawPixelEllipse(ctx, cx + px, size - 4*px, 7*px, 3*px, px);

    // Bottom tire
    ctx.fillStyle = tireMid;
    this.drawPixelEllipse(ctx, cx, size - 6*px, 6*px, 4*px, px);
    ctx.fillStyle = tireLight;
    this.drawPixelEllipse(ctx, cx - px, size - 7*px, 4*px, 2*px, px);
    
    // Middle tire
    ctx.fillStyle = tireMid;
    this.drawPixelEllipse(ctx, cx, size - 12*px, 6*px, 4*px, px);
    ctx.fillStyle = tireLight;
    this.drawPixelEllipse(ctx, cx - px, size - 13*px, 4*px, 2*px, px);
    
    // Top tire
    ctx.fillStyle = tireMid;
    this.drawPixelEllipse(ctx, cx, size - 18*px, 6*px, 4*px, px);
    ctx.fillStyle = tireHighlight;
    this.drawPixelEllipse(ctx, cx - px, size - 19*px, 4*px, 2*px, px);

    // Red/white striping (racing decoration)
    ctx.fillStyle = red;
    ctx.fillRect(cx - 5*px, size - 8*px, 2*px, px);
    ctx.fillRect(cx + 3*px, size - 8*px, 2*px, px);
    ctx.fillStyle = white;
    ctx.fillRect(cx - 3*px, size - 8*px, 2*px, px);
    ctx.fillRect(cx + px, size - 8*px, 2*px, px);

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
      trees: [this.generateTree(0), this.generateTree(1)],
      tireStack: this.generateTireStack(),
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
  trees: HTMLCanvasElement[];
  tireStack: HTMLCanvasElement;
}
