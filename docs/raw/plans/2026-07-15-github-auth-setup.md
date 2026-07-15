# Plan: Configurar GitHub OAuth en Supabase Auth

## 1. Objetivo
Configurar autenticación con GitHub OAuth en Supabase para que cada usuario pueda:
1. Autenticarse con su cuenta de GitHub
2. Autorizar a Extension Builder a crear repositorios en su nombre
3. Publicar extensiones generadas directamente en su propia cuenta de GitHub

Esto reemplaza el token central `GITHUB_TOKEN` del MVP por un **token por usuario** obtenido vía OAuth.

## 2. Contexto actual
- El pipeline prompt→DSL→código funciona (translate, generate, validate probados)
- El paso publish usa un `GITHUB_TOKEN` central (fine-grained PAT sin permisos de creación de repo)
- La Edge Function `publish/index.ts` (v4) usa el token central directamente
- El frontend `ChatBox.astro` llama a publish sin enviar autenticación
- `supabase/config.toml` tiene `[auth.external.github]` con `enabled = true` pero `client_id = ""` y `secret = ""`
- No hay `@supabase/supabase-js` instalado en el frontend

## 3. Problema a resolver
- El token central de GitHub no tiene permisos para crear repositorios públicos
- La solución ideal es que **cada usuario use su propio token** vía OAuth
- Esto además escala: no hay límite de creación de repos, cada repo es del usuario

## 4. Resultado esperado
- Usuario cliquea "Login with GitHub" en el frontend
- Supabase Auth maneja el flujo OAuth completo
- El frontend almacena la sesión y envía el token de Supabase en llamadas a Edge Functions
- La Edge Function `publish` extrae el token de GitHub de la identidad del usuario y crea el repo
- El pipeline completo funciona end-to-end con autenticación real

## 5. Restricciones
- Frontend es Astro **static output** (no SSR). El manejo de sesión es 100% client-side.
- Edge Functions corren en Deno (no Node.js). Usar `@supabase/supabase-js` desde JSR.
- El callback de GitHub OAuth debe apuntar a Supabase (`/auth/v1/callback`).
- GitHub OAuth App requiere Authorization callback URL exacta.

## 6. Suposiciones
- El usuario creará la GitHub OAuth App manualmente en GitHub Developer Settings
- El usuario nos proporcionará Client ID y Client Secret
- Supabase Dashboard permite configurar proveedores OAuth sin Management API
- La sesión de Supabase se persiste en localStorage por defecto

## 7. Arquitectura de la solución

```
[GitHub] ←→ [Supabase Auth] ←→ [Frontend Astro (static)]
                ↑                        ↑
        Edge Functions            @supabase/supabase-js
        (extraen token            (manejan sesión)
         de la identidad)

Flujo de auth:
1. Frontend: signInWithOAuth({ provider: "github" })
2. Usuario redirigido a GitHub → autoriza → redirigido a Supabase callback
3. Supabase crea sesión → redirige al frontend con tokens en URL hash
4. Frontend: supabase.auth.onAuthStateChange → guarda sesión
5. Frontend envía access_token en header Authorization a Edge Functions
6. Edge Function: crea Supabase client → getUserIdentities() → extrae token GitHub
7. Edge Function: usa token GitHub para crear repo + commit archivos
```

```
Flujo de publicación:
Frontend → POST /functions/v1/publish
  Header: Authorization: Bearer <supabase_access_token>
  Body: { files: [...] }
    
  → Edge Function crea Supabase client
  → Obtiene identidad de GitHub del usuario
  → Extrae access_token de GitHub
  → Crea repo + commit files via GitHub API
  → Devuelve { repoUrl }
```

## 8. Cambios por archivo

### `frontend/package.json`
- Agregar dependencia: `@supabase/supabase-js`

### `frontend/src/components/ChatBox.astro`
**Zona de template (HTML):**
- Agregar botón "Login with GitHub" en el header (reemplazar "No autenticado")
- Mostrar avatar + nombre de usuario cuando autenticado

**Zona de script (JS):**
- Importar `createClient` de `@supabase/supabase-js`
- Crear `supabase` client con `supabaseUrl` y `supabaseAnonKey`
- Implementar `signInWithGithub()`:
  ```js
  await supabase.auth.signInWithOAuth({ provider: "github" })
  ```
- Escuchar `onAuthStateChange` para detectar login/logout
- Extraer session del hash de URL si viene del callback
- Al llamar a publish, incluir `Authorization: Bearer <access_token>` en headers
- Enviar el token también en translate/generate/validate (opcional, pero consistente)

**Manejo de callback:**
- Supabase redirige a la URL del frontend con `#access_token=...` en el hash
- `@supabase/supabase-js` automáticamente detecta y procesa el hash
- Usar `getSession()` para recuperar la sesión actual

### `supabase/functions/publish/index.ts`
- Actualizar para extraer token de GitHub de la sesión de Supabase
- Eliminar dependencia de `Deno.env.get("GITHUB_TOKEN")`
- Agregar import de Supabase client desde JSR:
  ```ts
  import { createClient } from "jsr:@supabase/supabase-js@2";
  ```
- Obtener token de GitHub:
  ```ts
  const authHeader = req.headers.get("Authorization");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const { data: { identities } } = await supabase.auth.getUserIdentities();
  const githubIdentity = identities?.find(i => i.provider === "github");
  const githubToken = githubIdentity?.identity_data?.access_token;
  ```

### `supabase/config.toml`
- Actualizar `client_id` y `secret` con los valores reales (después de creada la GitHub App)

