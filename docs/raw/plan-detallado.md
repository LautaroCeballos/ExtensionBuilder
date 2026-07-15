# Generador de Extensiones MakeCode Arcade con IA

## Arquitectura + Prompt Engineering + GitHub Automation

---

# 1. Objetivo

Construir un sistema que permita:

* Generar extensiones válidas de MakeCode Arcade desde lenguaje natural
* Validarlas automáticamente
* Crear repositorios GitHub automáticamente
* Entregar un flujo usable para usuarios finales

---

# 2. Arquitectura General

```
Usuario
  ↓
Chat IA (Frontend)
  ↓
Transformación a DSL
  ↓
Generador de código (LLM)
  ↓
Validador
  ↓
Creación automática de repo GitHub
  ↓
Entrega de URL de extensión
```

---

# 3. Pipeline Completo

## 3.1 Flujo

1. Usuario escribe:

   > "quiero disparar con botón A, con cooldown y sonido"

2. Sistema:

   * Convierte a DSL
   * Genera código
   * Valida
   * Crea repo GitHub
   * Devuelve link usable

---

# 4. Prompt Engineering

---

## 4.1 System Prompt (Base)

```
You are an expert in Microsoft MakeCode Arcade (PXT).
Your task is to generate VALID and COMPLETE MakeCode extensions.

Strict rules:
- Output ONLY valid files for a MakeCode extension.
- Always generate:
  1) pxt.json
  2) main.ts
  3) README.md
- Use ONLY MakeCode Arcade APIs (sprites, controller, game, music, scene).
- DO NOT invent APIs.
- All exported functions MUST include block annotations using //% syntax.
- Code must compile in PXT without errors.

Block rules:
- Use //% block="text"
- Use //% weight=number
- Use //% blockGap=8
- Use //% group="GroupName"

TypeScript rules:
- No external imports
- No DOM APIs
- No async/await

Output format (STRICT):
===FILE: pxt.json===
<json>
===FILE: main.ts===
<code>
===FILE: README.md===
<markdown>
```

---

## 4.2 Transformación a DSL

### Prompt:

```
Convert the following request into a structured DSL.

Rules:
- Only include valid Arcade features
- Normalize values
- Keep it minimal

User request:
{input}
```

### Ejemplo DSL:

```
FEATURE: shooting_system
PROJECTILE:
  speed: 50
  direction: up
INPUT:
  button: A
COOLDOWN:
  ms: 500
SOUND:
  enabled: true
```

---

## 4.3 Generación desde DSL

```
Generate a MakeCode Arcade extension from this DSL.

Requirements:
- Use valid PXT structure
- Create reusable functions
- Add block annotations

DSL:
{dsl}
```

---

## 4.4 Validación

```
Validate this MakeCode extension.

Checklist:
- JSON válido
- namespace presente
- funciones exportadas con //% block
- APIs válidas

If errors:
- FIX and return full files
```

---

# 5. Templates Base

---

## 5.1 pxt.json

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

---

## 5.2 main.ts

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

---

# 6. Validación Automática (Backend)

## Checks mínimos:

* JSON.parse(pxt.json)
* Regex para `namespace`
* Regex para `//% block`
* Lista blanca de APIs permitidas
* Compilación simulada (opcional)

---

# 7. Creación Automática de Repos GitHub

---

## 7.1 Requisitos

* GitHub Personal Access Token (PAT)
* Permisos:
  * repo
  * workflow (opcional)

---

## 7.2 Flujo

```
Código generado
   ↓
Crear repo
   ↓
Commit archivos
   ↓
Push
   ↓
Devolver URL
```

---

## 7.3 Estructura del Repo

```
/auto-extension
  ├── pxt.json
  ├── main.ts
  └── README.md
```

---

## 7.4 Endpoint Backend (Node.js)

### Dependencias:

```
npm install @octokit/rest
```

---

## 7.5 Código Base

```js
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

export async function createExtensionRepo(files) {
  const repoName = "makecode-ext-" + Date.now();

  // 1. Crear repo
  const { data: repo } = await octokit.repos.createForAuthenticatedUser({
    name: repoName,
    private: false
  });

  const owner = repo.owner.login;

  // 2. Crear archivos
  for (const file of files) {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: file.name,
      message: "initial commit",
      content: Buffer.from(file.content).toString("base64")
    });
  }

  return repo.html_url;
}
```

---

## 7.6 Formato esperado de `files`

```js
[
  { name: "pxt.json", content: "..." },
  { name: "main.ts", content: "..." },
  { name: "README.md", content: "..." }
]
```

---

# 8. Integración con MakeCode

Usuario final:

1. Abre MakeCode Arcade
2. Importa extensión desde GitHub URL
3. Usa bloques generados

---

# 9. Problemas Reales

## 9.1 Calidad del código

* El LLM falla sin estructura → usar DSL

## 9.2 UX

* GitHub login puede frenar adopción

## 9.3 Moderación

* Usuarios pueden generar basura

---

# 10. Mejora Estratégica

No quedarse en generación.

Agregar:

* Marketplace de extensiones
* Sistema de rating
* Fork/remix
* Templates educativos

---

# 11. MVP Realista

Semana 1:

* Chat básico
* DSL
* Generación simple

Semana 2:

* Validación
* GitHub automation

Semana 3:

* UI + flujo completo

Semana 4:

* catálogo + guardado

---

# 12. Siguiente Nivel

* Generación de juegos completos
* Editor visual híbrido (bloques + IA)
* Integración con tu plataforma de juegos

---

# 13. Evaluación Final

La dificultad no está en generar código.

Está en:

* consistencia
* validación
* distribución

Sin esos tres, el sistema no escala.
