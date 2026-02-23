/**
 * HUD - Faithful recreation of the original Supercars 2 bottom panel
 * Layout: SPEED | POS | LAPS | DAMAGE
 */

export interface HUDData {
  speed: number;           // Current speed (0-300)
  maxSpeed: number;        // Maximum speed for bar calculation
  position: number;        // Race position (1-10)
  totalRacers: number;     // Total cars in race
  lap: number;             // Current lap (1-based for display)
  totalLaps: number;       // Total laps in race
  damage: number;          // Damage percentage (0-100)
}

export class HUD {
  // Panel dimensions - scaled down to 1/3 of 2x
  private readonly panelY: number = 825;  // 1.5x game area height
  private readonly panelHeight: number = 34;
  private readonly canvasWidth: number = 1200;  // 1.5x canvas width

  // Section widths - scaled down to 1/3 of 2x
  private readonly speedWidth = 107;
  private readonly posWidth = 80;
  private readonly lapsWidth = 80;
  // Damage takes remaining width

  // Colors (matching Amiga aesthetic)
  private readonly backgroundColor = '#1a1a2e';
  private readonly borderColor = '#3d3d5c';
  private readonly labelColor = '#8888aa';
  private readonly valueColor = '#ffffff';
  private readonly barBackground = '#2a2a3e';
  private readonly barBorder = '#4a4a6a';

  /**
   * Render the complete HUD panel
   */
  render(ctx: CanvasRenderingContext2D, data: HUDData): void {
    ctx.save();

    this.renderBackground(ctx);
    this.renderSpeedSection(ctx, data.speed, data.maxSpeed);
    this.renderPositionSection(ctx, data.position);
    this.renderLapsSection(ctx, data.lap, data.totalLaps);
    this.renderDamageSection(ctx, data.damage);

    ctx.restore();
  }

  /**
   * Render panel background and section dividers
   */
  private renderBackground(ctx: CanvasRenderingContext2D): void {
    // Dark panel background
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, this.panelY, this.canvasWidth, this.panelHeight);

    // Top border line (brighter)
    ctx.fillStyle = '#4a4a6a';
    ctx.fillRect(0, this.panelY, this.canvasWidth, 1);

    // Section dividers
    ctx.fillStyle = this.borderColor;
    const dividers = [
      this.speedWidth,
      this.speedWidth + this.posWidth,
      this.speedWidth + this.posWidth + this.lapsWidth,
    ];
    for (const x of dividers) {
      ctx.fillRect(x, this.panelY + 3, 1, this.panelHeight - 6);
    }
  }

  /**
   * Render SPEED section with bar
   */
  private renderSpeedSection(ctx: CanvasRenderingContext2D, speed: number, maxSpeed: number): void {
    const sectionX = 6;
    const centerY = this.panelY + this.panelHeight / 2;

    // Label
    ctx.fillStyle = this.labelColor;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('SPEED', sectionX, this.panelY + 4);

    // Speed bar background
    const barX = sectionX;
    const barY = centerY - 1;
    const barWidth = this.speedWidth - 14;
    const barHeight = 12;

    ctx.fillStyle = this.barBackground;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Speed bar fill
    const speedPercent = Math.min(1, Math.abs(speed) / maxSpeed);
    const fillWidth = (barWidth - 2) * speedPercent;

    // Color gradient based on speed
    if (fillWidth > 0) {
      const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
      gradient.addColorStop(0, '#22c55e');     // Green
      gradient.addColorStop(0.5, '#eab308');   // Yellow
      gradient.addColorStop(1, '#dc2626');     // Red
      
      ctx.fillStyle = gradient;
      ctx.fillRect(barX + 1, barY + 1, fillWidth, barHeight - 2);
    }

    // Bar border
    ctx.strokeStyle = this.barBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Speed value (small, below bar)
    ctx.fillStyle = this.valueColor;
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(Math.abs(speed))}`, barX + barWidth, barY + barHeight + 7);
  }

  /**
   * Render POS section
   */
  private renderPositionSection(ctx: CanvasRenderingContext2D, position: number): void {
    const sectionX = this.speedWidth + 7;
    const centerY = this.panelY + this.panelHeight / 2;

    // Label
    ctx.fillStyle = this.labelColor;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('POS', sectionX, this.panelY + 4);

    // Position number (large)
    ctx.fillStyle = this.getPositionColor(position);
    ctx.font = 'bold 17px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(position.toString(), sectionX, centerY + 4);

    // Ordinal suffix (smaller, raised)
    ctx.font = 'bold 8px monospace';
    const suffix = this.getOrdinalSuffix(position);
    const numWidth = ctx.measureText(position.toString()).width;
    ctx.fillText(suffix, sectionX + numWidth + 1, centerY);
  }

  /**
   * Render LAPS section
   */
  private renderLapsSection(ctx: CanvasRenderingContext2D, lap: number, _totalLaps: number): void {
    const sectionX = this.speedWidth + this.posWidth + 7;
    const centerY = this.panelY + this.panelHeight / 2;

    // Label
    ctx.fillStyle = this.labelColor;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('LAPS', sectionX, this.panelY + 4);

    // Lap number (large)
    ctx.fillStyle = this.valueColor;
    ctx.font = 'bold 17px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lap.toString(), sectionX + 33, centerY + 4);
  }

  /**
   * Render DAMAGE section with health bar
   */
  private renderDamageSection(ctx: CanvasRenderingContext2D, damage: number): void {
    const sectionX = this.speedWidth + this.posWidth + this.lapsWidth + 8;
    const centerY = this.panelY + this.panelHeight / 2;

    // Label
    ctx.fillStyle = this.labelColor;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('DAMAGE', sectionX, this.panelY + 4);

    // Damage bar background
    const barX = sectionX;
    const barY = centerY - 1;
    const barWidth = this.canvasWidth - sectionX - 8;
    const barHeight = 12;

    ctx.fillStyle = this.barBackground;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health remaining (inverse of damage)
    const healthPercent = Math.max(0, 1 - damage / 100);
    const fillWidth = (barWidth - 2) * healthPercent;

    if (fillWidth > 0) {
      // Color based on health level
      let barColor: string;
      if (healthPercent > 0.6) {
        barColor = '#22c55e';  // Green - healthy
      } else if (healthPercent > 0.3) {
        barColor = '#eab308';  // Yellow - warning
      } else {
        barColor = '#dc2626';  // Red - critical
      }

      ctx.fillStyle = barColor;
      ctx.fillRect(barX + 1, barY + 1, fillWidth, barHeight - 2);

      // Add segment lines for retro look
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      const segmentWidth = (barWidth - 2) / 10;
      for (let i = 1; i < 10; i++) {
        ctx.fillRect(barX + 1 + i * segmentWidth, barY + 1, 1, barHeight - 2);
      }
    }

    // Bar border
    ctx.strokeStyle = this.barBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  /**
   * Get ordinal suffix for position (1st, 2nd, 3rd, etc.)
   */
  private getOrdinalSuffix(n: number): string {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }

    switch (lastDigit) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  /**
   * Get color for position display
   */
  private getPositionColor(position: number): string {
    switch (position) {
      case 1: return '#ffd700';  // Gold
      case 2: return '#c0c0c0';  // Silver
      case 3: return '#cd7f32';  // Bronze
      default: return this.valueColor;
    }
  }
}
