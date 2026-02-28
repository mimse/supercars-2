import { Car } from "../entities/Car";
import { AICar } from "../entities/AICar";

export type RaceState =
  | "pre-race"
  | "countdown"
  | "racing"
  | "finished"
  | "results";

export interface RacerInfo {
  car: Car | AICar;
  name: string;
  lap: number;
  checkpoint: number;
  lastCheckpointTime: number;
  totalTime: number;
  finished: boolean;
  exploded: boolean;
  position: number;
  isPlayer: boolean;
}

export interface Checkpoint {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
}

export class RaceManager {
  private state: RaceState = "pre-race";
  private countdownValue: number = 3;
  private countdownTimer: number = 0;

  private racers: RacerInfo[] = [];
  private checkpoints: Checkpoint[] = [];
  private totalLaps: number = 3;
  private raceStartTime: number = 0;

  private finishOrder: RacerInfo[] = [];

  constructor() {}

  initialize(
    playerCar: Car,
    aiCars: AICar[],
    checkpoints: Checkpoint[],
    laps: number = 3,
  ): void {
    this.checkpoints = checkpoints;
    this.totalLaps = laps;
    this.finishOrder = [];

    // Create racer info for player
    // Start at checkpoint 1 - they haven't crossed finish line yet
    this.racers = [
      {
        car: playerCar,
        name: "Player",
        lap: 0,
        checkpoint: 1,
        lastCheckpointTime: 0,
        totalTime: 0,
        finished: false,
        exploded: false,
        position: 1,
        isPlayer: true,
      },
    ];

    // Add AI racers
    aiCars.forEach((ai) => {
      this.racers.push({
        car: ai,
        name: ai.name,
        lap: 0,
        checkpoint: 1,
        lastCheckpointTime: 0,
        totalTime: 0,
        finished: false,
        exploded: false,
        position: this.racers.length + 1,
        isPlayer: false,
      });
    });

    this.state = "pre-race";
  }

  startCountdown(): void {
    this.state = "countdown";
    this.countdownValue = 3;
    this.countdownTimer = 0;
  }

  update(dt: number): void {
    if (this.state === "countdown") {
      this.countdownTimer += dt;
      if (this.countdownTimer >= 1) {
        this.countdownTimer = 0;
        this.countdownValue--;
        if (this.countdownValue < 0) {
          this.state = "racing";
          this.raceStartTime = performance.now();
        }
      }
    }

    if (this.state === "racing") {
      // Check for exploded cars and update their status
      this.racers.forEach((racer) => {
        if (!racer.exploded && racer.car.hasExploded()) {
          racer.exploded = true;
          racer.finished = true; // Mark as finished so they get a position
          racer.totalTime = performance.now() - this.raceStartTime;
        }
      });

      // Update checkpoints for all active racers
      this.racers.forEach((racer) => this.updateRacerCheckpoint(racer));

      // Update positions
      this.updatePositions();

      // Check if race is finished (player finished/exploded or all racers done)
      const player = this.racers.find((r) => r.isPlayer);
      const playerDone = player?.finished || player?.exploded;
      const allFinished = this.racers.every((r) => r.finished || r.exploded);

      if (playerDone || allFinished) {
        this.state = "finished";
        // Auto transition to results after short delay
        setTimeout(() => {
          this.state = "results";
        }, 2000);
      }
    }
  }

  private updateRacerCheckpoint(racer: RacerInfo): void {
    if (racer.finished || racer.exploded) return;

    const car = racer.car;
    const nextCheckpoint = this.checkpoints[racer.checkpoint];

    if (!nextCheckpoint) return;

    // Check if car is in checkpoint zone
    if (
      car.x >= nextCheckpoint.x &&
      car.x <= nextCheckpoint.x + nextCheckpoint.width &&
      car.y >= nextCheckpoint.y &&
      car.y <= nextCheckpoint.y + nextCheckpoint.height
    ) {
      // Debug logging
      console.log(`${racer.name} crossed checkpoint ${racer.checkpoint} at (${car.x.toFixed(0)}, ${car.y.toFixed(0)}), lap: ${racer.lap}`);
      
      // Crossing checkpoint 0 (finish line) completes a lap
      if (racer.checkpoint === 0) {
        racer.lap++;
        console.log(`${racer.name} completed lap ${racer.lap}/${this.totalLaps}`);

        // Check for race finish
        if (racer.lap >= this.totalLaps) {
          racer.finished = true;
          racer.totalTime = performance.now() - this.raceStartTime;
          this.finishOrder.push(racer);
          console.log(`${racer.name} FINISHED!`);
        }
      }

      // Advance to next checkpoint
      racer.checkpoint = (racer.checkpoint + 1) % this.checkpoints.length;
      racer.lastCheckpointTime = performance.now();
    }
  }

  private updatePositions(): void {
    // Sort racers by: exploded status (last), finished status, lap count, checkpoint progress, distance to next checkpoint
    const sorted = [...this.racers].sort((a, b) => {
      // Exploded racers go to the back
      if (a.exploded && !b.exploded) return 1;
      if (!a.exploded && b.exploded) return -1;
      
      // Finished (non-exploded) racers are ahead
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;

      // Compare laps
      if (a.lap !== b.lap) return b.lap - a.lap;

      // Compare checkpoint progress
      // Racers start needing checkpoint 1, then 2, 3, 0 (finish)
      // So the order is: 1 → 2 → 3 → 0
      // Convert to linear progress value
      const getCheckpointProgress = (cp: number) => {
        // checkpoint 1 = start (lowest progress)
        // checkpoint 0 = about to finish (highest progress)
        if (cp === 1) return 0;
        if (cp === 2) return 1;
        if (cp === 3) return 2;
        if (cp === 0) return 3;
        return cp;
      };

      const progressA = getCheckpointProgress(a.checkpoint);
      const progressB = getCheckpointProgress(b.checkpoint);

      if (progressA !== progressB) return progressB - progressA;

      // Compare distance to next checkpoint (closer = further ahead)
      const nextA = this.checkpoints[a.checkpoint];
      const nextB = this.checkpoints[b.checkpoint];

      if (nextA && nextB) {
        const distA = this.getDistanceToCheckpoint(a.car, nextA);
        const distB = this.getDistanceToCheckpoint(b.car, nextB);
        return distA - distB;
      }

      return 0;
    });

    // Assign positions
    sorted.forEach((racer, index) => {
      racer.position = index + 1;
    });
  }

  private getDistanceToCheckpoint(car: Car, checkpoint: Checkpoint): number {
    const cx = checkpoint.x + checkpoint.width / 2;
    const cy = checkpoint.y + checkpoint.height / 2;
    const dx = car.x - cx;
    const dy = car.y - cy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getState(): RaceState {
    return this.state;
  }

  getCountdown(): number {
    return this.countdownValue;
  }

  getRacers(): RacerInfo[] {
    return this.racers;
  }

  getPlayerInfo(): RacerInfo | undefined {
    return this.racers.find((r) => r.isPlayer);
  }

  getTotalLaps(): number {
    return this.totalLaps;
  }

  getFinishOrder(): RacerInfo[] {
    return this.finishOrder;
  }

  isRacing(): boolean {
    return this.state === "racing";
  }

  canPlayerControl(): boolean {
    return this.state === "racing";
  }

  getRaceTime(): number {
    if (this.raceStartTime === 0) return 0;
    return performance.now() - this.raceStartTime;
  }

  setState(state: RaceState): void {
    this.state = state;
  }
}
