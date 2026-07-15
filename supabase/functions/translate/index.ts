// Edge Function: translate
// Converts a user's natural language prompt into a structured DSL YAML

// Inline Gemini client (no shared import to avoid bundling issues)
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiResponse {
  content: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; max_tokens?: number }
): Promise<GeminiResponse> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const model = "gemini-3.1-flash-lite";
  const res = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { temperature: options?.temperature ?? 0.3, maxOutputTokens: options?.max_tokens ?? 2000 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status} — ${await res.text()}`);
  const data = await res.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    model: data.modelVersion ?? model,
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: data.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}

const SYSTEM_PROMPT = `You are a DSL (Domain Specific Language) generator for MakeCode Arcade extensions.
Your ONLY task is to convert user requests into structured YAML DSL.

RULES:
- Output ONLY valid YAML — no explanations, no markdown wrappers
- Use ONLY the feature types and fields defined below
- Infer reasonable defaults for missing values
- Keep it minimal: only include what the user asked for
- Never invent features or fields not in the schema

AVAILABLE FEATURE TYPES AND THEIR SCHEMA:

1. shooting:
   type: shooting
   projectile: { speed: number, direction: "up"|"down"|"left"|"right"|"player_aim", sprite?: string, destroy_on_hit?: boolean }
   input: { button: "A"|"B"|"up"|"down"|"left"|"right" }
   cooldown?: { ms: number }
   sound?: { enabled: boolean, effect?: "laser"|"explosion"|"jump"|"coin"|"power_up" }

2. enemy_spawner:
   type: enemy_spawner
   enemy: { kind: string, speed: number, behavior: "chase"|"patrol"|"random"|"stationary", sprite?: string, health?: number }
   spawn: { interval_ms: number, position: "top"|"bottom"|"left"|"right"|"random_edge", max_on_screen: number }
   score?: { on_kill: number }
   sound?: { on_spawn?: string, on_destroy?: string }

3. movement:
   type: movement
   target: string
   pattern?: { type: "patrol"|"chase"|"sine"|"circle"|"follow_path", speed: number, bounds?: [number, number, number, number] }

4. collision:
   type: collision
   sprite_a: string, sprite_b: string
   action: array of { destroy_both: true } | { damage: number } | { sound: string } | { score: number }

5. health_system:
   type: health_system
   target: string, max_hp: number, on_zero: "game_over"|"respawn"|"nothing"
   hud?: boolean, invincibility_ms?: number

6. score_system:
   type: score_system
   hud?: boolean, on_death_reset?: boolean

7. timer:
   type: timer
   seconds: number, on_end: "game_over"|"win"|"nothing"
   hud?: boolean, sound_last_10?: boolean

8. powerup:
   type: powerup
   kind: "speed_boost"|"rapid_fire"|"shield"|"extra_life"|"spread_shot"
   duration_ms: number, spawn_interval_ms: number
   sprite?: string, sound?: string

9. tilemap:
   type: tilemap
   tile_set: string, wall_tiles: number[], player_start: [number, number]
   enemies?: [number, number][]

10. custom:
    type: custom
    description: string
    code?: string

EXAMPLE OUTPUT:
extension:
  name: ShootingDemo
  description: Adds shooting mechanics
  color: "#0fbc11"
  icon: "⚽"

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
      health: 2
    spawn:
      interval_ms: 2000
      position: top
      max_on_screen: 3
    score:
      on_kill: 10`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await callGemini(SYSTEM_PROMPT, prompt);

    // Parse the YAML content from the response
    let dslYaml = result.content.trim();

    // Remove markdown code fences if present
    dslYaml = dslYaml.replace(/^```(yaml)?\n?/gm, "").replace(/```$/gm, "").trim();

    return new Response(
      JSON.stringify({
        dsl: dslYaml,
        usage: result.usage,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("translate error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
