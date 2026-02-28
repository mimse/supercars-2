interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'fire' | 'smoke' | 'debris';
}

export class Explosion {
  private particles: Particle[] = [];
  private x: number;
  private y: number;
  private age: number = 0;
  private readonly duration: number = 1.5; // Total explosion duration in seconds
  
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.createParticles();
  }
  
  private createParticles(): void {
    // Fire particles (center, fast, short-lived)
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x: this.x + (Math.random() - 0.5) * 10,
        y: this.y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.3 + Math.random() * 0.3,
        size: 8 + Math.random() * 12,
        color: this.getFireColor(),
        type: 'fire'
      });
    }
    
    // Smoke particles (slower, longer-lived)
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      this.particles.push({
        x: this.x + (Math.random() - 0.5) * 15,
        y: this.y + (Math.random() - 0.5) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20, // Smoke rises
        life: 0.8 + Math.random() * 0.7,
        maxLife: 0.8 + Math.random() * 0.7,
        size: 15 + Math.random() * 20,
        color: '#333333',
        type: 'smoke'
      });
    }
    
    // Debris particles (fast, small, bouncy feel)
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 3 + Math.random() * 5,
        color: this.getDebrisColor(),
        type: 'debris'
      });
    }
  }
  
  private getFireColor(): string {
    const colors = ['#ff4400', '#ff6600', '#ff8800', '#ffaa00', '#ffcc00', '#ffff00'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  private getDebrisColor(): string {
    const colors = ['#444444', '#555555', '#666666', '#333333', '#772200'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  update(dt: number): void {
    this.age += dt;
    
    for (const particle of this.particles) {
      // Update position
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      
      // Apply drag
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      
      // Gravity for debris
      if (particle.type === 'debris') {
        particle.vy += 200 * dt;
      }
      
      // Smoke rises
      if (particle.type === 'smoke') {
        particle.vy -= 30 * dt;
      }
      
      // Decrease life
      particle.life -= dt;
    }
    
    // Remove dead particles
    this.particles = this.particles.filter(p => p.life > 0);
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    // Sort particles by type for proper layering (smoke behind fire)
    const sortedParticles = [...this.particles].sort((a, b) => {
      const order = { smoke: 0, debris: 1, fire: 2 };
      return order[a.type] - order[b.type];
    });
    
    for (const particle of sortedParticles) {
      const lifeRatio = particle.life / particle.maxLife;
      
      ctx.globalAlpha = lifeRatio * (particle.type === 'smoke' ? 0.6 : 1);
      
      if (particle.type === 'fire') {
        // Fire glow effect
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * lifeRatio
        );
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(0.5, particle.color + '88');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * lifeRatio * 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (particle.type === 'smoke') {
        // Smoke puff
        const size = particle.size * (1.5 - lifeRatio * 0.5); // Smoke expands
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, size
        );
        gradient.addColorStop(0, '#44444488');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Debris - simple rectangles
        ctx.fillStyle = particle.color;
        const size = particle.size * lifeRatio;
        ctx.fillRect(
          particle.x - size / 2,
          particle.y - size / 2,
          size,
          size
        );
      }
    }
    
    ctx.restore();
  }
  
  isFinished(): boolean {
    return this.age >= this.duration && this.particles.length === 0;
  }
}
