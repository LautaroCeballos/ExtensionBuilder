---
title: "Extension Builder — DSL Schema"
tags: [architecture, dsl]
last_updated: "2026-07-15"
sources:
  - supabase/shared/dsl-types.ts
---

# Extension Builder — DSL Schema

Definición formal del Domain Specific Language (YAML) para describir extensiones de MakeCode Arcade.
Los tipos TypeScript correspondientes están en `supabase/shared/dsl-types.ts`.

## Estructura raíz

```yaml
extension:
  name: "ShootingDemo"
  description: "Adds shooting mechanics"
  color: "#0fbc11"       # hex color for namespace block
  icon: "⚽"              # emoji

features:
  - type: shooting       # cada feature es un bloque
    ...
```

## Features disponibles

### 1. shooting — Sistema de disparo

```yaml
type: shooting
projectile:
  speed: 80              # px/s
  direction: up          # up | down | left | right | player_aim
  sprite: "player"       # referencia opcional a sprite
  destroy_on_hit: true
input:
  button: A              # A | B | up | down | left | right
cooldown:
  ms: 300
sound:
  enabled: true
  effect: "laser"        # laser | explosion | jump | coin | power_up
```

### 2. enemy_spawner — Generador de enemigos

```yaml
type: enemy_spawner
enemy:
  kind: Enemy             # nombre del tipo
  speed: 30
  behavior: chase         # chase | patrol | random | stationary
  sprite: null
  health: 2
spawn:
  interval_ms: 2000
  position: top           # top | bottom | left | right | random_edge
  max_on_screen: 5
score:
  on_kill: 10
sound:
  on_spawn: "jump"
  on_destroy: "explosion"
```

### 3. movement — Patrón de movimiento

```yaml
type: movement
target: "player"          # ref al sprite/variable
pattern:
  type: patrol            # patrol | chase | sine | circle | follow_path
  speed: 40
  bounds: [0, 0, 160, 120]  # x, y, width, height
```

### 4. collision — Manejo de colisiones

```yaml
type: collision
sprite_a: Player
sprite_b: Enemy
action:
  - destroy_both
  - damage: 1
  - sound: "explosion"
  - score: 10
```

### 5. health_system — Sistema de vida

```yaml
type: health_system
target: Player
max_hp: 3
on_zero: game_over        # game_over | respawn | nothing
hud: true
invincibility_ms: 1000
```

### 6. score_system — Puntuación

```yaml
type: score_system
hud: true
on_death_reset: true
```

### 7. timer — Cuenta regresiva

```yaml
type: timer
seconds: 60
on_end: game_over         # game_over | win | nothing
hud: true
sound_last_10: true
```

### 8. powerup — Power-ups

```yaml
type: powerup
kind: speed_boost         # speed_boost | rapid_fire | shield | extra_life | spread_shot
duration_ms: 5000
sprite: null
spawn_interval_ms: 10000
sound: "power_up"
```

### 9. tilemap — Escenario con tiles

```yaml
type: tilemap
tile_set: "platformer"
wall_tiles: [1, 2]
player_start: [1, 5]      # col, row
enemies: []
```

### 10. custom — Feature libre

```yaml
type: custom
description: "Descripción de lo que hace"
code: |
  // TypeScript inline (opcional)
```

## Reglas del DSL

1. **`type`** es obligatorio y debe ser uno de los 10 tipos definidos
2. Los valores numéricos tienen defaults inferidos por el LLM si se omiten
3. Las referencias entre features (ej: `sprite_a: Player`) son strings — el LLM las resuelve al generar el código
4. El DSL se valida contra los tipos en `supabase/shared/dsl-types.ts`

Links:
- [[architecture/pipeline]] — Cómo se usa el DSL en el pipeline
- [[architecture/prompt-engineering]] — Prompts de transformación a DSL
