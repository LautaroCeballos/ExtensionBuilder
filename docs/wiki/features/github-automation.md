---
title: "Extension Builder — GitHub Automation"
tags: [feature, github]
last_updated: "2026-07-15"
sources:
  - docs/raw/plan-detallado.md
---

# Extension Builder — GitHub Automation

Creación automática de repositorios GitHub para las extensiones generadas.
Cada repositorio se crea bajo la **cuenta del usuario autenticado**, no bajo una cuenta centralizada.

## Autenticación

El usuario autentica su GitHub mediante **Supabase Auth con proveedor GitHub OAuth**.
Supabase maneja el flujo OAuth y expone el access token que usamos para llamar a la GitHub API.

Flujo de auth:

```
Usuario → "Login with GitHub" → Supabase Auth → GitHub OAuth → token → Supabase sesión
```

La Edge Function recibe el token de GitHub vía el `Authorization` header de la request
(el frontend envía el token de Supabase, la función lo usa para obtener el token de GitHub del proveedor).

## Flujo de publicación

```
Código generado
  → Edge Function verifica sesión + obtiene token GitHub
  → POST /user/repos (crear repo)
  → PUT /repos/{owner}/{repo}/contents/{path} (commit archivos)
  → Devolver URL html_url
```

## Estructura del repositorio

```
/makecode-ext-{timestamp}
  ├── pxt.json      — manifiesto de la extensión
  ├── main.ts       — código TypeScript con bloques
  └── README.md     — documentación autogenerada
```

## Edge Function (Deno, sin Octokit)

Las Edge Functions corren en Deno, no Node.js. No podemos usar `@octokit/rest`.
Llamamos directo a la REST API de GitHub con `fetch()`:

```ts
// Edge Function: create-extension-repo
import { createClient } from "jsr:@supabase/supabase-js@2";

interface FileSpec {
  name: string;
  content: string;
}

async function createRepo(
  githubToken: string,
  files: FileSpec[]
): Promise<string> {
  // 1. Crear repo
  const repoName = `makecode-ext-${Date.now()}`;

  const repoRes = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      "User-Agent": "extension-builder",
    },
    body: JSON.stringify({ name: repoName, private: false }),
  });

  if (!repoRes.ok) {
    const err = await repoRes.json();
    throw new Error(`GitHub create repo failed: ${err.message}`);
  }

  const repo = await repoRes.json();
  const owner = repo.owner.login;

  // 2. Commit archivos
  for (const file of files) {
    const content = btoa(file.content); // Deno global

    const fileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/contents/${file.name}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          "User-Agent": "extension-builder",
        },
        body: JSON.stringify({
          message: "initial commit",
          content,
        }),
      }
    );

    if (!fileRes.ok) {
      const err = await fileRes.json();
      throw new Error(`GitHub file commit failed: ${err.message}`);
    }
  }

  return repo.html_url;
}

// Handler de la Edge Function
Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  // Crear cliente Supabase con el token de la request
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Obtener token de GitHub del provider
  const { data: { identities } } = await supabase.auth.getUserIdentities();
  const githubIdentity = identities?.find(i => i.provider === "github");
  const githubToken = githubIdentity?.identity_data?.access_token;

  if (!githubToken) {
    return new Response("GitHub token not found", { status: 401 });
  }

  const { files } = await req.json();
  const url = await createRepo(githubToken, files);

  return new Response(JSON.stringify({ repoUrl: url }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

## Formato esperado de `files`

```ts
[
  { name: "pxt.json", content: "..." },
  { name: "main.ts", content: "..." },
  { name: "README.md", content: "..." }
]
```

## Integración con MakeCode

El usuario final:
1. Abre MakeCode Arcade
2. Importa extensión desde la URL de GitHub
3. Usa los bloques generados en sus proyectos
