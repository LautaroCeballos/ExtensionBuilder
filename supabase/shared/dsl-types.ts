// ===== DSL Type Definitions =====
// Shared between Edge Functions (Deno) and Frontend (Astro)

// ===== Extension Root =====
export interface DSLExtension {
  extension: {
    name: string;
    description?: string;
    color?: string;   // hex color for namespace
    icon?: string;    // emoji
  };
  features: DSLFeature[];
}

// ===== Feature Union =====
export type DSLFeature =
  | FeatureShooting
  | FeatureEnemySpawner
  | FeatureMovement
  | FeatureCollision
  | FeatureHealthSystem
  | FeatureScoreSystem
  | FeatureTimer
  | FeaturePowerup
  | FeatureTilemap
  | FeatureCustom;

// ===== 1. Shooting =====
export interface FeatureShooting {
  type: "shooting";
  projectile: {
    speed: number;
    direction: "up" | "down" | "left" | "right" | "player_aim";
    sprite?: string;
    destroy_on_hit?: boolean;
  };
  input: {
    button: "A" | "B" | "up" | "down" | "left" | "right";
  };
  cooldown?: {
    ms: number;
  };
  sound?: {
    enabled: boolean;
    effect?: "laser" | "explosion" | "jump" | "coin" | "power_up";
  };
}

// ===== 2. Enemy Spawner =====
export interface FeatureEnemySpawner {
  type: "enemy_spawner";
  enemy: {
    kind: string;
    speed: number;
    behavior: "chase" | "patrol" | "random" | "stationary";
    sprite?: string;
    health?: number;
  };
  spawn: {
    interval_ms: number;
    position: "top" | "bottom" | "left" | "right" | "random_edge";
    max_on_screen: number;
  };
  score?: {
    on_kill: number;
  };
  sound?: {
    on_spawn?: string;
    on_destroy?: string;
  };
}

// ===== 3. Movement =====
export interface FeatureMovement {
  type: "movement";
  target: string;
  pattern?: {
    type: "patrol" | "chase" | "sine" | "circle" | "follow_path";
    speed: number;
    bounds?: [number, number, number, number]; // x, y, width, height
  };
}

// ===== 4. Collision =====
export interface FeatureCollision {
  type: "collision";
  sprite_a: string;
  sprite_b: string;
  action: CollisionAction[];
}

export type CollisionAction =
  | { destroy_both: true }
  | { damage: number }
  | { sound: string }
  | { score: number };

// ===== 5. Health System =====
export interface FeatureHealthSystem {
  type: "health_system";
  target: string;
  max_hp: number;
  on_zero: "game_over" | "respawn" | "nothing";
  hud?: boolean;
  invincibility_ms?: number;
}

// ===== 6. Score System =====
export interface FeatureScoreSystem {
  type: "score_system";
  hud?: boolean;
  on_death_reset?: boolean;
}

// ===== 7. Timer =====
export interface FeatureTimer {
  type: "timer";
  seconds: number;
  on_end: "game_over" | "win" | "nothing";
  hud?: boolean;
  sound_last_10?: boolean;
}

// ===== 8. Powerup =====
export interface FeaturePowerup {
  type: "powerup";
  kind: "speed_boost" | "rapid_fire" | "shield" | "extra_life" | "spread_shot";
  duration_ms: number;
  sprite?: string;
  spawn_interval_ms: number;
  sound?: string;
}

// ===== 9. Tilemap =====
export interface FeatureTilemap {
  type: "tilemap";
  tile_set: string;
  wall_tiles: number[];
  player_start: [number, number];
  enemies?: [number, number][];
}

// ===== 10. Custom =====
export interface FeatureCustom {
  type: "custom";
  description: string;
  code?: string;
}

// ===== Validation Helpers =====

export const VALID_FEATURE_TYPES = [
  "shooting", "enemy_spawner", "movement", "collision",
  "health_system", "score_system", "timer", "powerup",
  "tilemap", "custom",
] as const;

export const VALID_DIRECTIONS = [
  "up", "down", "left", "right", "player_aim",
] as const;

export const VALID_BUTTONS = [
  "A", "B", "up", "down", "left", "right",
] as const;

export const VALID_BEHAVIORS = [
  "chase", "patrol", "random", "stationary",
] as const;

export const VALID_SOUND_EFFECTS = [
  "laser", "explosion", "jump", "coin", "power_up",
] as const;

export const VALID_POWERUP_KINDS = [
  "speed_boost", "rapid_fire", "shield", "extra_life", "spread_shot",
] as const;
