---
title: "Extension Builder — Pipeline de Generación"
tags: [architecture, pipeline]
last_updated: "2026-07-15"
sources:
  - docs/raw/plan-detallado.md
---

# Extension Builder — Pipeline de Generación

Pipeline completo desde la solicitud del usuario hasta la entrega de la extensión.
Todo el pipeline corre en **Supabase Edge Functions** (Deno).

## Etapas

### 1. Prompt → DSL

La solicitud en lenguaje natural se transforma a un DSL intermedio estructurado.
Esto reduce alucinaciones del LLM al acotar el dominio.

```yaml
features:
  - type: shooting
    projectile:
      speed: 80
      direction: up
    input:
      button: A
    cooldown:
      ms: 300

  - type: enemy_spawner
    enemy:
      kind: Enemy
      speed: 30
      behavior: chase
```

Ver [[architecture/dsl-schema]] para el schema completo de features.
Ver [[architecture/prompt-engineering]] para los prompts exactos.

### 2. DSL → Código PXT

El LLM genera 3 archivos a partir del DSL:

- `pxt.json` — manifiesto con dependencias
- `main.ts` — código TypeScript con anotaciones de bloque (`//%`)
- `README.md` — documentación

### 3. Validación

Chequeos automáticos:

| Check | Método |
|-------|--------|
| JSON válido | `JSON.parse(pxt.json)` |
| namespace presente | Regex |
| `//% block` en funciones exportadas | Regex |
| APIs permitidas | Lista blanca |
| Compilación simulada | Opcional |

Ver [[features/validation]].

### 4. Corrección

Si la validación falla, se itera con el LLM para corregir los errores
y se regeneran los archivos completos.

### 5. Publicación en GitHub

Se crea un repositorio automático bajo la **cuenta del usuario autenticado**
vía GitHub REST API (con `fetch()`, sin Octokit). El token de acceso se obtiene
de Supabase Auth (GitHub OAuth provider).

```
/makecode-ext-{timestamp}
  ├── pxt.json
  ├── main.ts
  └── README.md
```

Ver [[features/github-automation]].

### 6. Entrega

Se devuelve al usuario la URL del repositorio lista para importar en MakeCode Arcade.

---

## Diagrama

```
Usuario → Chat IA → DSL → Generador PXT → Validador → GitHub API → URL
                      ↑_________________________| (loop de corrección)
```

Todo corre en Edge Functions de Supabase (Deno). La DB guarda historial de extensiones generadas.
Storage guarda assets (tilesets, imágenes).
