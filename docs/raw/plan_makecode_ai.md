# Plataforma de Generación Automática de Extensiones MakeCode con IA

## 1. Objetivo

Desarrollar una plataforma web que permita a usuarios generar extensiones de MakeCode Arcade mediante lenguaje natural, automatizando:

- Interpretación de intención
- Generación de código válido (PXT)
- Validación
- Creación automática de repositorios en GitHub
- Entrega lista para importación en MakeCode

## 2. Arquitectura General

Usuario → Frontend (Chat UI) → Backend API → Pipeline IA → GitHub API → Repo → Usuario

## 3. Stack Tecnológico

Frontend:
- Astro
- Tailwind
- TypeScript

Backend:
- Node.js
- Express/Fastify

IA:
- OpenAI API

Infraestructura:
- Vercel / Cloudflare
- GitHub API

## 4. Pipeline

1. Prompt → DSL
2. DSL → Código
3. Validación
4. Corrección
5. Publicación en GitHub

## 5. Archivos generados

- pxt.json
- main.ts
- README.md

## 6. Seguridad

- Token backend
- Validación inputs
- Rate limiting

## 7. Roadmap

Fase 1:
- Generación básica
- Repo automático

Fase 2:
- Validación avanzada

Fase 3:
- Marketplace
