// Shared Gemini client for Edge Functions (Deno)
// Uses the REST API directly via fetch() — no SDK needed

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiMessage {
  role: "user" | "model";
  content: string;
}

export interface GeminiResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callGemini(
  systemPrompt: string,
  messages: GeminiMessage[],
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<GeminiResponse> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const model = options?.model ?? "gemini-flash-latest";
  const url = `${GEMINI_BASE_URL}/${model}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: systemPrompt,
      contents: messages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.max_tokens ?? 2000,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} — ${err}`);
  }

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
