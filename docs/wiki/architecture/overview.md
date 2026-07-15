---
title: "Extension Builder — Arquitectura General"
tags: [architecture]
last_updated: "2026-07-15"
sources:
  - docs/raw/plan-detallado.md
  - docs/raw/plan_makecode_ai.md
---

# Extension Builder — Arquitectura General

Plataforma web para generar extensiones de **MakeCode Arcade** mediante lenguaje natural.
El usuario describe qué extensión quiere y el sistema genera código PXT válido,
crea automáticamente un repositorio en GitHub (bajo su propia cuenta) y entrega la URL lista para importar.

## Flujo de alto nivel

```
Usuario (describe en lenguaje natural)
  ↓
Frontend Chat IA
  ↓
Supabase Edge Functions
  ├── Transformación a DSL intermedio
  ├── Generador de código (LLM → PXT)
  ├── Validador automático
  └── Creación de repo GitHub (bajo la cuenta del usuario)
  ↓
Entrega de URL de extensión
```

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Astro + Tailwind CSS + TypeScript |
| Backend | Supabase (Edge Functions en Deno, PostgreSQL, Auth, Storage) |
| IA | Gemini API (`gemini-3.1-flash-lite`) |
| GitHub Auth | Supabase Auth con proveedor GitHub |
| Repos | GitHub REST API directa (vía `fetch()` desde Edge Functions) |

### Servicios de Supabase utilizados

| Servicio | Uso |
|----------|-----|
| **Auth** | Autenticación con GitHub OAuth — cada usuario autoriza su propia cuenta |
| **Edge Functions** | Pipeline completo (DSL → código → validación → GitHub) corriendo en Deno |
| **DB (PostgreSQL)** | Extensiones generadas, usuarios, catálogo, historial |
| **Storage** | Tilesets, imágenes, assets de extensiones |

## Archivos generados por extensión

- `pxt.json` — manifiesto de la extensión MakeCode
- `main.ts` — código fuente TypeScript con bloques anotados (`//%`)
- `README.md` — documentación autogenerada

## Pipeline status (2026-07-15)

Pipeline completo probado extremo a extremo:

| Step | Edge Function | Model | Status |
|------|--------------|-------|--------|
| 1. Traducir | `translate` v7 | `gemini-3.1-flash-lite` | ✅ |
| 2. Generar | `generate` v13 | `gemini-3.1-flash-lite` | ✅ |
| 3. Validar | `validate` v8 | `gemini-3.1-flash-lite` | ✅ |
| 4. Publicar | `publish` v4 | No usa IA | ⚠️ (requiere token GitHub con permisos) |

Evolución del modelo:
- Inicial: `gemini-flash-latest` → resolvía a `gemini-3.5-flash` (20 req/día gratis)
- Intento 1: `gemini-1.5-flash` (1500 req/día) — **deprecado** (Jul 2026)
- Intento 2: `gemini-2.0-flash` — **quota 0** en free tier
- Intento 3: `gemini-2.5-flash` — **no disponible** para usuarios nuevos
- Final: `gemini-3.1-flash-lite` — **funcionando** con quota disponible

## Problemas reales identificados

| Problema | Mitigación |
|----------|-----------|
| El LLM alucina APIs | Usar DSL intermedio para estructurar |
| GitHub login frena adopción | UX simplificada, flujo guiado con Supabase Auth |
| Contenido basura/generación abusiva | Rate limiting + moderación + cada repo es del usuario (responsabilidad suya) |

## Mejora estratégica

Agregar Marketplace de extensiones, sistema de rating, fork/remix y templates educativos.

Links:
- [[architecture/supabase]] — Servicios de Supabase y configuración
- [[architecture/pipeline]] — Detalle del pipeline completo
- [[architecture/prompt-engineering]] — System prompts y transformación DSL
- [[architecture/roadmap]] — Timeline del MVP
- [[features/github-automation]] — Creación automática de repos con GitHub OAuth
- [[features/validation]] — Validación de código generado
- [[features/templates]] — Templates base de archivos
