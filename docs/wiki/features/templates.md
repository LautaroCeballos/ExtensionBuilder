---
title: "Extension Builder — Templates Base"
tags: [feature, templates]
last_updated: "2026-07-15"
sources:
  - docs/raw/plan-detallado.md
---

# Extension Builder — Templates Base

Estructura base de los archivos generados para cada extensión MakeCode Arcade.

## pxt.json

Manifiesto de la extensión. Define nombre, dependencias y archivos incluidos.

```json
{
  "name": "auto-extension",
  "description": "Generated extension",
  "dependencies": {
    "device": "*"
  },
  "files": [
    "main.ts",
    "README.md"
  ]
}
```

## main.ts

Código TypeScript con anotaciones de bloque MakeCode (`//%`).

```ts
/**
 * Generated extension
 */
//% weight=100 color=#0fbc11 icon="⚽"
namespace autoext {

    /**
     * Example block
     */
    //% block="do something"
    //% weight=100
    export function doSomething(): void {

    }

}
```

### Reglas del `main.ts`

- Usar `//% block="texto"` para descripción del bloque
- Usar `//% weight=N` para orden en el menú
- Usar `//% blockGap=8` para espaciado entre bloques
- Usar `//% group="GroupName"` para agrupar bloques
- Sin imports externos
- Sin APIs del DOM
- Sin async/await

## README.md

Documentación markdown autogenerada describiendo la extensión, sus bloques y ejemplos de uso.

Ver también: [[architecture/pipeline]] — Cómo se genera cada archivo
