// Edge Function: generate
// Takes DSL YAML and generates complete PXT extension files

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiResponse {
  content: string;
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
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: data.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const { dsl } = await req.json();
    if (!dsl || typeof dsl !== "string") {
      return new Response(JSON.stringify({ error: "Missing required field: dsl (YAML string)" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const nameLine = dsl.split("\n").find((l: string) => l.trim().startsWith("name:"));
    const extName = nameLine?.split(":")[1]?.trim() || "Extension";

    // Step 1: pxt.json
    const pxtResult = await callGemini(
      "You output ONLY valid JSON. No markdown, no backticks.",
      `Generate pxt.json for MakeCode Arcade extension "${extName}".
Return ONLY a JSON object with: name, version "0.0.1", description, dependencies {"device":"*"}, files ["main.ts","README.md"], targetVersions {"target":"arcade","targetId":"arcade"}.`,
      { temperature: 0.1, max_tokens: 300 }
    );
    const pxtContent = pxtResult.content.trim().replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "").trim();

    // Step 2: main.ts
    const tsResult = await callGemini(
      "You write ONLY TypeScript code for MakeCode Arcade. NO markdown, NO commentary, NO backticks. Start directly with namespace declaration.",
      `Write main.ts for MakeCode Arcade extension "${extName}".
Specs:
${dsl}

RULES:
- namespace "${extName.toLowerCase()}" with //% color icon block attributes
- //% block="..." on all exported functions
- Use ONLY: sprites, controller, game, music, scene, info, Math
- NO async, NO imports, NO DOM, NO fetch
- Create sprites, handle input, implement described mechanics`,
      { temperature: 0.2, max_tokens: 1500 }
    );
    const tsContent = tsResult.content.trim().replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "").trim();

    // Step 3: README.md
    const readmeResult = await callGemini(
      "You write README documentation in Markdown. NO backticks around content. Start with # heading.",
      `Write README.md for MakeCode Arcade extension "${extName}".
Include: description, how to add to project, API reference listing each block function.

Format:
# ${extName}

## Description
...

## API Reference
- blockName(param) — what it does`,
      { temperature: 0.3, max_tokens: 500 }
    );
    const readmeContent = readmeResult.content.trim().replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "").trim();

    const files = [
      { name: "pxt.json", content: pxtContent },
      { name: "main.ts", content: tsContent },
      { name: "README.md", content: readmeContent },
    ];

    return new Response(JSON.stringify({ files, usage: { total: pxtResult.usage.total_tokens + tsResult.usage.total_tokens + readmeResult.usage.total_tokens } }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("generate error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
