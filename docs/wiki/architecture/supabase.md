---
title: "Extension Builder — Supabase"
tags: [architecture, supabase]
last_updated: "2026-07-15"
---

# Extension Builder — Supabase

Supabase es el backend de la plataforma. Reemplaza un backend Express propio y unifica
auth, base de datos, funciones serverless y storage en un solo servicio.

## Servicios utilizados

### Auth — GitHub OAuth

Cada usuario se autentica con GitHub. Supabase maneja el flujo OAuth completo y expone
el token de GitHub del usuario para crear repos bajo su propia cuenta.

Configuración necesaria:
- GitHub OAuth App registrada en GitHub Developer Settings
- `Client ID` y `Client Secret` configurados en Supabase Auth providers
- Redirect URL apuntando a `https://[project].supabase.co/auth/v1/callback`

Flujo:
```
Usuario → "Login with GitHub" → Supabase Auth → GitHub OAuth → token en sesión
```

El token de GitHub se obtiene desde la Edge Function vía `supabase.auth.getUserIdentities()`.

### Edge Functions (Deno)

Pipeline completo corriendo en Edge Functions de Supabase. Son funciones serverless
en Deno con las ventajas:

- Sin servidor que administrar
- Escalan a 0 cuando no se usan
- Arranque frío rápido (Deno)
- Sin lock-in de Octokit — llamamos GitHub REST API con `fetch()`

Funciones desplegadas (Jul 2026):

| Edge Function | Versión | Input | Output | IA |
|---------------|---------|-------|--------|----|
| `translate` | v7 | `{ prompt }` | `{ dsl }` (YAML) | Gemini 3.1 Flash Lite |
| `generate` | v13 | `{ dsl }` | `{ files }` (código PXT) | Gemini 3.1 Flash Lite |
| `validate` | v8 | `{ files }` | `{ valid, errors, fixed? }` | Gemini 3.1 Flash Lite |
| `publish` | v4 | `{ files }` | `{ repoUrl }` | No usa IA |

Archivos en `supabase/functions/`:
- `translate/index.ts` → `POST /functions/v1/translate`
- `generate/index.ts` → `POST /functions/v1/generate`
- `validate/index.ts` → `POST /functions/v1/validate`
- `publish/index.ts` → `POST /functions/v1/publish`

Shared utils en `supabase/shared/`:
- `dsl-types.ts` — tipos TypeScript del DSL
- `gemini.ts` — referencia de cliente Gemini (no importado; el código va inline en cada función para evitar problemas de bundling en Deno)
- `openai.ts` — **deprecado** (reemplazado por Gemini API)
- `callGemini()` — función inline en cada Edge Function: llama a `gemini-3.1-flash-lite` vía `fetch()`

Ver [[architecture/pipeline]] para el detalle del pipeline.

### DB (PostgreSQL)

Base de datos relacional para persistencia.

Esquema inicial propuesto:

```sql
-- Usuarios (sync automático con Supabase Auth)
CREATE TABLE extensions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users NOT NULL,
  name        TEXT NOT NULL,
  prompt      TEXT NOT NULL,
  dsl         JSONB NOT NULL,
  files       JSONB NOT NULL,
  repo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE extension_stars (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id UUID REFERENCES extensions(id) NOT NULL,
  user_id      UUID REFERENCES auth.users NOT NULL,
  UNIQUE(extension_id, user_id)
);
```

Este esquema cubre el MVP. Post-MVP se agregan ratings, forks, templates, etc.

### Storage

Para assets de las extensiones: tilesets, imágenes de sprites, sonidos.

Estructura de buckets:
```
extension-builder/
  ├── tilesets/
  ├── sprites/
  └── assets/
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Key pública para el frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Key para Edge Functions (solo server) |
| `GEMINI_API_KEY` | API key de Gemini AI |
| `GITHUB_TOKEN` | Token de GitHub (central para MVP) |

> [!note]
> Las variables se setean via Management API con formato JSON array: `[{name:"KEY",value:"VAL"}]`.
> NO usar `SUPABASE_SERVICE_ROLE_KEY` en cliente.

---

Links:
- [[architecture/overview]] — Arquitectura general
- [[architecture/pipeline]] — Pipeline de generación
- [[features/github-automation]] — Edge Function de publicación
