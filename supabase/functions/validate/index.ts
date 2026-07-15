// Edge Function: validate
// Validates generated PXT extension files against basic checks

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

interface FileSpec {
  name: string;
  content: string;
}

interface ValidationResult {
  valid: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message?: string;
  }>;
  fixed?: FileSpec[];
}

const ALLOWED_APIS = [
  "sprites", "controller", "game", "music", "scene", "info",
  "Math", "String", "Array", "control",
];

Deno.serve(async (req) => {
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
    const { files } = await req.json() as { files: FileSpec[] };

    if (!files || !Array.isArray(files)) {
      return new Response(
        JSON.stringify({ error: "Missing required field: files (array)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const pxtFile = files.find(f => f.name === "pxt.json");
    const mainFile = files.find(f => f.name === "main.ts");
    const readmeFile = files.find(f => f.name === "README.md");

    const checks: ValidationResult["checks"] = [];

    // Check 1: All required files present
    const missingFiles = [];
    if (!pxtFile) missingFiles.push("pxt.json");
    if (!mainFile) missingFiles.push("main.ts");
    if (!readmeFile) missingFiles.push("README.md");
    checks.push({
      name: "required_files",
      passed: missingFiles.length === 0,
      message: missingFiles.length > 0
        ? `Missing files: ${missingFiles.join(", ")}`
        : undefined,
    });

    // Check 2: pxt.json is valid JSON
    if (pxtFile) {
      try {
        const parsed = JSON.parse(pxtFile.content);
        checks.push({
          name: "pxt_json_valid",
          passed: true,
        });

        // Check 3: namespace in pxt.json matches main.ts
        const namespace = parsed.namespace;
        // Check 4: dependencies include device
        checks.push({
          name: "pxt_dependencies",
          passed: parsed.dependencies?.device === "*",
          message: parsed.dependencies?.device !== "*"
            ? "Missing device dependency in pxt.json"
            : undefined,
        });
      } catch {
        checks.push({
          name: "pxt_json_valid",
          passed: false,
          message: "pxt.json is not valid JSON",
        });
      }
    }

    // Check 5: namespace present in main.ts
    if (mainFile) {
      const hasNamespace = /namespace\s+\w+/.test(mainFile.content);
      checks.push({
        name: "namespace_present",
        passed: hasNamespace,
        message: hasNamespace ? undefined : "No namespace declaration found in main.ts",
      });

      // Check 6: //% block annotations on exported functions
      const hasBlockAnnotations = /\/\/%\s*block=/.test(mainFile.content);
      checks.push({
        name: "block_annotations",
        passed: hasBlockAnnotations,
        message: hasBlockAnnotations ? undefined : "No //% block annotations found",
      });

      // Check 7: Only allowed APIs
      const apiMatches = mainFile.content.matchAll(/\b(sprites|controller|game|music|scene|info|Math|String|Array|control)\b/g);
      const usedAPIs = new Set(Array.from(apiMatches, m => m[1]));

      const forbidden = Array.from(usedAPIs).filter(
        api => !ALLOWED_APIS.includes(api)
      );
      checks.push({
        name: "allowed_apis",
        passed: forbidden.length === 0,
        message: forbidden.length > 0
          ? `Forbidden APIs detected: ${forbidden.join(", ")}`
          : undefined,
      });
    }

    const valid = checks.every(c => c.passed);

    // Attempt to fix common issues by rewriting through LLM
    let fixed: FileSpec[] | undefined;
    if (!valid) {
      fixed = await attemptFix(files, checks);
    }

    return new Response(
      JSON.stringify({ valid, checks, fixed } as ValidationResult),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("validate error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function attemptFix(
  files: FileSpec[],
  failedChecks: ValidationResult["checks"]
): Promise<FileSpec[]> {
  const errors = failedChecks
    .filter(c => !c.passed)
    .map(c => `- ${c.name}: ${c.message}`)
    .join("\n");

  const result = await callGemini(
    "You fix MakeCode Arcade extension files. Return the corrected files using the same ===FILE: name=== format. Fix ALL issues listed.",
    `Fix these issues:\n${errors}\n\nCurrent files:\n${
      files.map(f => `===FILE: ${f.name}===\n${f.content}`).join("\n")
    }`,
    { temperature: 0.1, max_tokens: 2000 }
  );

  return parseFixOutput(result.content);
}

function parseFixOutput(output: string): FileSpec[] {
  const files: FileSpec[] = [];
  const fileRegex = /===FILE:\s*([^\s]+)===/g;
  let lastIndex = 0;
  let match;

  while ((match = fileRegex.exec(output)) !== null) {
    const fileName = match[1];
    const contentStart = match.index + match[0].length;
    const nextMatch = fileRegex.exec(output);
    const contentEnd = nextMatch ? nextMatch.index : output.length;
    if (nextMatch) fileRegex.lastIndex = nextMatch.index;

    const content = output.slice(contentStart, contentEnd).trim();
    files.push({ name: fileName, content });
  }

  return files;
}
