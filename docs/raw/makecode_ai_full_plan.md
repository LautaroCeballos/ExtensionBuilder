# Plataforma Completa: Generación Automática de Extensiones MakeCode con IA

## 1. Objetivo

Sistema que convierte lenguaje natural en extensiones válidas de MakeCode Arcade, incluyendo:

- Interpretación semántica
- Generación estructurada
- Validación automática
- Publicación en GitHub
- Integración con flujo de usuario final

---

## 2. Arquitectura General

Usuario
→ Chat UI
→ Backend API
→ Pipeline IA
   → Prompt → DSL
   → DSL → Código
   → Validación
   → Corrección
→ GitHub API
→ Repo listo

---

## 3. Stack

Frontend:
- Astro
- Tailwind
- TypeScript

Backend:
- Node.js
- Fastify (preferido por performance)

IA:
- OpenAI (prompt chaining)

Infra:
- Vercel / Cloudflare Workers

---

## 4. Pipeline IA

### 4.1 Prompt → DSL

Ejemplo:

Input:
"crear disparo con cooldown de 500ms"

Output DSL:
FEATURE: shooting
COOLDOWN: 500
INPUT: A

---

### 4.2 DSL → Código

Genera:
- pxt.json
- main.ts
- README.md

---

### 4.3 Validación

Checklist:

- JSON válido
- namespace correcto
- funciones exportadas
- anotaciones //%
- APIs válidas

---

### 4.4 Corrección

Loop automático hasta pasar validación.

---

## 5. Prompt Engineering

### System Prompt

- Solo APIs MakeCode
- No inventar funciones
- Generar archivos completos
- Usar //% block

---

### Generación estructurada

Formato obligatorio:

===FILE: pxt.json===
===FILE: main.ts===
===FILE: README.md===

---

## 6. Templates Base

### pxt.json

{
  "name": "auto-ext",
  "dependencies": {
    "device": "*"
  },
  "files": ["main.ts","README.md"]
}

---

### main.ts

namespace autoext {
  //% block="acción"
  export function accion() {}
}

---

## 7. Integración GitHub

Flujo:

1. Crear repo
2. Crear archivos
3. Commit inicial

Endpoints:

- POST /user/repos
- PUT /contents

Optimización:
- usar Git Trees API (batch commit)

---

## 8. Backend API

POST /generate-extension

Input:
{ "prompt": "..." }

Output:
{
  "repo_url": "...",
  "files": {}
}

---

## 9. Seguridad

- Token en backend
- Sanitización input
- Rate limiting

---

## 10. UX

Usuario escribe → espera → recibe repo → abre en MakeCode

---

## 11. Riesgos

- Código inválido → DSL + validator
- Dependencia MakeCode → versionado
- Latencia IA → cache

---

## 12. Roadmap

Fase 1:
- MVP funcional

Fase 2:
- Validación robusta

Fase 3:
- Marketplace

---

## 13. Mejora clave

Diferencial real:
- catálogo de extensiones
- reutilización
- comunidad

---

## 14. Métricas

- tasa de éxito
- tiempo generación
- uso repos

