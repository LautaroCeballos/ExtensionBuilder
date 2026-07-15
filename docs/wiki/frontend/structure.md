---
title: "Extension Builder — Frontend Structure"
tags: [frontend]
last_updated: "2026-07-15"
---

# Extension Builder — Frontend Structure

Frontend con Astro + Tailwind CSS + TypeScript. Genera HTML estático
que se comunica con las Edge Functions de Supabase vía fetch().

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Astro 5 |
| Estilos | Tailwind CSS 3 |
| Lenguaje | TypeScript |
| Build output | Static HTML |
| API calls | fetch() directo a Supabase Edge Functions |

## Estructura de archivos

```
frontend/
├── package.json
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── .env.example
├── public/
│   └── favicon.svg
└── src/
    ├── env.d.ts
    ├── styles/
    │   └── global.css
    ├── layouts/
    │   └── BaseLayout.astro
    ├── components/
    │   └── ChatBox.astro         # chat interactivo (client-side JS)
    └── pages/
        └── index.astro           # página principal
```

## Componentes

### ChatBox.astro

Componente principal del chat. Todo el JS corre en el cliente.
Diseño: dark industrial tool, usa pipeline step indicator visual.

Características:
- **Pipeline step indicator**: 4 steps (Traducir → Generar → Validar → Publicar) con estados visuales (idle, running, done, error) y animaciones
- **DSL preview**: acordeón colapsable con el YAML generado y conteo de tokens
- **File preview**: acordeones por archivo (pxt.json, main.ts, README.md) con sintaxis resaltada
- **Validation display**: checks individuales con iconos pass/fail
- **Per-step error states**: muestra en qué step falló el pipeline

Flujo:

1. Usuario escribe prompt → Enter o click "Generar"
2. Se muestra el pipeline step indicator con todos los steps en idle
3. **Step 1 — Traducir**: `POST /functions/v1/translate` (prompt → DSL YAML)
4. **Step 2 — Generar**: `POST /functions/v1/generate` (DSL → pxt.json + main.ts + README.md)
5. **Step 3 — Validar**: `POST /functions/v1/validate` (6 checks: required_files, pxt_json_valid, pxt_dependencies, namespace_present, block_annotations, allowed_apis)
6. **Step 4 — Publicar**: `POST /functions/v1/publish` → URL de GitHub
7. Cada step se marca done/error según corresponda

### Design system

- Colores base: `#121212` surface, `#1a1a1a` elevated, `#2a2a2a` border
- Acento: Emerald (`#10b981`)
- Tipografía: Inter (UI), Menlo/Consolas (código)
- Animaciones: messageSlideIn para mensajes, pulse-dot para loading
- Scrollbar personalizada (6px, oscura)

### Variables de entorno

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Key pública de Supabase |

Links:
- [[architecture/overview]] — Arquitectura general
- [[architecture/supabase]] — Backend Supabase