### `docs/raw/plans/(...).md`
- Este archivo

## 9. Componentes a crear/modificar

| Componente | Archivo | Cambio |
|------------|---------|--------|
| ChatBox.astro (template) | `frontend/src/components/ChatBox.astro` | Login button + user info |
| ChatBox.astro (script) | `frontend/src/components/ChatBox.astro` | Auth flow + session management |
| publish/index.ts | `supabase/functions/publish/index.ts` | Extraer token GitHub de sesión Supabase |
| config.toml | `supabase/config.toml` | Configurar GitHub OAuth credentials |

## 10. Estados de UI

### Login button
| Estado | Visual |
|--------|--------|
| No autenticado | Botón "Login with GitHub" con ícono de GitHub |
| Autenticando | Botón deshabilitado + spinner |
| Autenticado | Avatar + username + botón "Cerrar sesión" |
| Error | Mensaje de error en rojo |

### Pipeline publish step
| Estado | Comportamiento |
|--------|----------------|
| No autenticado | Mostrar "Iniciá sesión con GitHub para publicar" |
| Autenticado | Ejecutar publish normalmente |
| Token expirado | Mostrar "Sesión expirada, iniciá sesión nuevamente" |

## 11. Estrategia responsive
- Login button se adapta a mobile (full width en pantallas chicas)
- Avatar + username se mantiene legible en mobile
- Header con auth status es compacto

## 12. Estrategia de accesibilidad
- Botón de login tiene texto descriptivo
- Estados de carga tienen `aria-label`
- Errores de autenticación se anuncian con `role="alert"`
- El flujo OAuth no requiere interacción compleja

## 13. Estrategia de diseño visual
- Botón "Login with GitHub": fondo oscuro/gris, ícono de GitHub, hover state
- Avatar: circular, 28px, con borde
- Username: texto gris claro, monoespaciado
- Consistente con el dark industrial theme actual

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| `@supabase/supabase-js` no funciona en Astro static build | Se importa solo en script del lado cliente, no en SSR. Usar CDN como fallback. |
| El hash de URL con tokens no se procesa automáticamente | Verificar con `supabase.auth.getSession()` en cada carga |
| Token de GitHub expira (OAuth tiene expiración) | Supabase maneja refresh automático del session. Verificar lifetime del token GitHub (default 2h para GitHub OAuth). |
| `getUserIdentities()` no devuelve `access_token` | Verificar que el scope de GitHub OAuth incluya `repo` o `public_repo`. Si no viene, pedir re-autenticación con scopes explícitos. |
| JSR import falla en Edge Function | Usar import de `jsr:` en lugar de `npm:`. Verificar que Deno runtime soporte JSR. |
| Edge Function timeout por llamada a Supabase Auth | La llamada a `getUser()` + `getUserIdentities()` es rápida (< 100ms). Sin riesgo. |

## 15. Orden de implementación
1. Guiar al usuario en creación de GitHub OAuth App
2. Recibir Client ID + Secret del usuario
3. Configurar GitHub OAuth en Supabase (Management API o Dashboard)
4. **NO TOCAR CÓDIGO HASTA TENER CREDENCIALES**
5. Instalar `@supabase/supabase-js` en frontend
6. Implementar auth flow en ChatBox.astro (login + session + logout)
7. Actualizar publish Edge Function para usar token de usuario
8. Probar flujo completo: login → generar → publicar
9. Actualizar wiki con configuración de auth

## 16. Validación en navegador (chrome-devtools)
- [ ] Verificar que botón "Login with GitHub" redirige a GitHub OAuth
- [ ] Verificar que después de autorizar, vuelve al frontend con sesión activa
- [ ] Verificar que `localStorage` contiene `supabase.auth.token`
- [ ] Verificar que el header `Authorization` se envía en llamadas a Edge Functions
- [ ] Verificar que publish crea repo en la cuenta del usuario autenticado
- [ ] Verificar logout limpia sesión y vuelve a estado no autenticado
- [ ] Verificar responsive en 375px y 1280px

## 17. Criterios de aceptación
- [ ] Usuario puede iniciar sesión con GitHub desde el frontend
- [ ] Después de login, se muestra avatar y username
- [ ] El pipeline translate → generate → validate funciona autenticado o no
- [ ] El paso publish funciona SOLO si el usuario está autenticado
- [ ] publish crea repo en la cuenta del usuario (no en una cuenta central)
- [ ] El repo contiene los 3 archivos (pxt.json, main.ts, README.md)
- [ ] Sesión persiste al recargar la página
- [ ] Logout limpia sesión correctamente
- [ ] Wiki actualizada con configuración de auth

## 18. Notas técnicas adicionales

### Scopes de GitHub OAuth
Para crear repositorios públicos, la GitHub OAuth App necesita el scope:
- `public_repo` (para repos públicos) o `repo` (para privados)

Estos scopes se solicitan al crear la OAuth App en GitHub Settings.

### Supabase client en Edge Function
```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { global: { headers: { Authorization: authHeader } } }
);

// Obtener usuario
const { data: { user } } = await supabase.auth.getUser();

// Obtener identidades (incluye tokens de proveedores OAuth)
const { data: { identities } } = await supabase.auth.getUserIdentities();

// Identidad de GitHub contiene access_token
const githubToken = identities?.find(i => i.provider === "github")
  ?.identity_data?.access_token;
```

### Supabase client en frontend
```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

// Login
await supabase.auth.signInWithOAuth({ provider: "github" });

// Escuchar cambios de auth
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    // Usuario autenticado
  }
});

// Logout
await supabase.auth.signOut();
```
