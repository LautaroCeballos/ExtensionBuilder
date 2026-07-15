---
title: "Extension Builder — Validación Automática"
tags: [feature, validation]
last_updated: "2026-07-15"
sources:
  - docs/raw/plan-detallado.md
---

# Extension Builder — Validación Automática

Chequeos automáticos que se aplican al código generado antes de publicarlo.

## Checks mínimos

| Check | Método | Descripción |
|-------|--------|-------------|
| JSON válido | `JSON.parse()` | Verifica que `pxt.json` sea sintácticamente válido |
| `namespace` presente | Regex `/namespace\s+\w+/` | Toda extensión debe declarar un namespace |
| `//% block` en exports | Regex `//%\s*block=` | Las funciones exportadas deben tener anotación de bloque |
| APIs permitidas | Lista blanca | Solo APIs válidas de MakeCode Arcade (sprites, controller, game, music, scene) |
| Compilación simulada | Opcional | Ejecución simulada del compilador PXT |

## Lista blanca de APIs

APIs permitidas en el código generado:

- `sprites.*`
- `controller.*`
- `game.*`
- `music.*`
- `scene.*`
- `info.*`
- `Math.*`
- `String.*`
- `Array.*`

## Pipeline de validación

```
Código generado
  → Parsear pxt.json (JSON.parse)
  → Verificar namespace en main.ts
  → Verificar //% block en funciones exportadas
  → Escanear APIs vs lista blanca
  → [Opcional] Compilación simulada
  → Si falla → loop de corrección con LLM
  → Si pasa → publicación en GitHub
```

## Loop de corrección

Si algún check falla, se envía el error al LLM junto con el código actual
y se solicita regenerar todos los archivos corregidos.
