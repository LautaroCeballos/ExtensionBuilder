---
title: "Log — Registro de cambios"
tags: [log]
last_updated: "2026-07-15"
---

# Log — Registro de cambios

## [2026-07-15] init | Wiki initialization
- Created `docs/wiki/` with `index.md` and `log.md`
- Project: Extension Builder (new)

## [2026-07-15] ingest | plan_makecode_ai.md
- Source: `docs/raw/plan_makecode_ai.md`
- Pages created: [[architecture/overview]]

## [2026-07-15] ingest | plan-detallado.md
- Source: `docs/raw/plan-detallado.md`
- Pages updated: [[architecture/overview]]
- Pages created: [[architecture/pipeline]], [[architecture/prompt-engineering]], [[architecture/roadmap]], [[features/github-automation]], [[features/validation]], [[features/templates]]
- Index updated: [[index]]

## [2026-07-15] update | Supabase stack
- Migrated backend from Express/Vercel to Supabase (Edge Functions, Auth, DB, Storage)
- Pages updated: [[architecture/overview]], [[architecture/pipeline]], [[features/github-automation]]
- Pages created: [[architecture/supabase]]
- Index updated: [[index]]

## [2026-07-15] impl | Semana 1 — MVP base
- Implementation of project scaffold, DSL types, Edge Functions and Astro frontend
- Source: `docs/raw/plans/2026-07-15-semana1-mvp.md`
- Pages updated: [[architecture/supabase]]
- Pages created: [[architecture/dsl-schema]], [[frontend/structure]]
- Index updated: [[index]]

## [2026-07-15] deploy | Pipeline test + model migration to gemini-3.1-flash-lite
- Re-deployed all 4 Edge Functions with corrected Gemini model
- translate v7, generate v13, validate v8, publish v4
- Model evolution: gemini-1.5-flash deprecado → gemini-2.0-flash quota 0 → gemini-3.1-flash-lite working
- Full pipeline tested: translate ✅ generate ✅ validate ✅ publish ⚠️ (requires GitHub token with repo creation perms)
- Frontend redesign: pipeline step indicator, DSL preview, file preview, per-step states
- Pages updated: [[architecture/overview]], [[architecture/supabase]], [[frontend/structure]]
