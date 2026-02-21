export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  pause: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);

      // Prevent default for game keys to avoid scrolling
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code,
        )
      ) {
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
    });

    // Handle window blur - release all keys
    window.addEventListener("blur", () => {
      this.keys.clear();
    });
  }

  getState(): InputState {
    return {
      up: this.keys.has("ArrowUp") || this.keys.has("KeyW"),
      down: this.keys.has("ArrowDown") || this.keys.has("KeyS"),
      left: this.keys.has("ArrowLeft") || this.keys.has("KeyA"),
      right: this.keys.has("ArrowRight") || this.keys.has("KeyD"),
      fire: this.keys.has("Space") || this.keys.has("KeyX"),
      pause: this.keys.has("Escape") || this.keys.has("KeyP"),
    };
  }

  isPressed(code: string): boolean {
    return this.keys.has(code);
  }
}
